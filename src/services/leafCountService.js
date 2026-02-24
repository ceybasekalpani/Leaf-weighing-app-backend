const { getConnection, sql } = require('../config/database');
const os = require('os');

class LeafCountService {
  // Get all distinct routes from Tr_LeafCollection_Temp
  async getDistinctRoutes() {
    try {
      const pool = await getConnection();
      console.log('📊 Connected to database, fetching routes...');
      
      const result = await pool.request()
        .query(`
          SELECT DISTINCT [Route]
          FROM [BoughtLeaf_Kandedola].[dbo].[Tr_LeafCollection_Temp]
          WHERE [Route] IS NOT NULL 
            AND [Route] != ''
            AND [Route] != 'null'
            AND LTRIM(RTRIM([Route])) != ''
          ORDER BY [Route]
        `);
      
      console.log(`📊 Query returned ${result.recordset.length} routes`);
      
      // Return as array of strings, trimming whitespace
      return result.recordset.map(item => item.Route ? item.Route.trim() : '').filter(route => route);
    } catch (error) {
      console.error('Error in getDistinctRoutes:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Get total net weight for a specific route on a specific date
  // Formula: Gross - (Coarse + Water + BagWeight + Spd + Boiled + Rejected + RouteDeduct + Excess_Leaf + Transfer)
  async getRouteTotalWeight(routeName, date, month) {
    try {
      const pool = await getConnection();
      
      // Parse month string (format: "MMM-YYYY" like "Jan-2025")
      const [monthAbbr, year] = month.split('-');
      
      // Map month abbreviation to month number (1-12)
      const monthMap = {
        'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
        'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
      };
      
      const monthNumber = monthMap[monthAbbr];
      
      if (!monthNumber || !year) {
        console.error('❌ Invalid month format:', month);
        return 0;
      }
      
      // Construct full date: YYYY-MM-DD
      const fullDate = `${year}-${String(monthNumber).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
      
      console.log('🔍 Constructed full date:', fullDate, 'from inputs:', { routeName, date, month });
      
      const result = await pool.request()
        .input('route', sql.NVarChar, routeName.trim())
        .input('targetDate', sql.Date, fullDate)
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
            ISNULL(SUM([RouteDeduct]), 0) as TotalRouteDeduct,
            ISNULL(SUM([Excess_Leaf]), 0) as TotalExcessLeaf,
            ISNULL(SUM([Transfer]), 0) as TotalTransfer,
            ISNULL(SUM([RouteDeductPre]), 0) as TotalRouteDeductPre
          FROM [BoughtLeaf_Kandedola].[dbo].[Tr_LeafCollection_Temp]
          WHERE LTRIM(RTRIM([Route])) = LTRIM(RTRIM(@route))
            AND CAST([LogTime] AS DATE) = @targetDate
        `);
      
      const data = result.recordset[0];
      
      if (!data || data.RecordCount === 0) {
        console.log('⚠️ No data found for route:', routeName, 'on date:', fullDate);
        return 0;
      }
      
      // Calculate total deductions including ALL possible deduction fields
      const totalDeductions = 
        (data.TotalCoarse || 0) + 
        (data.TotalWater || 0) + 
        (data.TotalBagWeight || 0) + 
        (data.TotalSpd || 0) + 
        (data.TotalBoiled || 0) + 
        (data.TotalRejected || 0) +
        (data.TotalRouteDeduct || 0) +
        (data.TotalExcessLeaf || 0) +
        (data.TotalTransfer || 0) +
        (data.TotalRouteDeductPre || 0);
      
      // Calculate net weight (Gross - Deductions)
      const totalNetWeight = (data.TotalGross || 0) - totalDeductions;
      
      console.log('🧮 Calculation Details:', {
        route: routeName,
        date: fullDate,
        recordCount: data.RecordCount,
        totalGross: data.TotalGross,
        // Standard deductions
        totalCoarse: data.TotalCoarse,
        totalWater: data.TotalWater,
        totalBagWeight: data.TotalBagWeight,
        totalSpd: data.TotalSpd,
        totalBoiled: data.TotalBoiled,
        totalRejected: data.TotalRejected,
        // Additional deductions from your table
        totalRouteDeduct: data.TotalRouteDeduct,
        totalExcessLeaf: data.TotalExcessLeaf,
        totalTransfer: data.TotalTransfer,
        totalRouteDeductPre: data.TotalRouteDeductPre,
        totalDeductions: totalDeductions,
        totalNetWeight: totalNetWeight > 0 ? totalNetWeight : 0
      });
      
      // Return the calculated net weight (ensure it's not negative)
      return totalNetWeight > 0 ? totalNetWeight : 0;
      
    } catch (error) {
      console.error('❌ Error in getRouteTotalWeight:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Save leaf count to Reg_LeafCount table
  async saveLeafCount(leafCountData) {
    try {
      const pool = await getConnection();
      
      const pcName = leafCountData.pcName || os.hostname() || 'MOBILE_APP';
      const userName = leafCountData.userName || leafCountData.user || 'mobile_user';
      const date = parseInt(leafCountData.date) || new Date().getDate();
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
      
      const result = await pool.request()
        .input('date', sql.Int, date)
        .input('month', sql.NVarChar, leafCountData.month)
        .input('route', sql.NVarChar, leafCountData.route.trim())
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
          LTRIM(RTRIM([Route])) as Route,
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
        query += ` AND LTRIM(RTRIM([Route])) = LTRIM(RTRIM(@route))`;
        request.input('route', sql.NVarChar, filters.route.trim());
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