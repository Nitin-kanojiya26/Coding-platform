const User = require('../models/Users');
const OTP = require('../models/OTP');
const jwt = require('jsonwebtoken');
const Login = require('../models/Login');
const redis = require('../config/redis');
const { sendOTPEmail } = require('../services/emailService');

// Helper to sign JWT tokens
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// @desc    Step 1: Register request & Send OTP
// @route   POST /api/auth/register
exports.registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Please add all required fields' });
        }

        const userExists = await User.findOne({ email: email.toLowerCase() });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        const generatedOtp = generateOTP();

        const otpCacheKey = `otp:register:${email.toLowerCase()}`;
        const otpData = {
            name,
            email: email.toLowerCase(),
            password,
            otp: generatedOtp,
            purpose: 'register'
        };  
        // Store in Redis for 5 minutes (auto-expires without DB bloat)
        await redis.setex(otpCacheKey, 300, JSON.stringify(otpData));
        
        try {
            await sendOTPEmail(email, generatedOtp, 'Codexium - Verify Your Email Account');
        } catch (emailError) {
            console.error(`⚠️ [EmailService] Could not send email to ${email}:`, emailError.message);
            if (process.env.NODE_ENV !== 'production') {
                return res.status(200).json({
                    status: 'success',
                    message: 'Verification code generated! (Logged to backend terminal for local dev).'
                });
            }
            return res.status(503).json({
                message: 'Unable to deliver verification email at this moment. Please try again shortly.'
            });
        }

        res.status(200).json({
            status: 'success',
            message: 'A security OTP verification code has been sent to your email.'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Step 2: Match Registration OTP & Complete Account Creation
// @route   POST /api/auth/verify-otp
exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: 'Please provide email and OTP code' });
        }
        const otpCacheKey = `otp:register:${email.toLowerCase()}`;
        const cachedOtpData = await redis.get(otpCacheKey);
        if(!cachedOtpData){
            return res.status(400).json({ message: 'Invalid or expired OTP code' });
        }
        const otpData = JSON.parse(cachedOtpData);
        if (otpData.otp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP code' });
        }
        const permanentUser = await User.create({
            name: otpData.name,
            email: otpData.email,
            password: otpData.password
        });

        await redis.del(otpCacheKey);

        res.status(201).json({
            status: 'success',
            token: generateToken(permanentUser._id),
            user: { id: permanentUser._id, name: permanentUser.name, email: permanentUser.email, role: permanentUser.role }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Login with email and password
// @route   POST /api/auth/login
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        if (user.isBanned) {
            return res.status(403).json({ 
            message: 'Your account has been banned. Reason: ' + user.banReason 
        });
    }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        await Login.create({ user: user._id });

        res.status(200).json({
            status: 'success',
            token: generateToken(user._id),
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get logged-in user profile
// @route   GET /api/auth/me
exports.getMe = async (req, res) => {
    res.status(200).json({
        status: 'success',
        user: req.user
    });
};

// @desc    Request Password Reset OTP via Email
// @route   POST /api/auth/forgot-password
exports.requestPasswordResetOTP = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Please provide your account email' });
        }

        const normalizedEmail = email.toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(404).json({ message: 'No user account found with this email' });
        }

        const resetOtpCode = generateOTP();

        await OTP.findOneAndDelete({ email: normalizedEmail });

        await OTP.create({
            email: normalizedEmail,
            otp: resetOtpCode,
            purpose: 'forgot-password'
        });

        try {
            await sendOTPEmail(email, resetOtpCode, 'CodeArena - Reset Your Password');
        } catch (emailError) {
            console.error(`⚠️ [EmailService] Could not send reset email to ${email}:`, emailError.message);
            if (process.env.NODE_ENV !== 'production') {
                return res.status(200).json({
                    status: 'success',
                    message: 'Password reset code generated! (Logged to backend terminal for local dev).'
                });
            }
            return res.status(503).json({
                message: 'Unable to deliver reset email at this moment. Please try again shortly.'
            });
        }

        res.status(200).json({
            status: 'success',
            message: 'A password reset OTP code has been sent to your email.'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify Password Reset OTP & Change Password
// @route   POST /api/auth/reset-password
exports.resetPasswordWithOTP = async (req, res) => {
    try {
        const { email, otp, password } = req.body;

        if (!email || !otp || !password) {
            return res.status(400).json({ message: 'Please provide email, OTP code, and new password' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        const normalizedEmail = email.toLowerCase();
        const activeOtpRecord = await OTP.findOne({ email: normalizedEmail, purpose: 'forgot-password' });
        if (!activeOtpRecord || activeOtpRecord.otp !== otp) {
            return res.status(400).json({ message: 'Invalid or expired verification code' });
        }

        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            await OTP.deleteOne({ _id: activeOtpRecord._id });
            return res.status(404).json({ message: 'No user account found with this email' });
        }

        user.password = password;
        await user.save();
        await OTP.deleteOne({ _id: activeOtpRecord._id });

        res.status(200).json({
            status: 'success',
            message: 'Password changed successfully. You can now log in.'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
