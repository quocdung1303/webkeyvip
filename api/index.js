const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage
const users = [];
const orders = [];

// Helper function to generate random ID
function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

// Helper function to create key using Python script
async function createKey(hours, description) {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, '..', 'keymanager.py');
    const process = spawn('python3', [pythonScript, 'create', hours.toString(), description]);
    
    let output = '';
    let error = '';

    process.stdout.on('data', (data) => {
      output += data.toString();
    });

    process.stderr.on('data', (data) => {
      error += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        // Parse output to extract key
        const lines = output.trim().split('\n');
        const keyLine = lines.find(line => line.includes('Key:'));
        if (keyLine) {
          const key = keyLine.split('Key:')[1].trim();
          resolve({ success: true, key });
        } else {
          resolve({ success: false, error: 'Could not extract key from output' });
        }
      } else {
        resolve({ success: false, error: error || 'Failed to create key' });
      }
    });

    process.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
  });
}

// Auth Routes
app.post('/api/auth/register', (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const user = {
      id: generateId(),
      email,
      password, // In production, hash this!
      name: name || email.split('@')[0],
      role: email === 'admin@arestool.com' ? 'admin' : 'user',
      createdAt: new Date().toISOString()
    };

    users.push(user);

    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;

    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Order Routes
app.post('/api/orders', (req, res) => {
  try {
    const { packageId, amount, email } = req.body;

    const order = {
      id: generateId(),
      packageId,
      amount,
      email,
      status: 'pending',
      createdAt: new Date().toISOString(),
      key: null,
      paidAt: null
    };

    orders.push(order);
    res.json({ order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/orders', (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const userOrders = orders.filter(o => o.email === email);
    res.json({ orders: userOrders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/orders/:id', (req, res) => {
  try {
    const { id } = req.params;
    const order = orders.find(o => o.id === id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin Routes
app.get('/api/admin/orders', (req, res) => {
  try {
    res.json({ orders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/users', (req, res) => {
  try {
    const usersWithoutPasswords = users.map(({ password, ...user }) => user);
    res.json({ users: usersWithoutPasswords });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/stats', (req, res) => {
  try {
    const stats = {
      totalUsers: users.length,
      totalOrders: orders.length,
      pendingOrders: orders.filter(o => o.status === 'pending').length,
      completedOrders: orders.filter(o => o.status === 'completed').length,
      totalRevenue: orders
        .filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + o.amount, 0)
    };
    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SePay Webhook Handler
app.post('/api/webhook/sepay', async (req, res) => {
  try {
    console.log('🔔 SePay webhook received:', JSON.stringify(req.body, null, 2));
    
    const {
      gateway,
      transactionDate,
      accountNumber,
      transferType,
      transferAmount,
      content,
      referenceCode,
      description
    } = req.body;

    // BƯỚC 1: Kiểm tra giao dịch TIỀN VÀO
    if (transferType !== 'in') {
      console.log('⚠️ Not incoming transaction, skip');
      return res.json({ success: true, message: 'Not incoming transaction' });
    }

    // BƯỚC 2: Kiểm tra STK đúng không
    if (accountNumber !== '102881164268') {
      console.log('❌ Wrong account number:', accountNumber);
      return res.json({ success: false, message: 'Wrong account number' });
    }

    // BƯỚC 3: Tách ORDER ID từ nội dung chuyển khoản
    // Format: "ARESTOOL ORDER123456" hoặc "ORDER123456" hoặc "DH123456"
    const orderIdRegex = /(?:ARESTOOL\s+)?(?:ORDER|DH)?(\w{10,})/i;
    const match = content.match(orderIdRegex);
    
    if (!match || !match[1]) {
      console.log('❌ Cannot extract order ID from content:', content);
      return res.json({ success: false, message: 'Invalid payment content format' });
    }

    const orderId = match[1];
    console.log('📦 Extracted Order ID:', orderId);

    // BƯỚC 4: Tìm order trong database
    const order = orders.find(o => 
      o.id === orderId && 
      o.amount === transferAmount && 
      o.status === 'pending'
    );
    
    if (!order) {
      console.log('❌ Order not found or already paid:', {
        orderId,
        amount: transferAmount,
        availableOrders: orders.filter(o => o.id === orderId)
      });
      return res.json({ success: false, message: 'Order not found or already paid' });
    }

    console.log('✅ Order found:', order);

    // BƯỚC 5: Tạo key tự động
    const packageDurations = {
      'test': 3,
      '1day': 24,
      '7day': 168,
      '30day': 720
    };

    const duration = packageDurations[order.packageId] || 24;
    console.log('🔑 Creating key with duration:', duration, 'hours');

    const keyResult = await createKey(duration, `Order ${orderId} - ${order.email}`);
    
    if (!keyResult.success) {
      console.log('❌ Failed to create key:', keyResult.error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to create key: ' + keyResult.error 
      });
    }

    // BƯỚC 6: Cập nhật order status
    order.status = 'completed';
    order.key = keyResult.key;
    order.paidAt = new Date().toISOString();
    order.transactionInfo = {
      gateway,
      transactionDate,
      referenceCode,
      amount: transferAmount
    };

    console.log('✅✅✅ Payment confirmed! Key created:', keyResult.key);

    // BƯỚC 7: Trả về success cho SePay
    res.json({ 
      success: true, 
      message: 'Payment confirmed and key created',
      orderId: orderId,
      key: keyResult.key
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
