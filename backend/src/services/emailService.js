// backend/src/services/emailService.js
const axios = require('axios');
const nodemailer = require('nodemailer');

/**
 * Dispatches verification OTP code.
 * 1. Priority 1: Resend REST API (HTTPS Port 443) if RESEND_API_KEY is present.
 * 2. Priority 2: Nodemailer SMTP using EMAIL_USER, EMAIL_PASS, and EMAIL_PORT (465, 587, or 2525).
 * 3. Priority 3: Safe terminal logging so testing is never blocked.
 */
const sendOTPEmail = async (email, otp, subject = 'Codexium - Your Verification Code') => {
  // Always log OTP in terminal / logs for instant verification
  console.log(`🔑 [Auth OTP] Code for ${email}: ${otp}`);

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Codexium Verification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', Helvetica, Arial, sans-serif; color: #ffffff;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #000000; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; background-color: #0a0a0a; border: 1px solid #222222; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="padding: 24px 32px; border-bottom: 1px solid #1a1a1a;">
              <table border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding-left: 0; font-size: 16px; font-weight: 800; letter-spacing: -0.3px; color: #ffffff;">
                    CODEXIUM
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #ffffff;">Verify Your Account</h1>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #8a8a8a;">
                Use the following one-time verification code to complete your verification on Codexium:
              </p>
              <div style="text-align: center; margin: 28px 0;">
                <span style="display: inline-block; font-family: 'JetBrains Mono', Consolas, monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #ffa116; background-color: #141414; padding: 12px 28px; border-radius: 6px; border: 1px solid #333333;">
                  ${otp}
                </span>
              </div>
              <p style="margin: 24px 0 0 0; font-size: 12px; color: #666666; line-height: 1.5;">
                This code expires in 5 minutes. If you did not request this verification, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px; background-color: #000000; border-top: 1px solid #1a1a1a; text-align: center; font-size: 11px; color: #555555;">
              &copy; ${new Date().getFullYear()} Codexium. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  // 1. If RESEND_API_KEY is configured, dispatch via HTTPS Port 443
  if (process.env.RESEND_API_KEY) {
    try {
      const fromSender = process.env.EMAIL_FROM || 'Codexium <onboarding@resend.dev>';
      const res = await axios.post(
        'https://api.resend.com/emails',
        {
          from: fromSender,
          to: [email],
          subject,
          html: htmlContent,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 6000,
        }
      );
      console.log(`✅ [EmailService] Email dispatched via Resend API (ID: ${res.data?.id})`);
      return res.data;
    } catch (apiErr) {
      console.error(`⚠️ [EmailService] Resend API error:`, apiErr.response?.data || apiErr.message);
    }
  }

  // 2. If Resend is not present, dispatch via Nodemailer SMTP!
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    const port = Number(process.env.EMAIL_PORT) || 2525;
    const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
    const isSecure = port === 465;

    try {
      const cleanPass = process.env.EMAIL_PASS.replace(/\s+/g, '');
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: isSecure,
        auth: {
          user: process.env.EMAIL_USER,
          pass: cleanPass,
        },
        connectionTimeout: 8000,
        greetingTimeout: 4000,
        socketTimeout: 10000,
        tls: { rejectUnauthorized: false },
      });

      const info = await transporter.sendMail({
        from: `"Codexium" <${process.env.EMAIL_USER}>`,
        to: email,
        subject,
        html: htmlContent,
      });

      console.log(`✅ [EmailService] Real email sent via SMTP (${host}:${port}) - MessageID: ${info.messageId}`);
      return info;
    } catch (smtpErr) {
      console.warn(`⚠️ [EmailService] SMTP delivery failed on port ${port}: ${smtpErr.message}`);
    }
  }

  // 3. Fallback: OTP is already safely saved in Redis & logged to console above
  return { success: true, localOnly: true };
};

module.exports = { sendOTPEmail };
