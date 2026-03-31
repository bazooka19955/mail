const express = require('express');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const app = express();

app.use(express.json());
app.use(express.static('public'));

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

// تخزين رموز التحقق (في الإنتاج استخدم Redis أو قاعدة بيانات)
const verificationCodes = new Map();
const MAX_ATTEMPTS = 3;
const CODE_EXPIRY = 5 * 60 * 1000; // 5 دقائق

// Rate limiting
const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 5,
  message: 'تم تجاوز الحد الأقصى لمحاولات التسجيل'
});

// توليد كود تحقق 6 أرقام
function generateVerificationCode() {
  return crypto.randomInt(100000, 999999).toString();
}

// إرسال كود التحقق
async function sendVerificationCode(email) {
  const code = generateVerificationCode();
  const expiry = Date.now() + CODE_EXPIRY;
  
  verificationCodes.set(email, {
    code,
    attempts: 0,
    expiry,
    verified: false
  });

  const mailOptions = {
    from: '"Verification Code" <hussein1995@hussein.my>',
    to: email,
    subject: 'كود التحقق - تسجيل حساب جديد',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>كود التحقق الخاص بك</h2>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
          <h1 style="font-size: 48px; color: #007bff; margin: 0; letter-spacing: 10px;">
            ${code}
          </h1>
          <p>كود التحقق الخاص بك لتسجيل الحساب الجديد</p>
        </div>
        <p style="color: #666; font-size: 14px;">
          هذا الكود صالح لمدة <strong>5 دقائق</strong> فقط.<br>
          إذا لم تطلب هذا الكود، يرجى تجاهله.
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`كود التحقق مرسل إلى: ${email}`);
    return true;
  } catch (error) {
    console.error('خطأ في إرسال البريد:', error);
    return false;
  }
}

// API: طلب كود تحقق
app.post('/api/request-code', registrationLimiter, async (req, res) => {
  const { email } = req.body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'بريد إلكتروني غير صالح' });
  }

  // التحقق من صلاحية الكود السابق
  const existing = verificationCodes.get(email);
  if (existing && existing.verified) {
    return res.status(400).json({ error: 'تم التحقق من هذا الحساب مسبقاً' });
  }

  const sent = await sendVerificationCode(email);
  if (sent) {
    res.json({ message: 'تم إرسال كود التحقق إلى بريدك الإلكتروني' });
  } else {
    res.status(500).json({ error: 'فشل في إرسال الكود، حاول مرة أخرى' });
  }
});

// API: التحقق من الكود
app.post('/api/verify-code', async (req, res) => {
  const { email, code } = req.body;

  const record = verificationCodes.get(email);
  if (!record) {
    return res.status(400).json({ error: 'لم يتم إرسال كود تحقق لهذا البريد' });
  }

  if (Date.now() > record.expiry) {
    verificationCodes.delete(email);
    return res.status(400).json({ error: 'انتهت صلاحية الكود، اطلب كود جديد' });
  }

  if (record.code !== code) {
    record.attempts++;
    if (record.attempts >= MAX_ATTEMPTS) {
      verificationCodes.delete(email);
      return res.status(400).json({ error: 'تم تجاوز عدد المحاولات المسموح بها' });
    }
    return res.status(400).json({ error: 'الكود غير صحيح' });
  }

  record.verified = true;
  res.json({ 
    message: 'تم التحقق بنجاح!',
    token: crypto.randomBytes(32).toString('hex') // توكن للحساب الجديد
  });
});

app.listen(3000, () => {
  console.log('الخادم يعمل على http://localhost:3000');
});
