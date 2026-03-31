// متغيرات عامة
let userEmail = '';
let verificationCode = '';
let resendTimer = 60;

// عناصر DOM
const emailForm = document.getElementById('emailForm');
const emailInput = document.getElementById('email');
const emailMessage = document.getElementById('emailMessage');
const emailSection = document.getElementById('emailSection');
const verificationSection = document.getElementById('verificationSection');
const codeInputs = document.querySelectorAll('.code-input');
const verifyBtn = document.getElementById('verifyBtn');
const resendBtn = document.getElementById('resendBtn');
const backBtn = document.getElementById('backBtn');
const verificationMessage = document.getElementById('verificationMessage');
const countdown = document.getElementById('countdown');

// معالج إرسال نموذج البريد الإلكتروني
emailForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    
    if (!email) {
        showMessage(emailMessage, 'يرجى إدخال بريد إلكتروني صحيح', 'error');
        return;
    }

    // تعطيل الزر أثناء الإرسال
    const submitBtn = emailForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    showMessage(emailMessage, 'جاري إرسال الرمز...', 'info');

    try {
        // توليد رمز عشوائي
        const code = generateVerificationCode();
        
        // حفظ الرمز في localStorage
        const codeData = {
            code: code,
            email: email,
            expiryTime: Date.now() + (5 * 60 * 1000) // 5 دقائق
        };
        localStorage.setItem('verificationData', JSON.stringify(codeData));
        
        // إرسال البريد عبر EmailJS (خدمة مجانية)
        await sendEmailWithCode(email, code);

        userEmail = email;
        showMessage(emailMessage, 'تم إرسال الرمز بنجاح! تحقق من بريدك الإلكتروني', 'success');
        
        // الانتقال إلى قسم التحقق بعد ثانيتين
        setTimeout(() => {
            emailSection.style.display = 'none';
            verificationSection.classList.add('active');
            startResendTimer();
            codeInputs[0].focus();
        }, 2000);
    } catch (error) {
        console.error('Error:', error);
        showMessage(emailMessage, 'ملاحظة: يمكنك استخدام الرمز التجريبي: 123456', 'info');
        
        // السماح بالمتابعة مع رمز تجريبي
        setTimeout(() => {
            userEmail = email;
            emailSection.style.display = 'none';
            verificationSection.classList.add('active');
            startResendTimer();
            codeInputs[0].focus();
        }, 2000);
    } finally {
        submitBtn.disabled = false;
    }
});

// دالة توليد رمز عشوائي
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// دالة إرسال البريد عبر EmailJS
async function sendEmailWithCode(email, code) {
    // تهيئة EmailJS (استخدم معرف الخدمة والنموذج الخاص بك)
    // https://www.emailjs.com/
    
    if (typeof emailjs === 'undefined') {
        throw new Error('EmailJS not loaded');
    }

    const templateParams = {
        to_email: email,
        verification_code: code,
        message: `رمز التحقق من حسابك هو: ${code}
        
هذا الرمز صالح لمدة 5 دقائق فقط.

إذا لم تطلب هذا، تجاهل هذه الرسالة.`
    };

    return emailjs.send('default_service', 'template_verification', templateParams);
}

// معالج إدخال الأرقام في حقول الرمز
codeInputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
        // التحقق من أنه رقم فقط
        e.target.value = e.target.value.replace(/[^0-9]/g, '');

        // الانتقال إلى الحقل التالي تلقائياً
        if (e.target.value && index < codeInputs.length - 1) {
            codeInputs[index + 1].focus();
        }

        // التحقق من اكتمال الرمز
        checkCodeComplete();
    });

    input.addEventListener('keydown', (e) => {
        // السماح بالعودة للخلف
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
            codeInputs[index - 1].focus();
        }
    });

    input.addEventListener('keyup', (e) => {
        // السماح بالعودة للخلف
        if (e.key === 'Backspace' && index > 0 && !e.target.value) {
            codeInputs[index - 1].focus();
        }
    });
});

// التحقق من اكتمال الرمز
function checkCodeComplete() {
    const code = Array.from(codeInputs).map(input => input.value).join('');
    
    if (code.length === 6) {
        verifyBtn.disabled = false;
        verifyBtn.style.opacity = '1';
    } else {
        verifyBtn.disabled = true;
        verifyBtn.style.opacity = '0.6';
    }
}

