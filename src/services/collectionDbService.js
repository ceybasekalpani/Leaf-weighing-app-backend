// services/collectionDbService.js
const { getConnection, sql } = require('../config/database');

class CollectionDbService {
  // Get all collections with combined data per registration number
  async getAllCollections() {
    try {
      const pool = await getConnection();
      
      const result = await pool.request()
        .query(`
          WITH CombinedData AS (
            SELECT 
              [RegNo],
              [Dealer] as SupplierName,
              [Route],
              [LeafType],
              -- Sum all values, treating both deduction and non-deduction entries as collections
              SUM([Qty]) as TotalBags,
              SUM([Gross]) as TotalGross,
              SUM([BagWeight]) as TotalBagWeight,
              SUM([Coarse]) as TotalCoarse,
              SUM([Water]) as TotalWater,
              SUM([Boild]) as TotalBoiled,
              SUM([Rejected]) as TotalRejected,
              SUM([NetWeight]) as TotalNetWeight,
              MAX([LogTime]) as LastUpdated,
              COUNT(*) as TransactionCount,
              -- Count how many from each system
              SUM(CASE WHEN [Mode] = 'App' THEN 1 ELSE 0 END) as AppCount,
              SUM(CASE WHEN [Mode] != 'App' OR [Mode] IS NULL THEN 1 ELSE 0 END) as WebCount
            FROM [BoughtLeaf_Kandedola].[dbo].[Tr_LeafCollection_Temp]
            WHERE 1=1
            GROUP BY 
              [RegNo], 
              [Dealer], 
              [Route], 
              [LeafType]
          )
          SELECT 
            RegNo,
            SupplierName,
            Route,
            LeafType,
            TotalBags,
            TotalGross,
            TotalBagWeight,
            TotalCoarse as TotalCoarce, -- Rename for frontend consistency
            TotalWater,
            TotalBoiled,
            TotalRejected,
            TotalNetWeight as NetWeight, -- Rename for frontend
            LastUpdated,
            TransactionCount,
            AppCount,
            WebCount,
            -- Format date for display
            FORMAT(LastUpdated, 'dd/MM/yyyy') as DisplayDate,
            FORMAT(LastUpdated, 'hh:mm tt') as DisplayTime
          FROM CombinedData
          ORDER BY LastUpdated DESC
        `);
      
      return result.recordset;
    } catch (error) {
      console.error('Error in getAllCollections:', error);
      throw error;
    }
  }

  // Get filtered collections
  async getFilteredCollections(filters) {
    try {
      const pool = await getConnection();
      const { startDate, endDate, regNo, route } = filters;
      
      let query = `
        WITH CombinedData AS (
          SELECT 
            [RegNo],
            [Dealer] as SupplierName,
            [Route],
            [LeafType],
            SUM([Qty]) as TotalBags,
            SUM([Gross]) as TotalGross,
            SUM([BagWeight]) as TotalBagWeight,
            SUM([Coarse]) as TotalCoarse,
            SUM([Water]) as TotalWater,
            SUM([Boild]) as TotalBoiled,
            SUM([Rejected]) as TotalRejected,
            SUM([NetWeight]) as TotalNetWeight,
            MAX([LogTime]) as LastUpdated,
            COUNT(*) as TransactionCount,
            SUM(CASE WHEN [Mode] = 'App' THEN 1 ELSE 0 END) as AppCount,
            SUM(CASE WHEN [Mode] != 'App' OR [Mode] IS NULL THEN 1 ELSE 0 END) as WebCount
          FROM [BoughtLeaf_Kandedola].[dbo].[Tr_LeafCollection_Temp]
          WHERE 1=1
      `;
      
      const request = pool.request();
      
      // Add date filters if provided
      if (startDate) {
        query += ` AND CAST([LogTime] AS DATE) >= @startDate`;
        request.input('startDate', sql.Date, startDate);
      }
      
      if (endDate) {
        query += ` AND CAST([LogTime] AS DATE) <= @endDate`;
        request.input('endDate', sql.Date, endDate);
      }
      
      // Add registration number filter
      if (regNo) {
        query += ` AND [RegNo] = @regNo`;
        request.input('regNo', sql.Int, regNo);
      }
      
      // Add route filter
      if (route) {
        query += ` AND [Route] LIKE @route`;
        request.input('route', sql.NVarChar, `%${route}%`);
      }
      
      query += `
          GROUP BY 
            [RegNo], 
            [Dealer], 
            [Route], 
            [LeafType]
        )
        SELECT 
          RegNo,
          SupplierName,
          Route,
          LeafType,
          TotalBags,
          TotalGross,
          TotalBagWeight,
          TotalCoarse as TotalCoarce,
          TotalWater,
          TotalBoiled,
          TotalRejected,
          TotalNetWeight as NetWeight,
          LastUpdated,
          TransactionCount,
          AppCount,
          WebCount,
          FORMAT(LastUpdated, 'dd/MM/yyyy') as DisplayDate,
          FORMAT(LastUpdated, 'hh:mm tt') as DisplayTime
        FROM CombinedData
        ORDER BY LastUpdated DESC
      `;
      
      const result = await request.query(query);
      return result.recordset;
    } catch (error) {
      console.error('Error in getFilteredCollections:', error);
      throw error;
    }
  }

