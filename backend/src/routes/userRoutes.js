const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
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
  getLoginActivity
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
module.exports = router;