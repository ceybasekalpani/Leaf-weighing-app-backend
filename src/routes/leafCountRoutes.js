const express = require('express');
const router = express.Router();
const leafCountController = require('../controllers/leafCountController');

// Get all routes (distinct routes from Tr_LeafCollection_Temp)
router.get('/routes', leafCountController.getRoutes);

// Get total weight for a specific route
router.get('/routes/:routeName/total-weight', leafCountController.getRouteTotalWeight);

// Save leaf count
router.post('/save', leafCountController.saveLeafCount);

// Get leaf counts by date/month
router.get('/history', leafCountController.getLeafCountHistory);

module.exports = router;