  // Get today's collections
  async getTodaysCollections() {
    try {
      const pool = await getConnection();
      const today = new Date().toISOString().split('T')[0];
      
      const result = await pool.request()
        .input('today', sql.Date, today)
        .query(`
          WITH CombinedData AS (
            SELECT 
              [RegNo],
              [Dealer] as SupplierName,
              [Route],
              [LeafType],
              SUM([Qty]) as TotalBags,
              SUM([Gross]) as TotalGross,
              SUM([BagWeight]) as TotalBagWeight,
              SUM([Coarse]) as TotalCoarse,
              SUM([Water]) as TotalWater,
              SUM([Boild]) as TotalBoiled,
              SUM([Rejected]) as TotalRejected,
              SUM([NetWeight]) as TotalNetWeight,
              MAX([LogTime]) as LastUpdated,
              COUNT(*) as TransactionCount,
              SUM(CASE WHEN [Mode] = 'App' THEN 1 ELSE 0 END) as AppCount,
              SUM(CASE WHEN [Mode] != 'App' OR [Mode] IS NULL THEN 1 ELSE 0 END) as WebCount
            FROM [BoughtLeaf_Kandedola].[dbo].[Tr_LeafCollection_Temp]
            WHERE CAST([LogTime] AS DATE) = @today
            GROUP BY 
              [RegNo], 
              [Dealer], 
              [Route], 
              [LeafType]
          )
          SELECT 
            RegNo,
            SupplierName,
            Route,
            LeafType,
            TotalBags,
            TotalGross,
            TotalBagWeight,
            TotalCoarse as TotalCoarce,
            TotalWater,
            TotalBoiled,
            TotalRejected,
            TotalNetWeight as NetWeight,
            LastUpdated,
            TransactionCount,
            AppCount,
            WebCount,
            FORMAT(LastUpdated, 'dd/MM/yyyy') as DisplayDate,
            FORMAT(LastUpdated, 'hh:mm tt') as DisplayTime
          FROM CombinedData
          ORDER BY LastUpdated DESC
        `);
      
      return result.recordset;
    } catch (error) {
      console.error('Error in getTodaysCollections:', error);
      throw error;
    }
  }

  // Get details for a specific registration number
  async getCollectionDetails(regNo) {
    try {
      const pool = await getConnection();
      
      const result = await pool.request()
        .input('regNo', sql.Int, regNo)
        .query(`
          SELECT 
            [Ind],
            [RegNo],
            [Dealer] as SupplierName,
            [Route],
            [LeafType],
            [Qty] as Bags,
            [Gross],
            [BagWeight],
            [Water],
            [Coarse] as Coarce,
            [Rejected],
            [Boild] as Boiled,
            [NetWeight],
            [Shift],
            [UserName],
            [Mode],
            [LogTime],
            FORMAT([LogTime], 'dd/MM/yyyy') as DisplayDate,
            FORMAT([LogTime], 'hh:mm tt') as DisplayTime,
            CASE WHEN [Mode] = 'App' THEN 'Mobile App' ELSE 'Web System' END as Source
          FROM [BoughtLeaf_Kandedola].[dbo].[Tr_LeafCollection_Temp]
          WHERE [RegNo] = @regNo
          ORDER BY [LogTime] DESC
        `);
      
      return result.recordset;
    } catch (error) {
      console.error('Error in getCollectionDetails:', error);
      throw error;
    }
  }
}

module.exports = new CollectionDbService();