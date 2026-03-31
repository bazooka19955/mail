const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== CONFIG ====================
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// Rate limiting - Pentest safe
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Rate limited - too many requests'
});

// In-memory store (production: Redis)
const verificationCodes = new Map();

// SMTP2GO - Authorized pentest config
const transporter = nodemailer.createTransport({
  host: 'mail-eu.smtp2go.com',
  port: 2525,
  secure: false,
  auth: {
    user: 'hussein1995@hussein.my',
    pass: 'Aa19955Aa@@'
  },
  tls: { rejectUnauthorized: false }
});

// ==================== ENDPOINTS ====================

// Health check - Railway requirement
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'email-verification-pentest',
    uptime: process.uptime().toFixed(2) + 's'
  });
});

// Request 6-digit verification code
app.post('/api/request-code', limiter, async (req, res) => {
  try {
    const { email } = req.body;

    // Input validation
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ 
        error: 'Valid email required',
        code: 'INVALID_EMAIL'
      });
    }

    // Generate secure 6-digit code
    const code = crypto.randomInt(100000, 999999).toString();
    const expiry = Date.now() + 300000; // 5 minutes

    // Store code
    verificationCodes.set(email.toLowerCase(), {
      code,
      attempts: 0,
      expiry,
      verified: false,
      created: Date.now()
    });

    console.log(`[PENTEST] Code ${code} generated for ${email}`);

    // Send verification email
    const mailResult = await transporter.sendMail({
      from: '"Pentest Verification" <hussein1995@hussein.my>',
      to: email,
      subject: 'Verification Code - Authorized Pentest',
      html: `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>كود التحقق</title>
</head>
<body style="font-family:'Segoe UI',Tahoma,Arial,sans-serif;margin:0;padding:40px;background:#f8f9fa">
  <div style="max-width:500px;margin:0 auto;background:white;border-radius:16px;padding:40px;box-shadow:0 10px 30px rgba(0,0,0,0.1)">
    <h2 style="color:#1e3a8a;text-align:center;margin-bottom:30px;font-size:28px">
      📧 كود التحقق
    </h2>
    <div style="background:#eff6ff;border-radius:12px;padding:30px;text-align:center;margin:20px 0;border:2px solid #3b82f6">
      <div style="font-size:52px;font-weight:800;color:#1e40af;letter-spacing:12px;margin-bottom:20px;font-family:monospace">
        ${code}
      </div>
      <p style="color:#374151;font-size:16px;margin:0">كود تسجيل الحساب - صالح لمدة <strong>5 دقائق</strong></p>
    </div>
    <div style="text-align:center">
      <p style="color:#6b7280;font-size:14px">
        تم إرسال هذا الكود كجزء من اختبار أمان مصرح به
      </p>
    </div>
  </div>
</body>
</html>
    `});

    console.log(`[PENTEST] Email sent to ${email} - MessageID: ${mailResult.messageId}`);

    res.json({
      success: true,
      message: 'تم إرسال كود التحقق بنجاح',
      email: email,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[PENTEST] Email error:', error.message);
    res.status(500).json({
      error: 'فشل في إرسال البريد الإلكتروني',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
});

// Verify code
app.post('/api/verify-code', (req, res) => {
  try {
    const { email, code } = req.body;
    const key = email.toLowerCase();
    const record = verificationCodes.get(key);

    if (!record) {
      return res.status(400).json({ 
        error: 'لا يوجد كود تحقق لهذا البريد',
        code: 'NO_CODE_FOUND'
      });
    }

    // Check expiry
    if (Date.now() > record.expiry) {
      verificationCodes.delete(key);
      return res.status(400).json({ 
        error: 'انتهت صلاحية الكود التحقق',
        code: 'CODE_EXPIRED'
      });
    }

    // Check attempts
    if (record.attempts >= 3) {
      verificationCodes.delete(key);
      return res.status(400).json({ 
        error: 'تم تجاوز عدد المحاولات المسموح بها',
        code: 'TOO_MANY_ATTEMPTS'
      });
    }

    // Verify code
    if (record.code !== code) {
      record.attempts++;
      return res.status(400).json({ 
        error: 'الكود التحقق غير صحيح',
        code: 'INVALID_CODE',
        attemptsLeft: 3 - record.attempts
      });
    }

    // Success
    record.verified = true;
    const token = crypto.randomBytes(32).toString('hex');

    console.log(`[PENTEST] ${email} verified successfully`);

    res.json({
      success: true,
      message: 'تم التحقق بنجاح!',
      token: token,
      expiresIn: 3600000 // 1 hour
    });

  } catch (error) {
    console.error('[PENTEST] Verify error:', error);
    res.status(500).json({ error: 'خطأ في التحقق' });
  }
});

// Root - serve HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Catch-all 404
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    available: ['/', '/health', '/api/request-code
