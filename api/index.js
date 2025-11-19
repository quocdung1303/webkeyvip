const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

app.use(cors());
app.use(express.json());

// In-memory storage
const orders = [];

// GitHub Gist Config
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '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';
const GIST_ID = '2ad2730ba358ac7593fc1376303cb9c7';

// VietinBank Info
const BANK_ACCOUNT = '102881164268';
const BANK_NAME = 'VietinBank';

// Generate Order ID
function generateOrderId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 6).toUpperCase();
}

// Generate Random Key
function generateKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = '';
  for (let i = 0; i < 16; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

// Create Key in GitHub Gist
async function createKeyInGist(hours, description) {
  try {
    const key = generateKey();
    const expiry = new Date(Date.now() + hours * 60 * 60 * 1000);
    const expiryStr = expiry.toISOString().replace('T', ' ').substring(0, 19);

    const response = await axios.get(`https://api.github.com/gists/${GIST_ID}`, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    const keysContent = response.data.files['keys.json'].content;
    const keys = JSON.parse(keysContent);

    keys.push({
      key: key,
      expiry: expiryStr,
      description: description,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
    });

    await axios.patch(`https://api.github.com/gists/${GIST_ID}`, {
      files: {
        'keys.json': {
          content: JSON.stringify(keys, null, 2)
        }
      }
    }, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    console.log('✅ Key created:', key);
    return { success: true, key };

  } catch (error) {
    console.error('❌ Error creating key:', error.message);
    return { success: false, error: error.message };
  }
}

// Create Order
app.post('/api/orders', (req, res) => {
  try {
    const { packageId, amount } = req.body;

    const order = {
      id: generateOrderId(),
      packageId,
      amount,
      status: 'pending',
      createdAt: new Date().toISOString(),
      key: null,
      paidAt: null
    };

    orders.push(order);

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        packageId: order.packageId,
        qrUrl: `https://qr.sepay.vn/img?bank=${BANK_NAME}&acc=${BANK_ACCOUNT}&amount=${amount}&des=ARESTOOL%20DH${order.id}&template=compact`
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Check Order Status
app.post('/api/check-status', (req, res) => {
  try {
    const { orderId } = req.body;
    const order = orders.find(o => o.id === orderId);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    res.json({
      success: true,
      status: order.status,
      key: order.key,
      paidAt: order.paidAt
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// SePay Webhook
app.post('/api/webhook/sepay', async (req, res) => {
  try {
    console.log('🔔 SePay webhook:', JSON.stringify(req.body, null, 2));

    const {
      gateway,
      transactionDate,
      accountNumber,
      transferType,
      transferAmount,
      content,
      referenceCode
    } = req.body;

    // Check incoming transaction
    if (transferType !== 'in') {
      return res.json({ success: true, message: 'Not incoming transaction' });
    }

    // Check account number
    if (accountNumber !== BANK_ACCOUNT) {
      return res.json({ success: false, message: 'Wrong account number' });
    }

    // Extract order ID from content
    const orderIdRegex = /(?:ARESTOOL\s+)?DH(\w+)/i;
    const match = content.match(orderIdRegex);

    if (!match || !match[1]) {
      console.log('❌ Cannot extract order ID from:', content);
      return res.json({ success: false, message: 'Invalid payment content' });
    }

    const orderId = match[1];
    console.log('📦 Order ID:', orderId);

    // Find order
    const order = orders.find(o => 
      o.id === orderId && 
      o.amount === transferAmount && 
      o.status === 'pending'
    );

    if (!order) {
      console.log('❌ Order not found or already paid');
      return res.json({ success: false, message: 'Order not found' });
    }

    // Package durations
    const durations = {
      'test': 3,
      '1day': 24,
      '7day': 168,
      '30day': 720
    };

    const hours = durations[order.packageId] || 24;

    // Create key
    const keyResult = await createKeyInGist(hours, `Order ${orderId}`);

    if (!keyResult.success) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to create key' 
      });
    }

    // Update order
    order.status = 'paid';
    order.key = keyResult.key;
    order.paidAt = new Date().toISOString();
    order.transactionInfo = {
      gateway,
      transactionDate,
      referenceCode,
      amount: transferAmount
    };

    console.log('✅ Payment confirmed! Key:', keyResult.key);

    res.json({
      success: true,
      message: 'Payment confirmed',
      orderId: orderId,
      key: keyResult.key
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ success: false, error: error.message });
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
