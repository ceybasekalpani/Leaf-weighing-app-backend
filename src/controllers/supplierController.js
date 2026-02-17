const dbService = require('../services/dbService');

const supplierController = {
  // Get supplier information by registration number
  getSupplierByRegNo: async (req, res) => {
    try {
      const { regNo } = req.params;
      
      if (!regNo) {
        return res.status(400).json({
          success: false,
          message: 'Registration number is required'
        });
      }

      const supplier = await dbService.getSupplierByRegNo(regNo);
      
      if (!supplier) {
        return res.status(404).json({
          success: false,
          message: 'Supplier not found'
        });
      }

      // Also get today's transactions for this supplier
      const todayTransactions = await dbService.getTodayTransactions(regNo);

      res.status(200).json({
        success: true,
        data: {
          regNo: supplier.RegNo,
          supplierName: supplier.SupplierName,
          route: supplier.Route,
          todayTransactions: todayTransactions
        }
      });
    } catch (error) {
      console.error('Error in getSupplierByRegNo:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // Search suppliers by registration number or name
  searchSuppliers: async (req, res) => {
    try {
      const { query } = req.query;
      
      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const suppliers = await dbService.searchSuppliers(query);
      
      res.status(200).json({
        success: true,
        data: suppliers
      });
    } catch (error) {
      console.error('Error in searchSuppliers:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
};

module.exports = supplierController;