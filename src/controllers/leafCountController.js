const leafCountService = require('../services/leafCountService');

const leafCountController = {
  // Get all distinct routes from Tr_LeafCollection_Temp
  getRoutes: async (req, res) => {
    try {
      console.log('📋 Fetching distinct routes from database');
      
      const routes = await leafCountService.getDistinctRoutes();
      
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
// Get total weight for a specific route on a specific date
// Calculation: Gross - (coarce + water + bag weight + spd + boiled + rejected)
getRouteTotalWeight: async (req, res) => {
  try {
    const { routeName } = req.params;
    const { date } = req.query; // Get date from query parameter
    
    console.log(`📊 Fetching total weight for route: ${routeName} on date: ${date || 'today'}`);
    
    if (!routeName) {
      return res.status(400).json({
        success: false,
        message: 'Route name is required'
      });
    }

    const totalWeight = await leafCountService.getRouteTotalWeight(routeName, date);
    
    res.status(200).json({
      success: true,
      data: {
        route: routeName,
        date: date || new Date().toISOString().split('T')[0],
        totalWeight: totalWeight || 0,
        calculation: 'Gross - (Coarse + Water + BagWeight + Spd + Boiled + Rejected)'
      }
    });
  } catch (error) {
    console.error('Error in getRouteTotalWeight:', error);
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

      // Validate at least one leaf count value is provided
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
      console.error('Error in saveLeafCount:', error);
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
        data: history || []
      });
    } catch (error) {
      console.error('Error in getLeafCountHistory:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch leaf count history',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

module.exports = leafCountController;