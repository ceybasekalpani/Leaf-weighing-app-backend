const dbService = require('../services/dbService');

const deductionController = {
  // Get deduction summary for a specific registration number and leaf type
  getDeductionSummary: async (req, res) => {
    try {
      const { regNo, leafType } = req.params;
      
      if (!regNo || !leafType) {
        return res.status(400).json({
          success: false,
          message: 'Registration number and leaf type are required'
        });
      }

      const summary = await dbService.getDeductionSummary(regNo, leafType);
      
      res.status(200).json({
        success: true,
        data: {
          totalBags: summary.TotalBags,
          totalGross: summary.TotalGross,
          totalBagWeight: summary.TotalBagWeight,
          totalCoarce: summary.TotalCoarse,
          totalWater: summary.TotalWater,
          totalBoiled: summary.TotalBoiled,
          totalRejected: summary.TotalRejected,
          totalNetWeight: summary.TotalNetWeight,
          transactionCount: summary.TransactionCount
        }
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
      
      // Validate required fields
      const requiredFields = ['regNo', 'supplierName', 'route', 'leafType', 'bags', 'userName', 'month'];
      const missingFields = requiredFields.filter(field => !deductionData[field]);
      
      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing required fields: ${missingFields.join(', ')}`
        });
      }

      const result = await dbService.saveDeduction(deductionData);
      
      res.status(201).json({
        success: true,
        message: 'Deduction saved successfully',
        data: {
          ind: result.ind
        }
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

  // Get today's transactions for a specific registration number
  getTodayTransactions: async (req, res) => {
    try {
      const { regNo } = req.params;
      
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