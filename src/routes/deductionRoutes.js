const express = require('express');
const router = express.Router();
const deductionController = require('../controllers/deductionController');

// Get deduction summary by registration number and leaf type
router.get('/summary/:regNo/:leafType', deductionController.getDeductionSummary);

// Save new deduction
router.post('/', deductionController.saveDeduction);

// Get today's transactions for a registration number
router.get('/today/:regNo', deductionController.getTodayTransactions);

module.exports = router;