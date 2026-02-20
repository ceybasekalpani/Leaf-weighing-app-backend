const express = require('express');
const router = express.Router();
const collectionViewController = require('../controllers/collectionViewController');

// Get today's collections grouped by registration number
router.get('/today', collectionViewController.getTodayCollections);

// Get collections by specific date
router.get('/date/:date', collectionViewController.getCollectionsByDate);

module.exports = router; // This should export router, not the controller