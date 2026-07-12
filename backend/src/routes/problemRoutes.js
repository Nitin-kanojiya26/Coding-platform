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

// Public + Create
router
    .route('/')
    .get(getAllProblems)
    .post(protect, isAdmin, createProblem);

// Admin (use MongoDB _id)
router
    .route('/id/:id')
    .get(protect, isAdmin, getProblemById)
    .put(protect, isAdmin, updateProblem)
    .delete(protect, isAdmin, deleteProblem);

// Public (use slug)
router
    .route('/:slug')
    .get(getProblemBySlug);

router
  .route('/:id/comments')
  .get(getComments)                    
  .post(protect, addComment);     
  
router.post('/:id/run', protect, runSampleTestCases); 
module.exports = router;