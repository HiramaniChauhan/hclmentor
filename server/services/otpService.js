/**
 * OTP Service — uses Brevo (Sendinblue) HTTP API
 * Works over HTTPS port 443. Free plan: 300 emails/day to ANY recipient.
 * Setup: Sign up at brevo.com → get API key → verify sender email once.
 */

const axios = require('axios');

// ── In-memory OTP store ───────────────────────────────────────────────────────
const otpStore = new Map();

// ── Generate a 6-digit OTP ────────────────────────────────────────────────────
function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ── Send OTP via Brevo transactional email API ────────────────────────────────
async function sendOTP(email, purpose = 'signup') {
  const code = generateOTP();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  otpStore.set(`${email}:${purpose}`, { code, expiresAt });

  const subject = purpose === 'reset'
    ? '🔑 Your HCL Institute Password Reset Code'
    : '🔐 Your HCL Institute Signup Verification Code';

  const htmlContent = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:30px;
                background:#0f0e17;border-radius:16px;color:#fff">
      <h2 style="color:#8b5cf6;margin:0 0 8px">📚 HCL Institute</h2>
      <p style="color:#9ca3af;margin:0 0 20px">
        ${purpose === 'reset' ? 'Password reset requested' : 'Verify your email to complete signup'}
      </p>
      <div style="background:#1a1825;border:1px solid rgba(139,92,246,0.3);
                  border-radius:12px;padding:24px;text-align:center">
        <p style="color:#9ca3af;margin:0 0 8px;font-size:14px">
          Your ${purpose === 'reset' ? 'reset' : 'verification'} code is:
        </p>
        <p style="font-size:36px;font-weight:bold;color:#8b5cf6;
                  letter-spacing:8px;margin:0">${code}</p>
      </div>
      <p style="color:#6b7280;font-size:12px;margin:20px 0 0;text-align:center">
        This code expires in 5 minutes. Do not share it.
      </p>
    </div>`;

  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  if (!senderEmail) throw new Error('BREVO_SENDER_EMAIL not set in .env');

  const response = await axios.post(
    'https://api.brevo.com/v3/smtp/email',
    {
      sender: { name: 'HCL Institute', email: senderEmail },
      to: [{ email }],
      subject,
      htmlContent,
    },
    {
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );

  console.log(`📧 OTP emailed to ${email} for ${purpose}: ${code}`, response.data?.messageId || '');
}

// ── Verify OTP ────────────────────────────────────────────────────────────────
function verifyOTP(email, code, purpose = 'signup') {
  const key = `${email}:${purpose}`;
  const entry = otpStore.get(key);

  if (!entry) return { valid: false, error: 'No OTP found. Please request a new one.' };
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(key);
    return { valid: false, error: 'OTP has expired. Please request a new one.' };
  }
  if (entry.code !== code) return { valid: false, error: 'Incorrect OTP. Please try again.' };

  otpStore.delete(key);
  return { valid: true };
}

module.exports = { sendOTP, verifyOTP };
