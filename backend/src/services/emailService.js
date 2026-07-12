// backend/src/services/emailService.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendOTPEmail = async (email, otp, subject = 'CodeArena - Your OTP Verification Code') => {
    const mailOptions = {
        from: `"CodeArena" <${process.env.EMAIL_USER}>`,
        to: email,
        subject,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h2 style="color: #4A90E2; text-align: center;">Welcome to CodeArena</h2>
                <p>Please use the following One-Time Password (OTP) to complete your verification process:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #333; background: #f4f4f4; padding: 10px 20px; border-radius: 4px; border: 1px dashed #ccc;">
                        ${otp}
                    </span>
                </div>
                <p style="color: #666; font-size: 14px;">This OTP is valid for 10 minutes. Do not share it with anyone.</p>
            </div>
        `
    };

    return await transporter.sendMail(mailOptions);
};

module.exports = { sendOTPEmail };
