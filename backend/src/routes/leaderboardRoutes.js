const express = require('express');
const router = express.Router();
const { getLeaderboard, getContestRatingLeaderboard } = require('../controllers/leaderboardController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const { leaderboardLimiter } = require('../middleware/rateLimiter');

// Problem-solving Leaderboard
router.get('/', leaderboardLimiter, optionalAuth, getLeaderboard);

// Milestone 6: Contest Rating Leaderboard (LeetCode-style)
router.get('/contest', leaderboardLimiter, optionalAuth, getContestRatingLeaderboard);

module.exports = router;
