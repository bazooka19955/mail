const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // لخدمة index.html و JS

// رموز التحقق مؤقتة
const verificationCodes = new Map();
const CODE_EXPIRY = 5 * 60 * 1000; // 5 دقائق

// إعداد SMTP
const transporter = nodemailer.createTransport({
  host: 'mail-eu.smtp2go.com',
  port: 2525,
  secure: false,
  auth: {
    user: 'hussein1995@hussein.my',  // ضع بريدك الكامل هنا
    pass: 'Aa19955Aa@@'
  },
  tls: { rejectUnauthorized: false }
});

// توليد كود عشوائي 6 أرقام
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// إرسال كود عبر البريد
async function sendEmail(email, code) {
  const mailOptions = {
    from: 'hussein1995@hussein.my',
    to: email,
    subject: 'رمز التحقق - 6 أرقام',
    text: `رمز التحقق الخاص بك: ${code}. صالح لمدة 5 دقائق.`
  };
  return transporter.sendMail(mailOptions);
}

// مسار إرسال الرمز
app.post('/api/send-code', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'البريد مطلوب' });

  const code = generateCode();
  verificationCodes.set(email, { code, expiry: Date.now() + CODE_EXPIRY });

  try {
    await sendEmail(email, code);
    res.json({ message: 'تم إرسال الرمز بنجاح' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'فشل إرسال البريد' });
  }
});

// مسار التحقق من الرمز
app.post('/api/verify-code', (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ message: 'البريد والرمز مطلوب' });

  const data = verificationCodes.get(email);
  if (!data) return res.status(400).json({ message: 'رمز غير موجود، اطلب رمز جديد' });

  if (Date.now() > data.expiry) {
    verificationCodes.delete(email);
    return res.status(400).json({ message: 'انتهت صلاحية الرمز' });
  }

  if (data.code !== code) return res.status(400).json({ message: 'رمز غير صحيح' });

  verificationCodes.delete(email);
  res.json({ message: 'تم التحقق بنجاح' });
});

// تشغيل السيرفر
app.listen(PORT, () => console.log(`🚀 الخادم يعمل على http://localhost:${PORT}`));