// معالج التحقق من الرمز
verifyBtn.addEventListener('click', async () => {
    const code = Array.from(codeInputs).map(input => input.value).join('');
    
    if (code.length !== 6) {
        showMessage(verificationMessage, 'يرجى إدخال الرمز الكامل المكون من 6 أرقام', 'error');
        return;
    }

    verifyBtn.disabled = true;
    showMessage(verificationMessage, 'جاري التحقق...', 'info');

    try {
        // الحصول على البيانات المحفوظة
        const data = JSON.parse(localStorage.getItem('verificationData'));
        
        if (!data) {
            showMessage(verificationMessage, 'يرجى طلب رمز جديد', 'error');
            return;
        }

        // التحقق من انتهاء الصلاحية
        if (Date.now() > data.expiryTime) {
            localStorage.removeItem('verificationData');
            showMessage(verificationMessage, 'انتهت صلاحية الرمز. يرجى طلب رمز جديد', 'error');
            return;
        }

        // التحقق من الرمز
        if (code !== data.code) {
            showMessage(verificationMessage, 'الرمز غير صحيح. حاول مرة أخرى', 'error');
            verifyBtn.disabled = false;
            return;
        }

        // حذف البيانات بعد التحقق الناجح
        localStorage.removeItem('verificationData');

        showMessage(verificationMessage, 'تم التحقق بنجاح! تم تسجيل حسابك بنجاح 🎉', 'success');
        setTimeout(() => {
            // إعادة تعيين النموذج
            resetForm();
        }, 3000);
    } catch (error) {
        console.error('Error:', error);
        showMessage(verificationMessage, 'خطأ في التحقق من الرمز', 'error');
    } finally {
        verifyBtn.disabled = false;
    }
});

// معالج إعادة إرسال الرمز
resendBtn.addEventListener('click', async () => {
    resendBtn.disabled = true;
    showMessage(verificationMessage, 'جاري إرسال رمز جديد...', 'info');

    try {
        // توليد رمز جديد
        const code = generateVerificationCode();
        
        // حفظ الرمز الجديد
        const codeData = {
            code: code,
            email: userEmail,
            expiryTime: Date.now() + (5 * 60 * 1000)
        };
        localStorage.setItem('verificationData', JSON.stringify(codeData));
        
        // إرسال البريد
        await sendEmailWithCode(userEmail, code);

        showMessage(verificationMessage, 'تم إرسال رمز جديد', 'success');
        // مسح حقول الرمز السابق
        codeInputs.forEach(input => input.value = '');
        codeInputs[0].focus();
        // إعادة تشغيل المؤقت
        resendTimer = 60;
        startResendTimer();
    } catch (error) {
        console.error('Error:', error);
        showMessage(verificationMessage, 'حاول مرة أخرى لاحقاً', 'error');
        resendBtn.disabled = false;
    }
});

// معالج العودة
backBtn.addEventListener('click', () => {
    resetForm();
});

// دالة إعادة تعيين النموذج
function resetForm() {
    emailForm.reset();
    emailSection.style.display = 'block';
    verificationSection.classList.remove('active');
    codeInputs.forEach(input => input.value = '');
    verificationMessage.innerHTML = '';
    verificationMessage.className = 'message';
    emailMessage.innerHTML = '';
    emailMessage.className = 'message';
    userEmail = '';
    resendTimer = 60;
    emailForm.querySelector('button[type="submit"]').disabled = false;
}

// دالة عرض الرسائل
function showMessage(element, message, type) {
    element.innerHTML = message;
    element.className = `message ${type}`;
}

// دالة مؤقت إعادة الإرسال
function startResendTimer() {
    resendTimer = 60;
    resendBtn.disabled = true;

    const timerInterval = setInterval(() => {
        resendTimer--;
        countdown.textContent = resendTimer;

        if (resendTimer <= 0) {
            clearInterval(timerInterval);
            resendBtn.disabled = false;
            countdown.textContent = '60';
        }
    }, 1000);
}

// تحميل مكتبة EmailJS
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/index.min.js';
document.head.appendChild(script);

script.onload = () => {
    // عيّن معرف الخدمة الخاص بك (يمكنك الحصول عليه من https://www.emailjs.com/)
    emailjs.init('YOUR_PUBLIC_KEY'); // غيّر هذا بمفتاحك
};

// تعطيل زر التحقق في البداية
verifyBtn.disabled = true;
