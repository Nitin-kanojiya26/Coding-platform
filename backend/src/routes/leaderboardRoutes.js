const express = require('express');
const router = express.Router();
const { getLeaderboard } = require('../controllers/leaderboardController');
const { protect } = require('../middleware/authMiddleware');

// Public (anyone can view)
// router.get('/', getLeaderboard);

router.get('/', protect, getLeaderboard);

module.exports = router;