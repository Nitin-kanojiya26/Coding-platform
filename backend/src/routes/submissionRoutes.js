const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');
const {
  createSubmission,
  getMySubmissions,
  getProblemSubmissions,
  getSubmissionById,
} = require('../controllers/submissionController');

// All routes require authentication
router.use(protect);

// POST /api/submissions - create a new submission
router.route('/').post(createSubmission);

// GET /api/submissions/my - get current user's submissions
router.route('/my').get(getMySubmissions);

// GET /api/submissions/problem/:problemId - get submissions for a problem
router.route('/problem/:problemId').get(getProblemSubmissions);

// GET /api/submissions/:id - get a single submission (owner or admin)
router.route('/:id').get(getSubmissionById);

module.exports = router;