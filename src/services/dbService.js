const { getConnection, sql } = require('../config/database');

class DbService {
  // Get supplier information by registration number
  async getSupplierByRegNo(regNo) {
    try {
      const pool = await getConnection();
      const result = await pool.request()
        .input('regNo', sql.Int, regNo)
        .query(`
          SELECT DISTINCT 
            [RegNo],
            [Dealer] as SupplierName,
            [Route]
          FROM [BoughtLeaf_Kandedola].[dbo].[Tr_LeafCollection_Temp]
          WHERE [RegNo] = @regNo
        `);
      
      return result.recordset[0] || null;
    } catch (error) {
      console.error('Error in getSupplierByRegNo:', error);
      throw error;
    }
  }

  // Search suppliers by registration number or name
  async searchSuppliers(query) {
    try {
      const pool = await getConnection();
      const result = await pool.request()
        .input('query', sql.NVarChar, `%${query}%`)
        .query(`
          SELECT DISTINCT TOP 50
            [RegNo],
            [Dealer] as SupplierName,
            [Route]
          FROM [BoughtLeaf_Kandedola].[dbo].[Tr_LeafCollection_Temp]
          WHERE [RegNo] LIKE @query 
             OR [Dealer] LIKE @query
          ORDER BY [RegNo]
        `);
      
      return result.recordset;
    } catch (error) {
      console.error('Error in searchSuppliers:', error);
      throw error;
    }
  }

  // Get all deductions summary for a specific registration number and leaf type
  async getDeductionSummary(regNo, leafType) {
    try {
      const pool = await getConnection();
      const result = await pool.request()
        .input('regNo', sql.Int, regNo)
        .input('leafType', sql.NVarChar, leafType)
        .query(`
          SELECT 
            ISNULL(SUM([Qty]), 0) as TotalBags,
            ISNULL(SUM([Gross]), 0) as TotalGross,
            ISNULL(SUM([BagWeight]), 0) as TotalBagWeight,
            ISNULL(SUM([Coarse]), 0) as TotalCoarse,
            ISNULL(SUM([Water]), 0) as TotalWater,
            ISNULL(SUM([Boild]), 0) as TotalBoiled,
            ISNULL(SUM([Rejected]), 0) as TotalRejected,
            ISNULL(SUM([NetWeight]), 0) as TotalNetWeight,
            COUNT(*) as TransactionCount
          FROM [BoughtLeaf_Kandedola].[dbo].[Tr_LeafCollection_Temp]
          WHERE [RegNo] = @regNo 
            AND [LeafType] = @leafType
            AND [IsDeduction] = 1
        `);
      
      return result.recordset[0];
    } catch (error) {
      console.error('Error in getDeductionSummary:', error);
      throw error;
    }
  }

  // Get today's transactions for a specific registration number
  async getTodayTransactions(regNo) {
    try {
      const pool = await getConnection();
      const today = new Date().toISOString().split('T')[0];
      
      const result = await pool.request()
        .input('regNo', sql.Int, regNo)
        .input('today', sql.Date, today)
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
            [LogTime]
          FROM [BoughtLeaf_Kandedola].[dbo].[Tr_LeafCollection_Temp]
          WHERE [RegNo] = @regNo 
            AND CAST([LogTime] AS DATE) = @today
            AND [IsDeduction] = 1
          ORDER BY [LogTime] DESC
        `);
      
      return result.recordset;
    } catch (error) {
      console.error('Error in getTodayTransactions:', error);
      throw error;
    }
  }

  // Save new deduction
  async saveDeduction(deductionData) {
    try {
      const pool = await getConnection();
      
      // Determine shift based on current time
      const currentHour = new Date().getHours();
      const shift = currentHour < 12 ? 'Morning' : 'Evening';
      
      // Get PC name
      const pcName = deductionData.pcName || 'MOBILE_APP';
      
      const result = await pool.request()
        .input('regNo', sql.Int, deductionData.regNo)
        .input('route', sql.NVarChar, deductionData.route)
        .input('dealer', sql.NVarChar, deductionData.supplierName)
        .input('leafType', sql.NVarChar, deductionData.leafType)
        .input('qty', sql.Int, parseInt(deductionData.bags) || 0)
        .input('gross', sql.Decimal(10,2), parseFloat(deductionData.gross) || 0)
        .input('bagWeight', sql.Decimal(10,2), parseFloat(deductionData.bagWeight) || 0)
        .input('water', sql.Decimal(10,2), parseFloat(deductionData.water) || 0)
        .input('coarse', sql.Decimal(10,2), parseFloat(deductionData.coarce) || 0)
        .input('rejected', sql.Decimal(10,2), parseFloat(deductionData.rejected) || 0)
        .input('boild', sql.Decimal(10,2), parseFloat(deductionData.boiled) || 0)
        .input('netWeight', sql.Decimal(10,2), parseFloat(deductionData.netWeight) || 0)
        .input('shift', sql.NVarChar, shift)
        .input('userName', sql.NVarChar, deductionData.userName)
        .input('mode', sql.NVarChar, 'mobile')
        .input('pcName', sql.NVarChar, pcName)
        .input('isDeduction', sql.Bit, 1)
        .input('monthName', sql.NVarChar, deductionData.month)
        .query(`
          INSERT INTO [BoughtLeaf_Kandedola].[dbo].[Tr_LeafCollection_Temp] (
            [RegNo], [Route], [Dealer], [LeafType], [Qty], [Gross],
            [BagWeight], [Water], [Coarse], [Rejected], [Boild],
            [NetWeight], [Shift], [UserName], [Mode], [PC_Name],
            [IsDeduction], [MonthName], [LogTime]
          ) VALUES (
            @regNo, @route, @dealer, @leafType, @qty, @gross,
            @bagWeight, @water, @coarse, @rejected, @boild,
            @netWeight, @shift, @userName, @mode, @pcName,
            @isDeduction, @monthName, GETDATE()
          );
          
          SELECT SCOPE_IDENTITY() as Ind;
        `);
      
      return {
        success: true,
        ind: result.recordset[0].Ind,
        message: 'Deduction saved successfully'
      };
    } catch (error) {
      console.error('Error in saveDeduction:', error);
      throw error;
    }
  }
}

module.exports = new DbService();