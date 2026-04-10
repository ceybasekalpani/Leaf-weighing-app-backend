const express = require('express');
const router = express.Router();
const deductionController = require('../controllers/deductionController');

// Get today's deduction summary by registration number
router.get('/summary/:regNo', deductionController.getDeductionSummary);

// Save new deduction
router.post('/', deductionController.saveDeduction);

// Get today's transactions for a registration number
router.get('/today/:regNo', deductionController.getTodayTransactions);

module.exports = router;