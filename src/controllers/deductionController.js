const dbService = require('../services/dbService');

const deductionController = {
  // Get deduction summary by registration number - leaf type from header (UPDATED - now shows only today's data)
  getDeductionSummary: async (req, res) => {
    try {
      const { regNo } = req.params;
      const leafType = req.headers['leaf-type'];
      
      console.log('📊 Getting today\'s summary for RegNo:', regNo, 'LeafType:', leafType);

      if (!regNo || !leafType) {
        return res.status(400).json({
          success: false,
          message: 'Registration number and leaf type are required'
        });
      }

      const summary = await dbService.getTodayDeductionSummary(regNo, leafType);
      
      res.status(200).json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Error in getDeductionSummary:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // Save new deduction
  saveDeduction: async (req, res) => {
    try {
      const deductionData = req.body;
      
      console.log('💾 Saving deduction:', deductionData);

      // Validate required fields
      if (!deductionData.regNo || !deductionData.supplierName || !deductionData.leafType) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: regNo, supplierName, leafType'
        });
      }

      const result = await dbService.saveDeduction(deductionData);
      
      res.status(201).json({
        success: true,
        data: result,
        message: 'Deduction saved successfully'
      });
    } catch (error) {
      console.error('Error in saveDeduction:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // Get today's transactions for a registration number
  getTodayTransactions: async (req, res) => {
    try {
      const { regNo } = req.params;
      
      console.log('📋 Getting today\'s transactions for RegNo:', regNo);

      if (!regNo) {
        return res.status(400).json({
          success: false,
          message: 'Registration number is required'
        });
      }

      const transactions = await dbService.getTodayTransactions(regNo);
      
      res.status(200).json({
        success: true,
        data: transactions
      });
    } catch (error) {
      console.error('Error in getTodayTransactions:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
};

module.exports = deductionController;