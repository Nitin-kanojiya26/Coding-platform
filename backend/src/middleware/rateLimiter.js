const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const redisClient = require('../config/redis');

// Helper function to create limiters backed by Redis with isolated keys
const createLimiter = (prefix, windowMs, max, message) => {
  const limiter = rateLimit({
    windowMs,
    max,
    message: { message: message || 'Too many requests, please try again later.' },
    standardHeaders: true, 
    legacyHeaders: false, 
    store: new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
      prefix: `rl:${prefix}:`,
    }),
  });

  // If DISABLE_RATE_LIMIT=true (for capacity / benchmark tests), bypass rate limiter completely
  return (req, res, next) => {
    if (process.env.DISABLE_RATE_LIMIT === 'true') {
      return next();
    }
    return limiter(req, res, next);
  };
};

// Auth Limiters (isolated keys)
const loginLimiter = createLimiter('login', 15 * 60 * 1000, 10, 'Too many login attempts. Please try again after 15 minutes.');
const registerLimiter = createLimiter('register', 60 * 60 * 1000, 10, 'Too many accounts created from this IP. Please try again after an hour.');
const otpSendLimiter = createLimiter('otp_send', 10 * 60 * 1000, 10, 'Too many OTP requests. Please try again after 10 minutes.');
const forgotPasswordLimiter = createLimiter('forgot_pw', 15 * 60 * 1000, 10, 'Too many password reset requests. Please try again after 15 minutes.');
const otpVerifyLimiter = createLimiter('otp_verify', 10 * 60 * 1000, 15, 'Too many OTP verification attempts. Please try again after 10 minutes.');

// Problems Limiters (generous for dashboard and benchmarking)
const problemsListLimiter = createLimiter('problems_list', 60 * 1000, 500);
const problemDetailsLimiter = createLimiter('problem_details', 60 * 1000, 2000);

// Submissions / Code Execution Limiters
const submitCodeLimiter = createLimiter('submit_code', 60 * 1000, 60, 'Too many code submissions. Please try again after a minute.');
const runCodeLimiter = createLimiter('run_code', 60 * 1000, 100, 'Too many code runs. Please try again after a minute.');

// General Limiters
const leaderboardLimiter = createLimiter('leaderboard', 60 * 1000, 1000);
const bookmarksLimiter = createLimiter('bookmarks', 60 * 1000, 1000);
const historyLimiter = createLimiter('history', 60 * 1000, 1000);
const profileUpdateLimiter = createLimiter('profile_update', 60 * 1000, 200, 'Too many profile updates. Please try again after a minute.');

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
