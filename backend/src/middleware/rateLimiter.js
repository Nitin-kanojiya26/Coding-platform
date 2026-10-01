const rateLimit = require('express-rate-limit');

// Helper function to create limiters
const createLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { message: message || 'Too many requests, please try again later.' },
    standardHeaders: true, 
    legacyHeaders: false, 
  });
};

// Auth Limiters
const loginLimiter = createLimiter(15 * 60 * 1000, 5, 'Too many login attempts. Please try again after 15 minutes.');
const registerLimiter = createLimiter(60 * 60 * 1000, 5, 'Too many accounts created from this IP. Please try again after an hour.');
const otpSendLimiter = createLimiter(10 * 60 * 1000, 3, 'Too many OTP requests. Please try again after 10 minutes.');
const forgotPasswordLimiter = createLimiter(15 * 60 * 1000, 3, 'Too many password reset requests. Please try again after 15 minutes.');
const otpVerifyLimiter = createLimiter(10 * 60 * 1000, 5, 'Too many OTP verification attempts. Please try again after 10 minutes.');

// Problems Limiters
const problemsListLimiter = createLimiter(60 * 1000, 100);
const problemDetailsLimiter = createLimiter(60 * 1000, 100);

// Submissions / Code Execution Limiters
const submitCodeLimiter = createLimiter(60 * 1000, 20, 'Too many code submissions. Please try again after a minute.');
const runCodeLimiter = createLimiter(60 * 1000, 30, 'Too many code runs. Please try again after a minute.');

// General Limiters
const leaderboardLimiter = createLimiter(60 * 1000, 1000);
const bookmarksLimiter = createLimiter(60 * 1000, 1000);
const historyLimiter = createLimiter(60 * 1000, 1000);
const profileUpdateLimiter = createLimiter(60 * 1000, 100, 'Too many profile updates. Please try again after a minute.');

module.exports = {
  loginLimiter,
  registerLimiter,
  otpSendLimiter,
  forgotPasswordLimiter,
  otpVerifyLimiter,
  problemsListLimiter,
  problemDetailsLimiter,
  submitCodeLimiter,
  runCodeLimiter,
  leaderboardLimiter,
  bookmarksLimiter,
  historyLimiter,
  profileUpdateLimiter,
};
