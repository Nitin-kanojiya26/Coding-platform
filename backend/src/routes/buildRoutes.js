const express = require('express');
const router = express.Router();
const {
  getBuildProblems,
  getBuildProblemBySlug,
  getAdminBuildProblemBySlug,
  runBuildSolution,
  submitBuildSolution,
  getBuildSubmissionById,
  getUserBuildSubmissions,
  createBuildProblem,
  updateBuildProblem,
  deleteBuildProblem,
  checkBuildEngineStatus,
} = require('../controllers/buildController');

const { protect, optionalAuth } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');
const { buildSubmitLimiter, buildRunLimiter } = require('../middleware/rateLimiter');

// --- Problem Routes ---
// Engine status health check
router.get('/engine-status', optionalAuth, checkBuildEngineStatus);

// List problems (no tests)
router.get('/problems', getBuildProblems);

// Admin problem creation
router.post('/problems', protect, isAdmin, createBuildProblem);

// Admin get problem by slug (includes hiddenTests)
router.get('/admin/problems/:slug', protect, isAdmin, getAdminBuildProblemBySlug);

// Get single problem by slug (statement, starterFiles, visibleTests)
router.get('/problems/:slug', getBuildProblemBySlug);

// Admin problem update
router.put('/problems/:slug', protect, isAdmin, updateBuildProblem);

// Admin problem delete
router.delete('/problems/:slug', protect, isAdmin, deleteBuildProblem);

// --- Run & Submission Routes ---
// Run code against visible test cases only (Fast Sandbox Mode)
router.post('/run', protect, buildRunLimiter, runBuildSolution);
router.post('/problems/:slug/run', protect, buildRunLimiter, runBuildSolution);

// Submit code files (5/min per user rate limit)
router.post('/submit', protect, buildSubmitLimiter, submitBuildSolution);
router.post('/problems/:slug/submit', protect, buildSubmitLimiter, submitBuildSolution);

// Get user's submission history (?slug=)
router.get('/submissions', protect, getUserBuildSubmissions);

// Get single submission by id (status + results, owner only)
router.get('/submissions/:id', protect, getBuildSubmissionById);

module.exports = router;
