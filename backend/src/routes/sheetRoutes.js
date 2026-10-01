const express = require('express');
const { createSheet, getAllSheets, getSheetBySlug, deleteSheet } = require('../controllers/sheetController');
const { protect } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');

const router = express.Router();

router.post('/', protect, isAdmin, createSheet);
router.get('/', getAllSheets);
router.get('/:slug', getSheetBySlug);
router.delete('/:id', protect, isAdmin, deleteSheet);

module.exports = router;
