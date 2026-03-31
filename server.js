const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname))); // لعرض index.html

const verificationCodes = new Map();
const CODE_EXPIRY = 5 * 60 * 1000; // 5 دقائق

const transporter = nodemailer.createTransport({
  host: 'mail-eu.smtp2go.com',
  port: 2525,
  secure: false,
  auth: { user: 'hussein1995', pass: 'Aa19955Aa@@' },
  tls: { rejectUnauthorized: false }
});

function generateCode() { return Math.floor(100000 + Math.random()*900000).toString(); }

async function sendEmail(email, code){
  await transporter.sendMail({
    from: '"تسجيل الحساب" <noreply@example.com>',
    to: email,
    subject: 'رمز التحقق من حسابك - 6 أرقام',
    html: `<p>رمز التحقق: <b>${code}</b></p><p>صالح 5 دقائق فقط.</p>`
  });
}

app.post('/api/send-code', async (req,res)=>{
  const { email } = req.body;
  if(!email) return res.status(400).json({ success:false, message:'الرجاء إدخال البريد الإلكتروني' });
  const code = generateCode();
  verificationCodes.set(email,{ code, expiry: Date.now()+CODE_EXPIRY, attempts:0 });
  try { await sendEmail(email, code); res.json({ success:true, message:'تم إرسال رمز التحقق' }); }
  catch(e){ res.status(500).json({ success:false, message:'خطأ في الإرسال', error:e.message }); }
});

app.post('/api/verify-code', (req,res)=>{
  const { email, code } = req.body;
  if(!email || !code) return res.status(400).json({ success:false, message:'البريد والرمز مطلوبان' });
  const data = verificationCodes.get(email);
  if(!data) return res.status(400).json({ success:false, message:'لم يتم طلب رمز' });
  if(Date.now()>data.expiry){ verificationCodes.delete(email); return res.status(400).json({ success:false, message:'انتهت صلاحية الرمز' }); }
  data.attempts++;
  if(data.attempts>5){ verificationCodes.delete(email); return res.status(400).json({ success:false, message:'تجاوزت عدد المحاولات' }); }
  if(code!==data.code) return res.status(400).json({ success:false, message:`الرمز غير صحيح، ${6-data.attempts} محاولات متبقية` });
  verificationCodes.delete(email);
  res.json({ success:true, message:'تم التحقق بنجاح!' });
});

setInterval(()=>{
  const now = Date.now();
  for(const [email,data] of verificationCodes.entries()){ if(now>data.expiry) verificationCodes.delete(email); }
}, 60*60*1000);

app.listen(PORT,()=>console.log(`🚀 السيرفر شغال على البورت ${PORT}`));
