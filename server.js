const express = require('express');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Logs middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'OK', time: new Date().toISOString() }));

// SMTP
const transporter = nodemailer.createTransport({
  host: 'mail-eu.smtp2go.com',
  port: 2525,
  secure: false,
  auth: {
    user: 'hussein1995',
    pass: 'Aa19955Aa@@'
  },
  tls: { rejectUnauthorized: false }
});

// Test SMTP connection
transporter.verify((error, success) => {
  if (error) console.error('❌ SMTP Error:', error);
  else console.log('✅ SMTP جاهز');
});

const verificationCodes = new Map();

// Rate limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10
});

app.post('/api/request-code', limiter, async (req, res) => {
  console.log('📧 Request code:', req.body);
  
  try {
    const { email } = req.body;
    
    if (!email) {
      console.log('❌ No email');
      return res.status(400).json({ error: 'أدخل بريدك' });
    }
    
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      console.log('❌ Invalid email:', email);
      return res.status(400).json({ error: 'بريد خاطئ' });
    }

    console.log('🔄 إرسال كود لـ', email);
    
    // توليد كود
    const code = crypto.randomInt(100000, 999999).toString();
    verificationCodes.set(email, { 
      code, 
      attempts: 0, 
      expiry: Date.now() + 5*60*1000,
      verified: false 
    });

    // إرسال البريد
    const result = await transporter.sendMail({
      from: '"التحقق" <hussein1995@hussein.my>',
      to: email,
      subject: 'كود التحقق 6 أرقام',
      html: `
        <div style="font-family:Arial;text-align:center;padding:40px">
          <h1 style="font-size:60px;color:#007bff;margin:20px 0">${code}</h1>
          <p>كود تسجيل حسابك - صالح 5 دقائق</p>
        </div>
      `
    });

    console.log('✅ بريد مرسل بنجاح لـ', email, 'MessageID:', result.messageId);
    res.json({ message: '✅ تم إرسال الكود لبريدك!', sent: true });
    
  } catch (error) {
    console.error('💥 خطأ إرسال:', error.message);
    res.status(500).json({ error: 'فشل الإرسال: ' + error.message });
  }
});

app.post('/api/verify-code', (req, res) => {
  console.log('🔍 Verify:', req.body);
  // ... نفس الكود السابق
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server: http://0.0.0.0:${PORT}`);
});
