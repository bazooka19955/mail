// server.js
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// تحميل متغيرات البيئة
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// متغيرات لتخزين الأكواد المؤقتة (يفضل استخدام Redis أو قاعدة بيانات في الإنتاج)
const verificationCodes = new Map();
const CODE_EXPIRY_TIME = 5 * 60 * 1000; // 5 دقائق

// إعدادات nodemailer للبريد الإلكتروني
const transporter = nodemailer.createTransport({
    host: 'mail-eu.smtp2go.com',
    port: 2525,
    secure: false,
    auth: {
        user: 'hussein1995',
        pass: 'Aa19955Aa@@'
    },
    tls: {
        rejectUnauthorized: false
    }
});

// اختبار الاتصال بخادم البريد
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ خطأ في الاتصال بخادم البريد:', error);
    } else {
        console.log('✅ تم الاتصال بخادم البريد بنجاح');
    }
});

// دالة توليد رمز عشوائي
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// دالة إرسال البريد الإلكتروني
async function sendVerificationEmail(email, code) {
    const mailOptions = {
        from: `"تسجيل الحساب" <noreply@hussein.my>`,
        to: email,
        subject: 'رمز التحقق من حسابك - 6 أرقام فقط',
        html: `<p>رمز التحقق من حسابك: <b>${code}</b></p>
               <p>الرمز صالح لمدة 5 دقائق</p>`
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ تم إرسال البريد بنجاح إلى ${email}:`, info.messageId);
        return true;
    } catch (error) {
        console.error(`❌ خطأ في إرسال البريد إلى ${email}:`, error);
        throw error;
    }
}

// ✅ مسار GET للتأكد أن السيرفر شغال
app.get('/api/send-code', (req, res) => {
    res.send("🚀 السيرفر شغال! استخدم POST لإرسال الرمز إلى البريد الإلكتروني.");
});

// API endpoint POST لإرسال رمز التحقق
app.post('/api/send-code', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "البريد الإلكتروني مطلوب" });

        const code = generateVerificationCode();
        verificationCodes.set(email, { code, expiryTime: Date.now() + CODE_EXPIRY_TIME, attempts: 0 });

        await sendVerificationEmail(email, code);
        console.log(`📧 تم إرسال رمز التحقق إلى ${email}: ${code}`);

        res.json({ message: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني', success: true });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'حدث خطأ أثناء إرسال الرمز', error: error.message });
    }
});

// API endpoint للتحقق من الرمز
app.post('/api/verify-code', (req, res) => {
    try {
        const { email, code } = req.body;
        if (!email || !code) return res.status(400).json({ message: 'البريد الإلكتروني والرمز مطلوبان' });

        const storedData = verificationCodes.get(email);
        if (!storedData) return res.status(400).json({ message: 'لم يتم طلب رمز تحقق لهذا البريد الإلكتروني' });
        if (Date.now() > storedData.expiryTime) {
            verificationCodes.delete(email);
            return res.status(400).json({ message: 'انتهت صلاحية الرمز' });
        }

        storedData.attempts++;
        if (storedData.attempts > 5) {
            verificationCodes.delete(email);
            return res.status(400).json({ message: 'تجاوزت عدد المحاولات المسموحة' });
        }

        if (code !== storedData.code) {
            return res.status(400).json({ message: `الرمز غير صحيح. لديك ${6 - storedData.attempts} محاولات أخرى` });
        }

        verificationCodes.delete(email);
        console.log(`✅ تم التحقق من البريد الإلكتروني: ${email}`);
        res.json({ message: 'تم التحقق من حسابك بنجاح!', success: true, email });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'حدث خطأ أثناء التحقق من الرمز', error: error.message });
    }
});

// تنظيف الأكواد المنتهية الصلاحية كل ساعة
setInterval(() => {
    const now = Date.now();
    for (const [email, data] of verificationCodes.entries()) {
        if (now > data.expiryTime) verificationCodes.delete(email);
    }
}, 60 * 60 * 1000);

// بدء الخادم
app.listen(PORT, () => {
    console.log(`🚀 السيرفر يعمل على البورت ${PORT}`);
});
