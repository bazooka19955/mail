const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// تخزين رموز التحقق مؤقتًا (يمكن استخدام Redis لاحقًا)
const verificationCodes = new Map();
const CODE_EXPIRY_TIME = 5 * 60 * 1000; // 5 دقائق

// إعداد SMTP2GO
const transporter = nodemailer.createTransport({
  host: 'mail-eu.smtp2go.com',
  port: 2525,
  secure: false,
  auth: {
    user: 'hussein1995@hussein.my', // البريد الكامل هنا
    pass: 'Aa19955Aa@@'
  },
  tls: { rejectUnauthorized: false }
});

// اختبار الاتصال
transporter.verify((error, success) => {
  if (error) console.log('❌ SMTP Error:', error);
  else console.log('✅ SMTP Ready');
});

// توليد رمز عشوائي 6 أرقام
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// إرسال البريد الإلكتروني
async function sendEmail(email, code) {
  const mailOptions = {
    from: `"تسجيل الحساب" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'رمز التحقق من حسابك',
    html: `
      <html dir="rtl">
        <body style="font-family: Arial, sans-serif; text-align: center;">
          <h2>🔐 رمز التحقق من حسابك</h2>
          <p>استخدم الرمز التالي للتحقق من بريدك الإلكتروني:</p>
          <h1 style="color:#667eea;">${code}</h1>
          <p>هذا الرمز صالح لمدة 5 دقائق فقط.</p>
          <p>إذا لم تطلب هذا الرمز، تجاهل الرسالة.</p>
        </body>
      </html>
    `
  };

  await transporter.sendMail(mailOptions);
}

// إرسال الرمز
app.post('/api/send-code', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'البريد الإلكتروني مطلوب' });

    const code = generateCode();
    verificationCodes.set(email, { code, expiry: Date.now() + CODE_EXPIRY_TIME, attempts: 0 });

    await sendEmail(email, code);
    res.json({ success: true, message: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'حدث خطأ أثناء إرسال الرمز', error: error.message });
  }
});

// التحقق من الرمز
app.post('/api/verify-code', (req, res) => {
  try {
    const { email, code } = req.body;
    const data = verificationCodes.get(email);

    if (!data) return res.status(400).json({ message: 'لم يتم طلب رمز لهذا البريد' });
    if (Date.now() > data.expiry) {
      verificationCodes.delete(email);
      return res.status(400).json({ message: 'انتهت صلاحية الرمز، اطلب رمز جديد' });
    }

    data.attempts++;
    if (data.attempts > 5) {
      verificationCodes.delete(email);
      return res.status(400).json({ message: 'تجاوزت عدد المحاولات، اطلب رمز جديد' });
    }

    if (data.code !== code) {
      return res.status(400).json({ message: `الرمز غير صحيح. لديك ${6 - data.attempts} محاولات` });
    }

    verificationCodes.delete(email);
    res.json({ success: true, message: 'تم التحقق من بريدك بنجاح' });

  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ أثناء التحقق', error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 الخادم يعمل على http://localhost:${PORT}`);
});
