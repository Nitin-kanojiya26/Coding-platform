const express = require('express');
const router = express.Router();
const { getLeaderboard } = require('../controllers/leaderboardController');
const { protect } = require('../middleware/authMiddleware');
const { leaderboardLimiter } = require('../middleware/rateLimiter');

// Public (anyone can view)
// router.get('/', getLeaderboard);

router.get('/', leaderboardLimiter, protect, getLeaderboard);

module.exports = router;