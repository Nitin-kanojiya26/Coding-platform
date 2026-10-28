const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');
const { getDashboardStats, banUser, unbanUser, promoteUser, demoteUser } = require('../controllers/adminController');

// All routes require authentication and admin role
router.use(protect, isAdmin);

router.get('/dashboard', getDashboardStats);
router.put('/users/:id/ban', banUser);
router.put('/users/:id/unban', unbanUser);
router.put('/users/:id/promote', promoteUser);
router.put('/users/:id/demote', demoteUser);

module.exports = router;