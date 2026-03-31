const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// خزن الرموز مؤقتًا
const codes = new Map();

// حماية من طلبات كثيرة
const limiter = rateLimit({ windowMs: 15*60*1000, max: 10 });

// إعداد SMTP
const transporter = nodemailer.createTransport({
  host: 'mail-eu.smtp2go.com',
  port: 587,            // 465 ممكن تستخدمه مع secure: true
  secure: false,        // false = STARTTLS
  auth: {
    user: 'ali1995', // البريد الكامل
    pass: 'Aa19955Aa'                 // كلمة المرور
  },
  tls: { rejectUnauthorized: true }      // تحقق من شهادة السيرفر
});

// إرسال كود
app.post('/api/send', limiter, async (req,res) => {
  try {
    const { email } = req.body;
    if (!email?.includes('@')) return res.status(400).json({ error: 'البريد مطلوب' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    codes.set(email.toLowerCase(), { code, expiry: Date.now()+300000 }); // 5 دقائق

    await transporter.sendMail({
      from: '"كود التحقق" <hussein1995@hussein.my>',
      to: email,
      subject: 'رمز التحقق الخاص بك',
      html: `<h1 style="text-align:center;font-size:50px">${code}</h1>
             <p style="text-align:center">الرمز صالح 5 دقائق</p>`
    });

    res.json({ success: true, msg: 'تم إرسال الكود بنجاح' });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'فشل الإرسال، تحقق من بيانات SMTP' });
  }
});

// التحقق من الكود
app.post('/api/verify', (req,res) => {
  const { email, code } = req.body;
  const r = codes.get(email.toLowerCase());
  if (!r) return res.status(400).json({ error: 'لم يتم إرسال كود' });
  if (Date.now() > r.expiry) return res.status(400).json({ error: 'انتهت صلاحية الكود' });
  if (r.code !== code) return res.status(400).json({ error: 'الكود خاطئ' });

  codes.delete(email.toLowerCase());
  res.json({ success: true, msg: '✅ تم التحقق بنجاح!' });
});

// صفحة التسجيل + التحقق (HTML مدمج)
app.get('/', (req,res) => res.send(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>تسجيل حساب</title>
<style>
body{font-family:Arial,sans-serif;background:linear-gradient(135deg,#667eea,#764ba2);min-height:100vh;display:flex;justify-content:center;align-items:center;margin:0;padding:20px}
.container{background:#fff;padding:30px;border-radius:15px;max-width:400px;width:100%;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.2)}
h1{margin-bottom:20px;color:#333}
input{width:100%;padding:12px;margin:10px 0;border:1px solid #ccc;border-radius:5px;font-size:16px}
button{width:100%;padding:12px;margin-top:10px;background:#667eea;color:#fff;border:none;border-radius:5px;font-size:16px;cursor:pointer}
button:disabled{opacity:.6;cursor:not-allowed}
.code-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:5px;margin:15px 0}
.code-grid input{text-align:center;font-size:20px;padding:10px;border:1px solid #ccc;border-radius:5px}
.msg{padding:10px;margin:10px 0;border-radius:5px;font-weight:600}
.success{background:#d4edda;color:#155724}
.error{background:#f8d7da;color:#721c24}
.step{display:none}
.step.active{display:block}
</style>
</head>
<body>
<div class="container">
<h1>تسجيل حساب</h1>
<div id="step1" class="step active">
<input id="email" type="email" placeholder="أدخل بريدك الإلكتروني">
<button onclick="sendCode(event)">إرسال كود</button>
</div>

<div id="step2" class="step">
<p>أدخل كود التحقق المرسل إلى بريدك</p>
<div class="code-grid">
<input maxlength="1"><input maxlength="1"><input maxlength="1">
<input maxlength="1"><input maxlength="1"><input maxlength="1">
</div>
<button onclick="verifyCode(event)">التحقق</button>
<button onclick="backStep()">رجوع</button>
</div>

<div id="msg"></div>
</div>

<script>
let email='';
const steps=document.querySelectorAll('.step');
const inputs=document.querySelectorAll('.code-grid input');

inputs.forEach((i,idx)=>{i.oninput=()=>{if(idx<5)inputs[idx+1].focus()};i.onkeydown=e=>{if(e.key==='Backspace'&&idx>0&&!i.value)inputs[idx-1].focus()}});

function showStep(n){steps.forEach((s,i)=>s.classList.toggle('active',i===n))}
function msg(text,type){document.getElementById('msg').innerHTML=\`<div class="msg \${type}">\${text}</div>\`}
function backStep(){showStep(0);document.getElementById('email').focus()}

async function sendCode(e){
  e.preventDefault();
  const btn=e.target;
  const em=document.getElementById('email').value.trim();
  if(!em){msg('البريد مطلوب','error');return;}
  btn.disabled=true; btn.textContent='إرسال...';
  try{
    const res=await fetch('/api/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:em})});
    const data=await res.json();
    if(res.ok){email=em;msg(data.msg,'success');showStep(1);inputs[0].focus();}
    else msg(data.error,'error');
  }catch{msg('خطأ في الشبكة','error')}
  finally{btn.disabled=false; btn.textContent='إرسال كود'}
}

async function verifyCode(e){
  e.preventDefault();
  const btn=e.target;
  const code=Array.from(inputs).map(i=>i.value).join('');
  if(code.length!==6){msg('أدخل 6 أرقام','error');return;}
  btn.disabled=true; btn.textContent='التحقق...';
  try{
    const res=await fetch('/api/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,code})});
    const data=await res.json();
    if(res.ok){msg(data.msg,'success');setTimeout(()=>alert('تم التسجيل!'),500);}
    else{msg(data.error,'error');inputs.forEach(i=>i.value='');inputs[0].focus();}
  }catch{msg('خطأ','error')}
  finally{btn.disabled=false; btn.textContent='التحقق'}
}
</script>
</body>
</html>
`));

// بدء السيرفر
app.listen(PORT, '0.0.0.0', () => console.log('✅ السيرفر جاهز على PORT', PORT));
