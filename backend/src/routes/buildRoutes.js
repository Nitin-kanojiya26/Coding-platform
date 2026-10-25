const express = require('express');
const router = express.Router();
const {
  getBuildProblems,
  getBuildProblemBySlug,
  submitBuildSolution,
  getBuildSubmissionById,
  getUserBuildSubmissions,
  createBuildProblem,
  updateBuildProblem,
} = require('../controllers/buildController');

const { protect } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');
const { buildSubmitLimiter } = require('../middleware/rateLimiter');

// --- Problem Routes ---
// List problems (no tests)
router.get('/problems', getBuildProblems);

// Admin problem creation
router.post('/problems', protect, isAdmin, createBuildProblem);

// Get single problem by slug (statement, starterFiles, visibleTests)
router.get('/problems/:slug', getBuildProblemBySlug);

// Admin problem update
router.put('/problems/:slug', protect, isAdmin, updateBuildProblem);

// --- Submission Routes ---
// Submit code files (5/min per user rate limit)
router.post('/submit', protect, buildSubmitLimiter, submitBuildSolution);

// Get user's submission history (?slug=)
router.get('/submissions', protect, getUserBuildSubmissions);

// Get single submission by id (status + results, owner only)
router.get('/submissions/:id', protect, getBuildSubmissionById);

module.exports = router;
