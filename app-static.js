// Minimal client-side verification flow (static, no backend)
// Generates a 6-digit code locally and verifies it in the browser.
(function(){
  const emailForm = document.getElementById('emailForm');
  const emailInput = document.getElementById('email');
  const emailMessage = document.getElementById('emailMessage');
  const emailSection = document.getElementById('emailSection');

  const verificationSection = document.getElementById('verificationSection');
  const codeInputs = Array.from(document.querySelectorAll('.code-input'));
  const verifyBtn = document.getElementById('verifyBtn');
  const resendBtn = document.getElementById('resendBtn');
  const backBtn = document.getElementById('backBtn');
  const verificationMessage = document.getElementById('verificationMessage');
  const countdownEl = document.getElementById('countdown');

  let currentCode = null;
  let countdown = 60;
  let countdownTimer = null;

  function showMessage(el, text, type){
    el.className = 'message ' + type;
    el.textContent = text;
  }

  function clearMessage(el){
    el.className = 'message';
    el.textContent = '';
  }

  function startCountdown(){
    countdown = 60;
    resendBtn.disabled = true;
    countdownEl.textContent = countdown;
    if(countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(()=>{
      countdown--;
      countdownEl.textContent = countdown;
      if(countdown <= 0){
        clearInterval(countdownTimer);
        resendBtn.disabled = false;
        countdownEl.textContent = '0';
      }
    },1000);
  }

  function generateCode(){
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  function openVerification(){
    emailSection.style.display = 'none';
    verificationSection.classList.add('active');
    codeInputs.forEach(i=> i.value='');
    codeInputs[0].focus();
    startCountdown();
  }

  emailForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const email = emailInput.value.trim();
    if(!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
      showMessage(emailMessage, 'البريد الإلكتروني غير صحيح', 'error');
      return;
    }
    clearMessage(emailMessage);
    // Simulate sending: generate code locally
    currentCode = generateCode();
    console.log('Simulated sent code:', currentCode);
    showMessage(emailMessage, 'تم إرسال رمز التحقق (محلياً) — تحقق من console إذا أردت.', 'success');
    setTimeout(()=>{
      openVerification();
    },700);
  });

  // move focus between code inputs
  codeInputs.forEach((input, idx)=>{
    input.addEventListener('input', (e)=>{
      const v = input.value.replace(/[^0-9]/g,'');
      input.value = v;
      if(v && idx < codeInputs.length-1) codeInputs[idx+1].focus();
    });
    input.addEventListener('keydown', (e)=>{
      if(e.key === 'Backspace' && !input.value && idx>0){
        codeInputs[idx-1].focus();
      }
    });
  });

  verifyBtn.addEventListener('click', ()=>{
    const code = codeInputs.map(i=>i.value).join('');
    if(code.length !== 6){
      showMessage(verificationMessage, 'أدخل الرمز المكون من 6 أرقام', 'error');
      return;
    }
    if(code === currentCode){
      showMessage(verificationMessage, 'تم التحقق بنجاح! يمكنك المتابعة.', 'success');
      // final action: here you can redirect or store a flag
    } else {
      showMessage(verificationMessage, 'الرمز غير صحيح. حاول مرة أخرى.', 'error');
    }
  });

  resendBtn.addEventListener('click', ()=>{
    currentCode = generateCode();
    console.log('Simulated resent code:', currentCode);
    showMessage(verificationMessage, 'تم إرسال رمز جديد (محلياً).', 'info');
    startCountdown();
  });

  backBtn.addEventListener('click', ()=>{
    verificationSection.classList.remove('active');
    emailSection.style.display = '';
    clearMessage(verificationMessage);
    clearMessage(emailMessage);
  });

})();
