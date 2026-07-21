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

router.get('/profile', protect, getUserProfile);
router.get('/stats', protect, getUserStats);
router.get('/attempted', protect, getAttemptedProblems);
router.get('/problems/summary', protect, getProblemSubmissionSummary);
router.put('/profile', protect, updateProfile);
router.get('/activity', protect, getRecentActivity);
router.post('/problems/:id/bookmark', protect, bookmarkProblem);
router.delete('/problems/:id/bookmark', protect, removeBookmark);
router.get('/bookmarks', protect, getBookmarks);
router.get('/login-activity', protect, getLoginActivity);
router.get('/streak', protect, getUserStreak);
router.post('/avatar', protect, upload.single('avatar'), uploadAvatar);
router.get('/search', protect, searchUsers);

// Public profile & stats (by ID)
router.get('/:id/profile', protect, getUserPublicProfile);
router.get('/:id/stats', protect, getUserStatsById);
module.exports = router;