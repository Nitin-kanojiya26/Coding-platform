const express = require('express');
const router = express.Router();
const {
  createContest,
  createPublicContest,
  createPrivateContest,
  getContests,
  getContestById,
  updateContest,
  cancelContest,
  getContestProblems,
  joinContest,
  joinContestByCode,
  leaveContest,
  inviteParticipants,
} = require('../controllers/contestController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');
const { contestJoinLimiter } = require('../middleware/rateLimiter');

// List contests (public list, or with private contests if logged in)
router.get('/', optionalAuth, getContests);

// Create Public Contest (Admin only): POST /api/contests/public
router.post('/public', protect, isAdmin, createPublicContest);

// Create Private Contest (Authenticated users & Admin): POST /api/contests/private
router.post('/private', protect, createPrivateContest);

// Standard endpoint: POST /api/contests (accepts kind in body)
router.post('/', protect, createContest);

// Join Private Contest by 8-char Code (Rate-limited: 10/min)
router.post('/join-by-code', protect, contestJoinLimiter, joinContestByCode);

// Get single contest details
router.get('/:id', optionalAuth, getContestById);

// Update contest before start
router.put('/:id', protect, updateContest);

// Cancel contest
router.post('/:id/cancel', protect, cancelContest);

// Join Public/Authorized Contest
router.post('/:id/join', protect, joinContest);

// Leave contest before start
router.post('/:id/leave', protect, leaveContest);

// Invite participants by email (Creator or Admin)
router.post('/:id/invite', protect, inviteParticipants);

// Get contest problems (only active during/after contest for participants/admins)
router.get('/:id/problems', protect, getContestProblems);

module.exports = router;
