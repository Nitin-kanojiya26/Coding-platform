const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');
const {
  getUserProfile,
  getUserStats,
  getAttemptedProblems,
  getProblemSubmissionSummary,
  updateProfile,
  getRecentActivity,
  getBookmarks,
  removeBookmark,
  bookmarkProblem,
  getUserStreak,
  getLoginActivity,
  searchUsers,
  getUserPublicProfile,
  getUserStatsById,
  uploadAvatar
} = require('../controllers/userController');
const {
  profileUpdateLimiter,
  bookmarksLimiter,
  historyLimiter
} = require('../middleware/rateLimiter');

router.get('/profile', protect, getUserProfile);
router.get('/stats', protect, getUserStats);
router.get('/attempted', historyLimiter, protect, getAttemptedProblems);
router.get('/problems/summary', protect, getProblemSubmissionSummary);
router.put('/profile', profileUpdateLimiter, protect, updateProfile);
router.get('/activity', historyLimiter, protect, getRecentActivity);
router.post('/problems/:id/bookmark', bookmarksLimiter, protect, bookmarkProblem);
router.delete('/problems/:id/bookmark', bookmarksLimiter, protect, removeBookmark);
router.get('/bookmarks', bookmarksLimiter, protect, getBookmarks);
router.get('/login-activity', protect, getLoginActivity);
router.get('/streak', protect, getUserStreak);
router.post('/avatar', profileUpdateLimiter, protect, upload.single('avatar'), uploadAvatar);
router.get('/search', protect, searchUsers);

// Public profile & stats (by ID)
router.get('/:id/profile', protect, getUserPublicProfile);
router.get('/:id/stats', protect, getUserStatsById);
module.exports = router;