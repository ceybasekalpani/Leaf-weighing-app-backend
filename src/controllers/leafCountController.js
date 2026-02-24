const leafCountService = require('../services/leafCountService');

const leafCountController = {
  // Get all distinct routes from Tr_LeafCollection_Temp
  getRoutes: async (req, res) => {
    try {
      console.log('📋 Fetching distinct routes from database');
      
      const routes = await leafCountService.getDistinctRoutes();
      
      console.log('✅ Routes found:', routes.length);
      
      res.status(200).json({
        success: true,
        data: routes
      });
    } catch (error) {
      console.error('Error in getRoutes:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch routes',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get total net weight for a specific route on a specific date
  getRouteTotalWeight: async (req, res) => {
    try {
      const { routeName } = req.params;
      const { date, month } = req.query; // Added month parameter
      
      console.log(`📊 Fetching total net weight for route: ${routeName} on date: ${date}, month: ${month}`);
      
      if (!routeName) {
        return res.status(400).json({
          success: false,
          message: 'Route name is required'
        });
      }

      if (!date || !month) {
        return res.status(400).json({
          success: false,
          message: 'Date and month are required'
        });
      }

      const totalNetWeight = await leafCountService.getRouteTotalWeight(routeName, date, month);
      
      console.log(`✅ Route ${routeName} net weight: ${totalNetWeight} kg`);
      
      res.status(200).json({
        success: true,
        data: {
          route: routeName,
          date: date,
          month: month,
          totalWeight: totalNetWeight,
          formula: 'Gross - (Coarse + Water + BagWeight + Spd + Boiled + Rejected)'
        },
        message: 'Route total net weight calculated successfully'
      });
    } catch (error) {
      console.error('❌ Error in getRouteTotalWeight:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch route total weight',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Save leaf count to Reg_LeafCount table
  saveLeafCount: async (req, res) => {
    try {
      const leafCountData = req.body;
      
      console.log('💾 Saving leaf count:', leafCountData);

      // Validate required fields
      if (!leafCountData.date || !leafCountData.month || !leafCountData.route) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: date, month, route'
        });
      }

      if (!leafCountData.bestLeaf && !leafCountData.bellowBest && !leafCountData.poor) {
        return res.status(400).json({
          success: false,
          message: 'At least one leaf count value is required'
        });
      }

      const result = await leafCountService.saveLeafCount(leafCountData);
      
      res.status(201).json({
        success: true,
        data: result,
        message: 'Leaf count saved successfully'
      });
    } catch (error) {
      console.error('❌ Error in saveLeafCount:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save leaf count',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get leaf count history
  getLeafCountHistory: async (req, res) => {
    try {
      const { month, route, startDate, endDate } = req.query;
      
      console.log('📋 Fetching leaf count history with filters:', { month, route, startDate, endDate });

      const history = await leafCountService.getLeafCountHistory({
        month,
        route,
        startDate,
        endDate
      });
      
      res.status(200).json({
        success: true,
        data: history || [],
        count: history.length
      });
    } catch (error) {
      console.error('❌ Error in getLeafCountHistory:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch leaf count history',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

module.exports = leafCountController;