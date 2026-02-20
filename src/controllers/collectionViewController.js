const dbService = require('../services/dbService');

const collectionViewController = {
  // Get all collections for today grouped by registration number
  getTodayCollections: async (req, res) => {
    try {
      console.log('📊 Getting today\'s collections grouped by registration number');
      
      const collections = await dbService.getTodayGroupedCollections();
      
      res.status(200).json({
        success: true,
        data: collections
      });
    } catch (error) {
      console.error('Error in getTodayCollections:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // Get collections by date (optional, for future use)
  getCollectionsByDate: async (req, res) => {
    try {
      const { date } = req.params;
      
      console.log(`📊 Getting collections for date: ${date}`);
      
      const collections = await dbService.getGroupedCollectionsByDate(date);
      
      res.status(200).json({
        success: true,
        data: collections
      });
    } catch (error) {
      console.error('Error in getCollectionsByDate:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
};

module.exports = collectionViewController;