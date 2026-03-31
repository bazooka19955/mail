const express = require('express');
const nodemailer = require('nodemailer');  // ✅ createTransport مش createTransporter
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// Health check لـ Railway
app.get('/health', (req, res) => res.json({ status: 'OK' }));

// ✅ التصحيح: createTransport مش createTransporter
const transporter = nodemailer.createTransport({
  host: 'mail-eu.smtp2go.com',
  port: 2525,
  secure: false,
  auth: {
    user: 'hussein1995@hussein.my',
    pass: 'Aa19955Aa@@'
  },
  tls: { rejectUnauthorized: false }
});

const verificationCodes = new Map();
const CODE_EXPIRY = 5 * 60 * 1000;

const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'تم تجاوز الحد الأقصى' }
});

function generateVerificationCode() {
  return crypto.randomInt(100000, 999999).toString();
}

async function sendVerificationCode(email) {
  const code = generateVerificationCode();
  const expiry = Date.now() + CODE_EXPIRY;
  
  verificationCodes.set(email, { code, attempts: 0, expiry, verified: false });

  await transporter.sendMail({
    from: '"التحقق" <hussein1995@hussein.my>',
    to: email,
    subject: 'كود التحقق 6 أرقام',
    html: `<h1 style="text-align:center;font-size:50px">${code}</h1><p>صالح لـ 5 دقائق</p>`
  });

  console.log(`✅ كود مرسل لـ ${email}`);
  return true;
}

app.post('/api/request-code', registrationLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email?.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({ error: 'بريد خاطئ' });
    }

    const sent = await sendVerificationCode(email);
    res.json({ message: sent ? 'تم الإرسال' : 'فشل الإرسال' });
  } catch (e) {
    res.status(500).json({ error: 'خطأ خادم' });
  }
});

app.post('/api/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    const record = verificationCodes.get(email);

    if (!record || Date.now() > record.expiry) {
      return res.status(400).json({ error: 'كود منتهي' });
    }

    if (record.code !== code) {
      record.attempts++;
      return res.status(400).json({ error: 'كود خاطئ' });
    }

    record.verified = true;
    res.json({ success: true, message: 'تم التحقق!' });
  } catch (e) {
    res.status(500).json({ error: 'خطأ خادم' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// تشغيل الخادم
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
