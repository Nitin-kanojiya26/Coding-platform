const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');
const {
  createSubmission,
  getMySubmissions,
  getProblemSubmissions,
  getSubmissionById,
  getProblemStats,
} = require('../controllers/submissionController');
const {
  submitCodeLimiter,
  historyLimiter
} = require('../middleware/rateLimiter');

// Internal benchmark control route (No auth required)
router.post('/test/worker-concurrency', (req, res) => {
  const { setWorkerConcurrency, getWorkerConcurrency } = require('../queues/submissionQueue');
  const { concurrency } = req.body || {};
  if (concurrency !== undefined) {
    const updated = setWorkerConcurrency(concurrency);
    return res.json({ success: true, concurrency: updated });
  }
  return res.json({ success: true, concurrency: getWorkerConcurrency() });
});

router.get('/test/queue-metrics', async (req, res) => {
  const { submissionQueue, getWorkerConcurrency, getCompletedJobCount } = require('../queues/submissionQueue');
  try {
    const counts = await submissionQueue.getJobCounts('completed', 'failed', 'active', 'waiting');
    return res.json({
      success: true,
      workerConcurrency: getWorkerConcurrency(),
      completedJobsTotal: getCompletedJobCount(),
      queueCounts: counts,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/test/reset-queue-metrics', (req, res) => {
  const { resetCompletedJobCount } = require('../queues/submissionQueue');
  resetCompletedJobCount();
  return res.json({ success: true, completedJobsTotal: 0 });
});

// All routes below require authentication
router.use(protect);

// POST /api/submissions - create a new submission
router.route('/').post(submitCodeLimiter, createSubmission);

// GET /api/submissions/my - get current user's submissions
router.route('/my').get(historyLimiter, getMySubmissions);

// GET /api/submissions/problem/:problemId/stats - get aggregate submission telemetry
router.route('/problem/:problemId/stats').get(getProblemStats);

// GET /api/submissions/problem/:problemId - get submissions for a problem
router.route('/problem/:problemId').get(getProblemSubmissions);

// GET /api/submissions/:id - get a single submission (owner or admin)
router.route('/:id').get(getSubmissionById);

module.exports = router;