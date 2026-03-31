const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== SETUP ====================
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Rate limiting
const limiter = rateLimit({ windowMs: 15*60*1000, max: 10 });

// Codes storage
const codes = new Map();

// SMTP2GO
const transporter = nodemailer.createTransporter({
  host: 'mail-eu.smtp2go.com',
  port: 2525,
  secure: false,
  auth: {
    user: 'hussein1995@hussein.my',
    pass: 'Aa19955Aa@@'
  },
  tls: { rejectUnauthorized: false }
});

// ==================== API ====================

// Health check
app.get('/health', (req, res) => res.json({status: 'OK'}));

// Send verification code
app.post('/api/send-code', limiter, async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({error: 'بريد مطلوب'});
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 5*60*1000;

    codes.set(email.toLowerCase(), {
      code, attempts: 0, expiry, verified: false
    });

    await transporter.sendMail({
      from: '"التحقق" <hussein1995@hussein.my>',
      to: email,
      subject: `كودك: ${code}`,
      html: `
<div style="font-family:Arial;padding:30px;text-align:center">
  <h1 style="font-size:50px;color:#007bff">${code}</h1>
  <p>كود التحقق - صالح 5 دقائق</p>
</div>`
    });

    res.json({success: true, message: 'تم الإرسال'});
    
  } catch(e) {
    res.status(500).json({error: 'فشل الإرسال'});
  }
});

// Verify code
app.post('/api/verify-code', (req, res) => {
  try {
    const { email, code } = req.body;
    const record = codes.get(email.toLowerCase());

    if (!record) return res.status(400).json({error: 'لا كود'});

    if (Date.now() > record.expiry) {
      codes.delete(email.toLowerCase());
      return res.status(400).json({error: 'منتهي'});
    }

    if (record.code !== code) {
      record.attempts++;
      return res.status(400).json({error: 'خاطئ'});
    }

    res.json({success: true, message: 'تم التحقق!'});
    
  } catch(e) {
    res.status(500).json({error: 'خطأ'});
  }
});

// Serve main page
app.get('/', (req, res) => res.send(MAIN_HTML));

// ==================== HTML ====================
const MAIN_HTML = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>تسجيل حساب</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Segoe UI,Tahoma,Arial,sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}.container{background:#fff;padding:40px;border-radius:20px;box-shadow:0 20px 40px rgba(0,0,0,.1);max-width:400px;width:100%;text-align:center}h1{color:#333;margin-bottom:30px;font-size:26px}.form-group{margin-bottom:25px}.form-group label{display:block;margin-bottom:10px;color:#555;font-weight:500;font-size:15px}input{width:100%;padding:15px;border:2px solid #e1e5e9;border-radius:12px;font-size:16px;transition:all .3s ease;direction:ltr;text-align:center}input:focus{outline:none;border-color:#667eea;box-shadow:0 0 0 3px rgba(102,126,234,.1)}.code-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-top:10px}.code-grid input{width:100%;font-size:24px;font-weight:bold;padding:12px;text-align:center;direction:ltr}button{width:100%;padding:16px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;transition:all .3s;margin:10px 0}button:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 10px 25px rgba(102,126,234,.4)}button:disabled{opacity:.6;cursor:not-allowed}.message{padding:14px;border-radius:10px;margin:15px 0;font-weight:500;font-size:14px}.success{background:#d4edda;color:#155724;border:1px solid #c3e6cb}.error{background:#f8d7da;color:#721c24;border:1px solid #f5c6cb}.step{display:none}.step.active{display:block}.resend{color:#667eea;cursor:pointer;font-size:14px;margin-top:15px;text-decoration:underline}.resend:hover{color:#5a67d8}</style>
</head>
<body>
<div class="container">
<h1>📧 تسجيل حساب</h1>

<div id="step1" class="step active">
<div class="form-group">
<label>البريد الإلكتروني</label>
<input type="email" id="email" placeholder="example@gmail.com">
</div>
<button onclick="requestCode()">إرسال الكود</button>
</div>

<div id="step2" class="step">
<div class="message success" id="successMsg"></div>
<div class="form-group">
<label>الكود (6 أرقام)</label>
<div class="code-grid">
<input maxlength="1" inputmode="numeric">
<input maxlength="1" inputmode="numeric">
<input maxlength="1" inputmode="numeric">
<input maxlength="1" inputmode="numeric">
<input maxlength="1" inputmode="numeric">
<input maxlength="1" inputmode="numeric">
</div>
</div>
<button onclick="verifyCode()">التحقق</button>
<div class="resend" onclick="resetForm()">كود جديد</div>
</div>

<div id="status"></div>
</div>

<script>
let currentEmail='';
const steps=document.querySelectorAll('.step');
const codeInputs=document.querySelectorAll('.code-grid input');

codeInputs.forEach((input,i)=>{input.oninput=e=>{if(e.target.value.length&&i<5)codeInputs[i+1].focus()};input.onkeydown=e=>{if(e.key==='Backspace'&&!e.target.value&&i>0)codeInputs[i-1].focus()}});

function showStatus(msg,type='info'){document.getElementById('status').innerHTML=\`<div class="message \${type}">\${msg}</div>\`;setTimeout(()=>document.getElementById('status').innerHTML='',4e3)}
function showStep(n){steps.forEach((s,i)=>s.classList.toggle('active',i===n))}

async function requestCode(){const email=document.getElementById('email').value.trim();if(!email)return showStatus('أدخل بريدك','error');const btn=event.target;btn.disabled=true;btn.textContent='⏳ إرسال...';try{const r=await fetch('/api/send-code',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});const d=await r.json();if(r.ok){showStatus(d.message,'success');currentEmail=email;showStep(1);codeInputs[0].focus()}else showStatus(d.error,'error')}catch(e){showStatus('خطأ شبكة','error')}finally{btn.disabled=false;btn.textContent='إرسال الكود'}}

async function verifyCode(){const code=Array.from(codeInputs).map(i=>i.value).join('');if(code.length!==6)return showStatus('6 أرقام مطلوبة','error');const btn=event.target;btn.disabled=true;btn.textContent='⏳ التحقق...';try{const r=await fetch('/api/verify-code',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:currentEmail,code})});const d=await r.json();if(r.ok){showStatus('✅ نجح!','success');setTimeout(()=>{alert('تم التسجيل!');location.reload()},1500)}else{showStatus(d.error,'error');codeInputs.forEach(i=>i.value='');codeInputs[0].focus()}}catch(e){showStatus('خطأ','error')}finally{btn.disabled=false;btn.textContent='التحقق'}}

function resetForm(){showStep(0);document.getElementById('email').value='';document.getElementById('status').innerHTML='';currentEmail=''}
</script>
</body></html>`;

// ==================== START ====================
app.listen(PORT, '0.0.0.0', () => {
  console.log('✅ Server ready on port', PORT);
});
