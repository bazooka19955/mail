const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname)); // لخدمة index.html و JS

// رموز التحقق مؤقتة
const codes = new Map();
const CODE_EXPIRY = 5*60*1000;

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

function generateCode() {
  return Math.floor(100000 + Math.random()*900000).toString();
}

async function sendEmail(email, code){
  await transporter.sendMail({
    from: 'hussein1995@hussein.my',
    to: email,
    subject: 'رمز التحقق - 6 أرقام',
    text: `رمز التحقق الخاص بك: ${code}. صالح لمدة 5 دقائق.`
  });
}

// إرسال رمز التحقق
app.post('/api/send-code', async (req, res)=>{
  const { email } = req.body;
  if(!email) return res.status(400).json({ message: 'البريد مطلوب' });
  
  const code = generateCode();
  codes.set(email, { code, expiry: Date.now()+CODE_EXPIRY });
  
  try{
    await sendEmail(email, code);
    res.json({ message: 'تم إرسال الرمز بنجاح' });
  }catch(e){
    console.error(e);
    res.status(500).json({ message: 'فشل إرسال البريد' });
  }
});

// التحقق من الرمز
app.post('/api/verify-code', (req,res)=>{
  const { email, code } = req.body;
  if(!email || !code) return res.status(400).json({ message: 'البريد والرمز مطلوب' });
  
  const data = codes.get(email);
  if(!data) return res.status(400).json({ message: 'رمز غير موجود، اطلب رمز جديد' });
  if(Date.now() > data.expiry){
    codes.delete(email);
    return res.status(400).json({ message: 'انتهت صلاحية الرمز' });
  }
  if(data.code !== code) return res.status(400).json({ message: 'رمز غير صحيح' });

  codes.delete(email);
  res.json({ message: 'تم التحقق بنجاح' });
});

app.listen(PORT, ()=>console.log(`🚀 الخادم يعمل على http://localhost:${PORT}`));
