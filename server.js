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
    secure: false, // استخدام TLS بدلاً من SSL
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
        from: `"تسجيل الحساب" <noreply@example.com>`,
        to: email,
        subject: 'رمز التحقق من حسابك - 6 أرقام فقط',
        html: `
            <!DOCTYPE html>
            <html dir="rtl">
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; direction: rtl; }
                    .container { max-width: 500px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #667eea; color: white; padding: 20px; border-radius: 5px; text-align: center; }
                    .content { padding: 20px; text-align: center; }
                    .code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; margin: 20px 0; }
                    .footer { color: #666; font-size: 12px; margin-top: 20px; text-align: center; }
                    .warning { color: #d32f2f; font-size: 12px; margin-top: 15px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔐 رمز التحقق من حسابك</h1>
                    </div>
                    <div class="content">
                        <p>مرحباً! تم طلب تسجيل حساب جديد لهذا البريد الإلكتروني.</p>
                        <p>استخدم الرمز التالي للتحقق من حسابك:</p>
                        <div class="code">${code}</div>
                        <p>هذا الرمز صالح لمدة <strong>5 دقائق</strong> فقط.</p>
                        <div class="warning">
                            ⚠️ إذا لم تطلب هذا الرمز، يرجى تجاهل هذه الرسالة.
                        </div>
                    </div>
                    <div class="footer">
                        <p>© 2026 جميع الحقوق محفوظة</p>
                    </div>
                </div>
            </body>
            </html>
        `
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

// API endpoint لإرسال رمز التحقق
app.post('/api/send-verification-code', async (req, res) => {
    try {
        const { email } = req.body;

        // التحقق من صحة البريد الإلكتروني
        if (!email || !isValidEmail(email)) {
            return res.status(400).json({ 
                message: 'البريد الإلكتروني غير صحيح' 
            });
        }

        // توليد رمز التحقق
        const code = generateVerificationCode();
        
        // تخزين الرمز مع وقت انتهاء الصلاحية
        verificationCodes.set(email, {
            code: code,
            expiryTime: Date.now() + CODE_EXPIRY_TIME,
            attempts: 0
        });

        // إرسال البريد الإلكتروني
        await sendVerificationEmail(email, code);

        console.log(`📧 تم إرسال رمز التحقق إلى ${email}: ${code}`);

        res.json({ 
            message: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني',
            success: true 
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            message: 'حدث خطأ أثناء إرسال الرمز. تأكد من صحة البريد الإلكتروني والاتصال بالإنترنت',
            error: error.message
        });
    }
});

// API endpoint للتحقق من الرمز
app.post('/api/verify-code', (req, res) => {
    try {
        const { email, code } = req.body;

        // التحقق من المدخلات
        if (!email || !code) {
            return res.status(400).json({ 
                message: 'البريد الإلكتروني والرمز مطلوبان' 
            });
        }

        // التحقق من وجود الرمز
        const storedData = verificationCodes.get(email);
        if (!storedData) {
            return res.status(400).json({ 
                message: 'لم يتم طلب رمز تحقق لهذا البريد الإلكتروني. يرجى طلب رمز جديد' 
            });
        }

        // التحقق من انتهاء صلاحية الرمز
        if (Date.now() > storedData.expiryTime) {
            verificationCodes.delete(email);
            return res.status(400).json({ 
                message: 'انتهت صلاحية الرمز. يرجى طلب رمز جديد' 
            });
        }

        // التحقق من عدد محاولات الإدخال
        storedData.attempts++;
        if (storedData.attempts > 5) {
            verificationCodes.delete(email);
            return res.status(400).json({ 
                message: 'تجاوزت عدد المحاولات المسموحة. يرجى طلب رمز جديد' 
            });
        }

        // التحقق من صحة الرمز
        if (code !== storedData.code) {
            return res.status(400).json({ 
                message: `الرمز غير صحيح. لديك ${6 - storedData.attempts} محاولات أخرى` 
            });
        }

        // حذف الرمز بعد التحقق الناجح
        verificationCodes.delete(email);

        console.log(`✅ تم التحقق بنجاح من البريد الإلكتروني: ${email}`);

        res.json({ 
            message: 'تم التحقق من حسابك بنجاح!',
            success: true,
            email: email
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            message: 'حدث خطأ أثناء التحقق من الرمز',
            error: error.message
        });
    }
});

// دالة التحقق من صحة البريد الإلكتروني
function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

// تنظيف الأكواد المنتهية الصلاحية كل ساعة
setInterval(() => {
    const now = Date.now();
    let count = 0;
    
    for (const [email, data] of verificationCodes.entries()) {
        if (now > data.expiryTime) {
            verificationCodes.delete(email);
            count++;
        }
    }
    
    if (count > 0) {
        console.log(`🧹 تم حذف ${count} رموز منتهية الصلاحية`);
    }
}, 60 * 60 * 1000); // كل ساعة

// معالج الأخطاء العامة
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
        message: 'حدث خطأ غير متوقع في الخادم',
        error: err.message
    });
});

// بدء الخادم
app.listen(PORT, () => {
    console.log(`
    ╔════════════════════════════════════════╗
    ║   خادم التحقق من البريد الإلكتروني   ║
    ╠════════════════════════════════════════╣
    ║   🚀 الخادم يعمل على البورت ${PORT}      ║
    ║   📧 البريد الإلكتروني جاهز للإرسال   ║
    ║   🔗 http://localhost:${PORT}          ║
    ╚════════════════════════════════════════╝
    `);
});
