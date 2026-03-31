const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const codes = new Map();
const limiter = rateLimit({windowMs:15*60*1000,max:10});

const transporter = nodemailer.createTransport({
  host: 'mail-eu.smtp2go.com',
  port: 2525,
  secure: false,
  auth: {
    user: 'hussein1995@hussein.my',
    pass: 'Aa19955Aa@@'
  },
  tls: {rejectUnauthorized: false}
});

// Health
app.get('/health', (req, res) => res.json({status:'OK'}));

// Send code
app.post('/api/send', limiter, async (req, res) => {
  try {
    const {email} = req.body;
    if (!email?.includes('@')) return res.status(400).json({error:'بريد مطلوب'});

    const code = Math.floor(100000 + Math.random()*900000).toString();
    codes.set(email.toLowerCase(), {code, attempts:0, expiry:Date.now()+300000});

    await transporter.sendMail({
      from: '"كود" <hussein1995@hussein.my>',
      to: email,
      subject: code,
      html: `<h1 style="font-size:60px;text-align:center">${code}</h1>`
    });

    res.json({success:true, msg:'تم الإرسال'});
  } catch(e) {
    res.status(500).json({error:'فشل'});
  }
});

// Verify
app.post('/api/verify', (req, res) => {
  try {
    const {email, code} = req.body;
    const r = codes.get(email.toLowerCase());
    if (!r) return res.status(400).json({error:'لا كود'});
    if (Date.now() > r.expiry) return res.status(400).json({error:'منتهي'});
    if (r.code !== code) return res.status(400).json({error:'خاطئ'});

    res.json({success:true, msg:'نجح!'});
  } catch(e) {
    res.status(500).json({error:'خطأ'});
  }
});

// HTML page
app.get('/', (req, res) => res.send(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>تسجيل</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}.c{background:#fff;padding:40px;border-radius:20px;box-shadow:0 20px 40px rgba(0,0,0,.1);max-width:380px;width:100%;text-align:center}h1{color:#333;margin-bottom:30px;font-size:24px}label{display:block;margin:15px 0 8px;color:#555;font-weight:500}input{width:100%;padding:15px;border:2px solid #ddd;border-radius:10px;font-size:16px;margin-bottom:15px;box-sizing:border-box}button{width:100%;padding:15px;background:#667eea;color:#fff;border:none;border-radius:10px;font-size:16px;font-weight:600;cursor:pointer;transition:.3s}button:hover{background:#5a67d8;transform:translateY(-2px)}button:disabled{opacity:.6;cursor:not-allowed}.code-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin:15px 0}.code-grid input{width:100%;font-size:22px;font-weight:bold;padding:12px;text-align:center}.msg{padding:15px;border-radius:10px;margin:15px 0;font-weight:500}.success{background:#d4edda;color:#155724}.error{background:#f8d7da;color:#721c24}.step{display:none}.step.active{display:block}</style>
</head>
<body>
<div class="c">
<h1>تسجيل حساب</h1>
<div id="step1" class="step active">
<label>البريد الإلكتروني</label>
<input id="email" type="email" placeholder="your@gmail.com">
<button onclick="sendCode()">إرسال كود</button>
</div>
<div id="step2" class="step">
<label>كود التحقق (6 أرقام)</label>
<div class="code-grid">
<input maxlength="1">
<input maxlength="1">
<input maxlength="1">
<input maxlength="1">
<input maxlength="1">
<input maxlength="1">
</div>
<button onclick="checkCode()">التحقق</button>
<button onclick="back()" style="background:#6b7280;margin-top:10px">رجوع</button>
</div>
<div id="msg"></div>
</div>
<script>
let email='';
const steps=document.querySelectorAll('.step');
const inputs=document.querySelectorAll('.code-grid input');

inputs.forEach((i,idx)=>{i.oninput=()=>{if(idx<5)inputs[idx+1].focus()};i.onkeydown=e=>{if(e.key==='Backspace'&&idx>0&&!i.value)inputs[idx-1].focus()}});

async function sendCode(){const e=document.getElementById('email').value.trim();if(!e)return msg('بريد مطلوب','error');const b=event.target;b.disabled=true;b.textContent='إرسال...';try{const r=await fetch('/api/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:e})});const d=await r.json();if(r.ok){msg(d.msg,'success');email=e;showStep(1);inputs[0].focus()}else msg(d.error,'error')}catch{msg('خطأ شبكة','error')}finally{b.disabled=false;b.textContent='إرسال كود'}}

async function checkCode(){const c=Array.from(inputs).map(i=>i.value).join('');if(c.length!==6)return msg('6 أرقام','error');const b=event.target;b.disabled=true;b.textContent='التحقق...';try{const r=await fetch('/api/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,code:c})});const d=await r.json();if(r.ok){msg('✅ تم التسجيل!','success');setTimeout(()=>{alert('نجح!');location.reload()},1500)}else{msg(d.error,'error');inputs.forEach(i=>i.value='');inputs[0].focus()}}catch{msg('خطأ','error')}finally{b.disabled=false;b.textContent='التحقق'}}

function msg(t,type){document.getElementById('msg').innerHTML=\`<div class="msg \${type}">\${t}</div>\`}
function showStep(n){steps.forEach((s,i)=>s.classList.toggle('active',i===n))}
function back(){showStep(0);document.getElementById('email').focus()}
</script>
</body>
</html>`));

// Start
app.listen(PORT, '0.0.0.0', () => {
  console.log('✅ Ready on', PORT);
});
