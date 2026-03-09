const { getConnection, sql } = require('../config/database');


/**
 * Get database name from environment variables
 * @param {string} dbKey - The environment variable key for the database
 * @param {string} defaultDb - Default database name if not specified
 * @returns {string} Database name
 */
const getDatabaseName = (dbKey, defaultDb = null) => {
  const dbName = process.env[dbKey];
  
  if (!dbName && !defaultDb) {
    throw new Error(`${dbKey} environment variable is not set`);
  }
  
  const finalDbName = dbName || defaultDb;
  
  if (!finalDbName) {
    throw new Error(`No database name available for ${dbKey}`);
  }
  
  // Remove brackets if present for validation
  const cleanName = finalDbName.replace(/[\[\]]/g, '');
  
  // Validate database name format (allow letters, numbers, underscore, hyphen)
  if (!/^[a-zA-Z0-9_-]+$/.test(cleanName)) {
    throw new Error(`Invalid database name format for ${dbKey}: ${finalDbName}`);
  }
  
  return cleanName;
};

/**
 * Get schema name from environment variables
 * @returns {string} Schema name (default: dbo)
 */
const getSchemaName = () => {
  const schema = process.env.DB_SCHEMA || 'dbo';
  const cleanSchema = schema.replace(/[\[\]]/g, '');
  
  if (!/^[a-zA-Z0-9_]+$/.test(cleanSchema)) {
    throw new Error(`Invalid schema name format: ${schema}`);
  }
  
  return cleanSchema;
};

/**
 * Get table name from environment variables
 * @param {string} tableKey - The environment variable key for the table
 * @param {string} defaultTable - Default table name if not specified
 * @returns {string} Table name
 */
const getTableName = (tableKey, defaultTable = null) => {
  const tableName = process.env[tableKey];
  
  if (!tableName && !defaultTable) {
    throw new Error(`${tableKey} environment variable is not set`);
  }
  
  const finalTableName = tableName || defaultTable;
  
  if (!finalTableName) {
    throw new Error(`No table name available for ${tableKey}`);
  }
  
  // Remove brackets if present for validation
  const cleanName = finalTableName.replace(/[\[\]]/g, '');
  
  // Validate table name format
  if (!/^[a-zA-Z0-9_-]+$/.test(cleanName)) {
    throw new Error(`Invalid table name format for ${tableKey}: ${finalTableName}`);
  }
  
  return cleanName;
};

/**
 * Get full table path with database, schema, and table
 * @param {string} dbKey - Environment variable key for database
 * @param {string} tableKey - Environment variable key for table
 * @param {string} defaultDb - Default database name
 * @param {string} defaultTable - Default table name
 * @returns {string} Full table path: [database].[schema].[table]
 */
const getFullTablePath = (dbKey, tableKey, defaultDb = null, defaultTable = null) => {
  const database = getDatabaseName(dbKey, defaultDb);
  const schema = getSchemaName();
  const table = getTableName(tableKey, defaultTable);
  
  return `[${database}].[${schema}].[${table}]`;
};

// ============================================
// TABLE GETTERS - SPECIFIC TO THIS SERVICE
// ============================================

/**
 * Get Leaf Collection table full path
 */
const getLeafCollectionTable = () => {
  return getFullTablePath(
    'LEAF_COLLECTION_DATABASE',
    'LEAF_COLLECTION_TABLE',
    'BoughtLeaf_Kandedola',  // Fallback only if env var not set
    'Tr_LeafCollection_Temp'  // Fallback only if env var not set
  );
};

/**
 * Get UserSetup table full path (if needed in this service)
 */
const getUserSetupTable = () => {
  return getFullTablePath(
    'USER_SETUP_DATABASE',
    'USER_SETUP_TABLE',
    'Setup_tbl_Kandedola',
    'UserSetup'
  );
};

// ============================================
// SERVICE CLASS
// ============================================

class CollectionDbService {
  // Get all collections with combined data per registration number
  async getAllCollections() {
    try {
      const pool = await getConnection();
      const leafTable = getLeafCollectionTable();
      
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
            FROM ${leafTable}
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
      const leafTable = getLeafCollectionTable();
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
          FROM ${leafTable}
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
      const leafTable = getLeafCollectionTable();
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
            FROM ${leafTable}
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
      const leafTable = getLeafCollectionTable();
      
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
          FROM ${leafTable}
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