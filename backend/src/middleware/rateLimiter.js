const { rateLimit, MemoryStore } = require('express-rate-limit');
const redisClient = require('../config/redis');

/**
 * Resilient Rate Limit Store:
 * - When Redis is online: Uses atomic Redis commands for distributed rate limiting.
 * - When Redis is offline: Uses MemoryStore in-memory with zero errors, zero warnings, and zero downtime.
 */
class AdaptiveRateLimitStore {
  constructor(prefix) {
    this.prefix = prefix;
    this.memoryStore = new MemoryStore();
    this.windowMs = 60000;
  }

  init(options) {
    this.windowMs = options.windowMs || 60000;
    this.memoryStore.init(options);
  }

  async increment(key) {
    if (redisClient.isConnected) {
      try {
        const redisKey = `rl:${this.prefix}:${key}`;
        const multi = redisClient.multi();
        multi.incr(redisKey);
        multi.pttl(redisKey);
        const results = await multi.exec();

        if (results && results[0] && !results[0][0]) {
          const hits = Number(results[0][1]);
          let ttl = Number(results[1][1]);
          if (ttl < 0) {
            await redisClient.pexpire(redisKey, this.windowMs);
            ttl = this.windowMs;
          }
          const resetTime = new Date(Date.now() + Math.max(ttl, 0));
          return { totalHits: hits, resetTime };
        }
      } catch (_) {
        // Fall back seamlessly to memory store on any Redis error
      }
    }
    return await this.memoryStore.increment(key);
  }

  async decrement(key) {
    if (redisClient.isConnected) {
      try {
        const redisKey = `rl:${this.prefix}:${key}`;
        await redisClient.decr(redisKey);
      } catch (_) {}
    }
    if (typeof this.memoryStore.decrement === 'function') {
      return await this.memoryStore.decrement(key);
    }
  }

  async resetKey(key) {
    if (redisClient.isConnected) {
      try {
        await redisClient.del(`rl:${this.prefix}:${key}`);
      } catch (_) {}
    }
    return await this.memoryStore.resetKey(key);
  }

  async resetAll() {
    if (typeof this.memoryStore.resetAll === 'function') {
      return await this.memoryStore.resetAll();
    }
  }
}

// Helper function to create limiters with resilient adaptive store
const createLimiter = (prefix, windowMs, max, message, keyGenerator) => {
  const limiterOptions = {
    windowMs,
    max,
    message: { message: message || 'Too many requests, please try again later.' },
    standardHeaders: true, 
    legacyHeaders: false, 
    store: new AdaptiveRateLimitStore(prefix),
  };

  if (keyGenerator) {
    limiterOptions.keyGenerator = keyGenerator;
    limiterOptions.validate = { keyGeneratorIpFallback: false };
  }

  const limiter = rateLimit(limiterOptions);

  // If DISABLE_RATE_LIMIT=true (for capacity / benchmark tests), bypass rate limiter completely
  return (req, res, next) => {
    if (process.env.DISABLE_RATE_LIMIT === 'true') {
      return next();
    }
    return limiter(req, res, (err) => {
      if (err) {
        // Fallback: don't block user requests if rate-limiter store encounters an error
        return next();
      }
      next();
    });
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

// Submissions / Code Execution Limiters (Keyed by authenticated user ID with IP fallback)
const submitCodeLimiter = createLimiter(
  'submit_code',
  60 * 1000,
  60,
  'Too many code submissions. Please try again after a minute.',
  (req) => req.user?._id?.toString() || req.ip
);
const runCodeLimiter = createLimiter('run_code', 60 * 1000, 100, 'Too many code runs. Please try again after a minute.');

// General Limiters
const leaderboardLimiter = createLimiter('leaderboard', 60 * 1000, 1000);
const bookmarksLimiter = createLimiter('bookmarks', 60 * 1000, 1000);
const historyLimiter = createLimiter('history', 60 * 1000, 1000);
const profileUpdateLimiter = createLimiter('profile_update', 60 * 1000, 200, 'Too many profile updates. Please try again after a minute.');

// Build Mode Rate Limiter: 5 submissions per minute per user (prefix: rl:build_submit:)
const buildSubmitLimiter = createLimiter(
  'build_submit',
  60 * 1000,
  5,
  'Too many build submissions. Please wait before submitting again (limit: 5/min).',
  (req) => req.user?._id?.toString() || req.ip
);

// Build Mode Run Limiter: 15 sandbox runs per minute per user (prefix: rl:build_run:)
const buildRunLimiter = createLimiter(
  'build_run',
  60 * 1000,
  15,
  'Too many build run requests. Please wait a moment before running again (limit: 15/min).',
  (req) => req.user?._id?.toString() || req.ip
);

// Contest Join Code Limiter: 10 attempts per minute per user/IP (prefix: rl:contest_join:)
const contestJoinLimiter = createLimiter(
  'contest_join',
  60 * 1000,
  10,
  'Too many join code attempts. Please wait a minute before trying again (limit: 10/min).',
  (req) => req.user?._id?.toString() || req.ip
);

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
  buildSubmitLimiter,
  buildRunLimiter,
  contestJoinLimiter,
};

