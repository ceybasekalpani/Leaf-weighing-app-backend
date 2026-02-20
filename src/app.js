const express = require('express');
const cors = require('cors');
require('dotenv').config();

const supplierRoutes = require('./routes/supplierRoutes');
const deductionRoutes = require('./routes/deductionRoutes');
const collectionViewRoutes = require('./routes/collectionViewRoutes'); // Add this line

const app = express();

// Middleware
app.use(cors({
  origin: '*', // In production, replace with your frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/suppliers', supplierRoutes);
app.use('/api/deductions', deductionRoutes);
app.use('/api/collections', collectionViewRoutes); // Add this line

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler - FIXED: Remove the '*' wildcard, use a function instead
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

module.exports = app;