const { getConnection, sql } = require('../config/database');
const os = require('os');

class LeafCountService {
  // Get all distinct routes from Tr_LeafCollection_Temp
  async getDistinctRoutes() {
    try {
      const pool = await getConnection();
      const result = await pool.request()
        .query(`
          SELECT DISTINCT [Route]
          FROM [BoughtLeaf_Kandedola].[dbo].[Tr_LeafCollection_Temp]
          WHERE [Route] IS NOT NULL AND [Route] != ''
          ORDER BY [Route]
        `);
      
      // Return as array of strings
      return result.recordset.map(item => item.Route);
    } catch (error) {
      console.error('Error in getDistinctRoutes:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Get total weight for a specific route on a specific date
  // Calculation: Gross - (coarce + water + bag weight + spd + boiled + rejected)
  async getRouteTotalWeight(routeName, date) {
    try {
      const pool = await getConnection();
      
      // If date is provided, use that date, otherwise use today
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      console.log('🔍 Fetching total weight for:', { routeName, targetDate });
      
      const result = await pool.request()
        .input('route', sql.NVarChar, routeName)
        .input('targetDate', sql.Date, targetDate)
        .query(`
          SELECT 
            COUNT(*) as RecordCount,
            ISNULL(SUM([Gross]), 0) as TotalGross,
            ISNULL(SUM([Coarse]), 0) as TotalCoarse,
            ISNULL(SUM([Water]), 0) as TotalWater,
            ISNULL(SUM([BagWeight]), 0) as TotalBagWeight,
            ISNULL(SUM([Spd]), 0) as TotalSpd,
            ISNULL(SUM([Boild]), 0) as TotalBoiled,
            ISNULL(SUM([Rejected]), 0) as TotalRejected,
            ISNULL(SUM([NetWeight]), 0) as TotalNetWeight
          FROM [BoughtLeaf_Kandedola].[dbo].[Tr_LeafCollection_Temp]
          WHERE [Route] = @route
            AND [IsDeduction] = 0
            AND CAST([LogTime] AS DATE) = @targetDate
        `);
      
      const data = result.recordset[0];
      console.log('📊 Query result:', data);
      
      // Calculate: Gross - (coarce + water + bag weight + spd + boiled + rejected)
      const totalGross = data.TotalGross || 0;
      const totalDeductions = (data.TotalCoarse || 0) + 
                              (data.TotalWater || 0) + 
                              (data.TotalBagWeight || 0) + 
                              (data.TotalSpd || 0) + 
                              (data.TotalBoiled || 0) + 
                              (data.TotalRejected || 0);
      
      const calculatedTotalWeight = totalGross - totalDeductions;
      
      console.log('🧮 Calculation:', {
        totalGross,
        totalDeductions,
        calculatedTotalWeight,
        components: {
          coarse: data.TotalCoarse,
          water: data.TotalWater,
          bagWeight: data.TotalBagWeight,
          spd: data.TotalSpd,
          boiled: data.TotalBoiled,
          rejected: data.TotalRejected
        }
      });
      
      // Return the calculated value
      return calculatedTotalWeight > 0 ? calculatedTotalWeight : 0;
    } catch (error) {
      console.error('Error in getRouteTotalWeight:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Alternative: Get detailed breakdown (if you want to show more info in UI)
  async getRouteWeightBreakdown(routeName, date) {
    try {
      const pool = await getConnection();
      
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      const result = await pool.request()
        .input('route', sql.NVarChar, routeName)
        .input('targetDate', sql.Date, targetDate)
        .query(`
          SELECT 
            COUNT(*) as RecordCount,
            ISNULL(SUM([Gross]), 0) as TotalGross,
            ISNULL(SUM([Coarse]), 0) as TotalCoarse,
            ISNULL(SUM([Water]), 0) as TotalWater,
            ISNULL(SUM([BagWeight]), 0) as TotalBagWeight,
            ISNULL(SUM([Spd]), 0) as TotalSpd,
            ISNULL(SUM([Boild]), 0) as TotalBoiled,
            ISNULL(SUM([Rejected]), 0) as TotalRejected,
            ISNULL(SUM([NetWeight]), 0) as TotalNetWeight
          FROM [BoughtLeaf_Kandedola].[dbo].[Tr_LeafCollection_Temp]
          WHERE [Route] = @route
            AND [IsDeduction] = 0
            AND CAST([LogTime] AS DATE) = @targetDate
        `);
      
      const data = result.recordset[0];
      
      const totalGross = data.TotalGross || 0;
      const totalDeductions = (data.TotalCoarse || 0) + 
                              (data.TotalWater || 0) + 
                              (data.TotalBagWeight || 0) + 
                              (data.TotalSpd || 0) + 
                              (data.TotalBoiled || 0) + 
                              (data.TotalRejected || 0);
      
      const calculatedTotalWeight = totalGross - totalDeductions;
      
      return {
        totalGross,
        totalDeductions,
        calculatedTotalWeight: calculatedTotalWeight > 0 ? calculatedTotalWeight : 0,
        breakdown: {
          coarse: data.TotalCoarse,
          water: data.TotalWater,
          bagWeight: data.TotalBagWeight,
          spd: data.TotalSpd,
          boiled: data.TotalBoiled,
          rejected: data.TotalRejected
        },
        recordCount: data.RecordCount
      };
    } catch (error) {
      console.error('Error in getRouteWeightBreakdown:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Save leaf count to Reg_LeafCount table
  async saveLeafCount(leafCountData) {
    try {
      const pool = await getConnection();
      
      // Get PC name (hostname)
      const pcName = leafCountData.pcName || os.hostname() || 'MOBILE_APP';
      
      // Get user from data or default
      const userName = leafCountData.userName || leafCountData.user || 'mobile_user';
      
      // Parse date (day number)
      const date = parseInt(leafCountData.date) || new Date().getDate();
      
      // Parse leaf count values
      const bestLeaf = parseInt(leafCountData.bestLeaf) || 0;
      const belowBest = parseInt(leafCountData.bellowBest) || 0;
      const poor = parseInt(leafCountData.poor) || 0;
      
      console.log('📊 Saving to Reg_LeafCount:', {
        date,
        month: leafCountData.month,
        route: leafCountData.route,
        bestLeaf,
        belowBest,
        poor,
        user: userName,
        pcName
      });
      
      // Insert into Reg_LeafCount table
      const result = await pool.request()
        .input('date', sql.Int, date)
        .input('month', sql.NVarChar, leafCountData.month)
        .input('route', sql.NVarChar, leafCountData.route)
        .input('bestLeaf', sql.Int, bestLeaf)
        .input('belowBest', sql.Int, belowBest)
        .input('poor', sql.Int, poor)
        .input('user', sql.NVarChar, userName)
        .input('pcName', sql.NVarChar, pcName)
        .query(`
          INSERT INTO [BoughtLeaf_Kandedola].[dbo].[Reg_LeafCount] (
            [Date], [Month], [Route], [BestLeaf], [BelowBest], [Poor], 
            [User], [PC_Name], [LogTime]
          ) VALUES (
            @date, @month, @route, @bestLeaf, @belowBest, @poor,
            @user, @pcName, GETDATE()
          );
          
          SELECT SCOPE_IDENTITY() as Ind;
        `);
      
      console.log('✅ Leaf count saved with Ind:', result.recordset[0].Ind);
      
      return {
        success: true,
        ind: result.recordset[0].Ind,
        message: 'Leaf count saved successfully'
      };
    } catch (error) {
      console.error('Error in saveLeafCount:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Get leaf count history with filters
  async getLeafCountHistory(filters) {
    try {
      const pool = await getConnection();
      
      let query = `
        SELECT 
          [Ind],
          [Date],
          [Month],
          [Route],
          [BestLeaf],
          [BelowBest] as BellowBest,
          [Poor],
          [User],
          [LogTime],
          [PC_Name]
        FROM [BoughtLeaf_Kandedola].[dbo].[Reg_LeafCount]
        WHERE 1=1
      `;
      
      const request = pool.request();
      
      if (filters.month) {
        query += ` AND [Month] = @month`;
        request.input('month', sql.NVarChar, filters.month);
      }
      
      if (filters.route) {
        query += ` AND [Route] = @route`;
        request.input('route', sql.NVarChar, filters.route);
      }
      
      if (filters.startDate) {
        query += ` AND [LogTime] >= @startDate`;
        request.input('startDate', sql.DateTime, new Date(filters.startDate));
      }
      
      if (filters.endDate) {
        query += ` AND [LogTime] <= @endDate`;
        request.input('endDate', sql.DateTime, new Date(filters.endDate));
      }
      
      query += ` ORDER BY [LogTime] DESC`;
      
      const result = await request.query(query);
      
      return result.recordset;
    } catch (error) {
      console.error('Error in getLeafCountHistory:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }
}

module.exports = new LeafCountService();