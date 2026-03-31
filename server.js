const express = require('express');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Health check endpoint (مهم لـ Railway)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// إعداد SMTP2GO
const transporter = nodemailer.createTransporter({
  host: 'mail-eu.smtp2go.com',
  port: 2525,
  secure: false,
  auth: {
    user: 'hussein1995@hussein.my',
    pass: 'Aa199a@@'
  },
  tls: { rejectUnauthorized: false }
});

// تخزين الرموز في الذاكرة
const verificationCodes = new Map();
const CODE_EXPIRY = 5 * 60 * 1000;

// Rate limiting
const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'تم تجاوز الحد الأقصى لمحاولات التسجيل' }
});

function generateVerificationCode() {
  return crypto.randomInt(100000, 999999).toString();
}

async function sendVerificationCode(email) {
  try {
    const code = generateVerificationCode();
    const expiry = Date.now() + CODE_EXPIRY;
    
    verificationCodes.set(email, {
      code,
      attempts: 0,
      expiry,
      verified: false
    });

    await transporter.sendMail({
      from: '"Verification Code" <hussein1995@hussein.my>',
      to: email,
      subject: 'كود التحقق - تسجيل حساب جديد',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>كود التحقق الخاص بك</h2>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
            <h1 style="font-size: 48px; color: #007bff; margin: 0; letter-spacing: 10px;">${code}</h1>
            <p>كود التحقق الخاص بك لتسجيل الحساب الجديد</p>
          </div>
          <p style="color: #666;">هذا الكود صالح لمدة <strong>5 دقائق</strong> فقط.</p>
        </div>
      `
    });

    console.log(`✅ كود مرسل إلى: ${email}`);
    return true;
  } catch (error) {
    console.error('❌ خطأ SMTP:', error.message);
    return false;
  }
}

// API endpoints
app.post('/api/request-code', registrationLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'بريد إلكتروني غير صالح' });
    }

    const sent = await sendVerificationCode(email);
    if (sent) {
      res.json({ message: 'تم إرسال كود التحقق إلى بريدك الإلكتروني' });
    } else {
      res.status(500).json({ error: 'فشل في إرسال الكود' });
    }
  } catch (error) {
    console.error('Request code error:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

app.post('/api/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;

    const record = verificationCodes.get(email);
    if (!record) {
      return res.status(400).json({ error: 'لم يتم إرسال كود تحقق' });
    }

    if (Date.now() > record.expiry) {
      verificationCodes.delete(email);
      return res.status(400).json({ error: 'انتهت صلاحية الكود' });
    }

    if (record.code !== code) {
      record.attempts++;
      if (record.attempts >= 3) {
        verificationCodes.delete(email);
        return res.status(400).json({ error: 'تم تجاوز عدد المحاولات' });
      }
      return res.status(400).json({ error: 'الكود غير صحيح' });
    }

    record.verified = true;
    res.json({ 
      message: 'تم التحقق بنجاح!',
      success: true
    });
  } catch (error) {
    console.error('Verify code error:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// Root route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'صفحة غير موجودة' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'خطأ في الخادم' });
});

// تشغيل الخادم
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
  console.log(`🌐 http://localhost:${PORT}`);
});

module.exports = app;
