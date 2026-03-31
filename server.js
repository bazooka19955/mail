const express = require('express');
const nodemailer = require('nodemailer');
const app = express();
app.use(express.json());

// إعداد SMTP2GO
const transporter = nodemailer.createTransport({
  host: 'mail-eu.smtp2go.com',
  port: 2525,
  secure: false,
  auth: {
    user: 'hussein1995@hussein.my', // البريد الكامل هنا
    pass: 'Aa199a@@'
  },
  tls: { rejectUnauthorized: false }
});

// مثال بسيط لإنشاء حساب جديد
let users = [];

app.post('/register', (req, res) => {
  const { email, password } = req.body;
  const user = { email, password };

  // التحقق من وجود المستخدم
  if (users.find(u => u.email === email)) {
    return res.status(400).send('المستخدم موجود بالفعل');
  }

  // إرسال رسالة التحقق
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  user.verificationCode = verificationCode;

  transporter.sendMail({
    from: 'hussein1995@hussein.my',
    to: email,
    subject: 'تحقق حساب',
    text: `رمز التحقق هو: ${verificationCode}`
  }, (error, info) => {
    if (error) {
      return res.status(500).send('خطأ في إرسال البريد');
    }
    users.push(user);
    res.send('تم التسجيل بنجاح. الرجاء التحقق من البريد');
  });
});

app.post('/verify', (req, res) => {
  const { email, verificationCode } = req.body;
  const user = users.find(u => u.email === email);

  if (!user || user.verificationCode !== verificationCode) {
    return res.status(400).send('رمز التحقق غير صحيح');
  }

  user.verified = true;
  res.send('تم التحقق بنجاح');
});

const port = 3000;
app.listen(port, () => {
  console.log(`السيرفر يعمل على البورت ${port}`);
});
