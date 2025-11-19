import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const app = express();

app.use(cors());
app.use(express.json());

// In-memory storage (thay PostgreSQL cho đơn giản)
const users = [];
const orders = [];
const keys = [];

// Pricing
const PACKAGES = {
  '1day': { price: 5000, hours: 24, name: '1 Ngày' },
  '3days': { price: 10000, hours: 72, name: '3 Ngày' },
  '7days': { price: 20000, hours: 168, name: '7 Ngày' },
  '30days': { price: 50000, hours: 720, name: '30 Ngày' },
  '90days': { price: 120000, hours: 2160, name: '3 Tháng' },
  '180days': { price: 200000, hours: 4320, name: '6 Tháng' },
  '365days': { price: 350000, hours: 8760, name: '1 Năm' }
};

// Helper: Generate Order ID
function generateOrderId() {
  return 'ORDER' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
}

// Helper: Create key from GitHub Gist
async function createKeyFromGist(hours, note) {
  try {
    const { stdout } = await execAsync(
      `python3 keymanager.py create ${hours} "${note}"`
    );
    return stdout.trim();
  } catch (error) {
    console.error('Error creating key:', error);
    return null;
  }
}

// API: Register
app.post('/api/auth/register', (req, res) => {
  const { email, password } = req.body;
  
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'Email đã tồn tại' });
  }
  
  const user = {
    id: users.length + 1,
    email,
    password, // In production: use bcrypt
    role: email === process.env.ADMIN_EMAIL ? 'admin' : 'user',
    createdAt: new Date()
  };
  
  users.push(user);
  res.json({ success: true, user: { id: user.id, email: user.email, role: user.role } });
});

// API: Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  
  if (!user) {
    return res.status(401).json({ error: 'Sai email hoặc mật khẩu' });
  }
  
  res.json({ success: true, user: { id: user.id, email: user.email, role: user.role } });
});

// API: Create Order
app.post('/api/orders/create', (req, res) => {
  const { userId, packageId } = req.body;
  const pkg = PACKAGES[packageId];
  
  if (!pkg) {
    return res.status(400).json({ error: 'Gói không hợp lệ' });
  }
  
  const orderId = generateOrderId();
  const order = {
    id: orders.length + 1,
    orderId,
    userId,
    packageId,
    amount: pkg.price,
    status: 'pending',
    createdAt: new Date()
  };
  
  orders.push(order);
  
  res.json({
    success: true,
    order: {
      orderId,
      amount: pkg.price,
      packageName: pkg.name,
      qrData: {
        accountNo: process.env.STK_VIETINBANK,
        accountName: 'NGUYEN QUOC DUNG',
        amount: pkg.price,
        description: orderId,
        bank: 'VietinBank'
      }
    }
  });
});

// API: Webhook from SePay
app.post('/api/webhook/sepay', async (req, res) => {
  const transaction = req.body;
  
  // Verify transaction
  if (transaction.transferType !== 'in') {
    return res.status(200).send('OK');
  }
  
  // Extract order ID from transaction content
  const orderId = transaction.content.match(/ORDER[A-Z0-9]+/)?.[0];
  if (!orderId) {
    return res.status(200).send('OK');
  }
  
  // Find order
  const order = orders.find(o => o.orderId === orderId && o.status === 'pending');
  if (!order) {
    return res.status(200).send('OK');
  }
  
  // Check amount
  const pkg = PACKAGES[order.packageId];
  if (transaction.transferAmount < pkg.price) {
    return res.status(200).send('OK');
  }
  
  // Create key from Gist
  const keyValue = await createKeyFromGist(pkg.hours, pkg.name);
  if (!keyValue) {
    return res.status(500).json({ error: 'Không thể tạo key' });
  }
  
  // Save key
  const key = {
    id: keys.length + 1,
    userId: order.userId,
    orderId: order.orderId,
    key: keyValue,
    packageName: pkg.name,
    expiresAt: new Date(Date.now() + pkg.hours * 60 * 60 * 1000),
    createdAt: new Date()
  };
  
  keys.push(key);
  
  // Update order status
  order.status = 'completed';
  order.completedAt = new Date();
  
  res.status(200).send('OK');
});

// API: Get user keys
app.get('/api/keys/:userId', (req, res) => {
  const userKeys = keys.filter(k => k.userId == req.params.userId);
  res.json({ keys: userKeys });
});

// API: Admin - Get all orders
app.get('/api/admin/orders', (req, res) => {
  res.json({ orders });
});

// API: Admin - Get all users
app.get('/api/admin/users', (req, res) => {
  res.json({ users: users.map(u => ({ id: u.id, email: u.email, role: u.role, createdAt: u.createdAt })) });
});

// API: Admin - Get all keys
app.get('/api/admin/keys', (req, res) => {
  res.json({ keys });
});

export default app;
