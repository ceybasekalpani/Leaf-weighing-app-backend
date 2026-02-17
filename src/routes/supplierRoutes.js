const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');

// Get supplier by registration number
router.get('/:regNo', supplierController.getSupplierByRegNo);

// Search suppliers
router.get('/search/all', supplierController.searchSuppliers);

module.exports = router;