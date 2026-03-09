const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Login route
router.post('/login', userController.login);

// Verify token route
router.post('/verify-token', userController.verifyToken);

module.exports = router;