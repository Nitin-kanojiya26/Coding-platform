const express = require('express');
const router = express.Router();

const {
    createProblem,
    getAllProblems,
    getProblemBySlug,
    getProblemById,
    updateProblem,
    deleteProblem,
    getComments,
    addComment,
    runSampleTestCases
} = require('../controllers/problemController');

const { protect } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');
const {
  problemsListLimiter,
  problemDetailsLimiter,
  runCodeLimiter
} = require('../middleware/rateLimiter');

// Public + Create
router
    .route('/')
    .get(problemsListLimiter, getAllProblems)
    .post(protect, isAdmin, createProblem);

// Admin (use MongoDB _id)
router
    .route('/id/:id')
    .get(problemDetailsLimiter, protect, isAdmin, getProblemById)
    .put(protect, isAdmin, updateProblem)
    .delete(protect, isAdmin, deleteProblem);

// Public (use slug)
router
    .route('/:slug')
    .get(problemDetailsLimiter, getProblemBySlug);

router
  .route('/:id/comments')
  .get(getComments)                    
  .post(protect, addComment);     
  
router.post('/:id/run', runCodeLimiter, protect, runSampleTestCases); 
module.exports = router;