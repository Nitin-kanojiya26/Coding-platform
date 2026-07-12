// backend/src/routes/authRoutes.js
const express = require('express');
const router = express.Router();

const { 
    registerUser, 
    verifyOTP, 
    loginUser,
    getMe,
    requestPasswordResetOTP,
    resetPasswordWithOTP
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// 2. Map registration flows
router.post('/register', registerUser);
router.post('/verify-otp', verifyOTP);

// 3. Map password login flow
router.post('/login', loginUser);
router.get('/me', protect, getMe);

// 4. Map forgot-password OTP flows
router.post('/forgot-password', requestPasswordResetOTP);
router.post('/reset-password', resetPasswordWithOTP);

// 4. Export the router so src/server.js can use it
module.exports = router;
