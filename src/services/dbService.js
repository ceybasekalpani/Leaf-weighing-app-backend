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

  // Get today's deductions summary for a specific registration number and leaf type
  async getTodayDeductionSummary(regNo, leafType) {
    try {
      const pool = await getConnection();
      const today = new Date().toISOString().split('T')[0];
      
      console.log(`📊 Getting TODAY'S summary for RegNo: ${regNo}, LeafType: ${leafType}`);
      
      const result = await pool.request()
        .input('regNo', sql.Int, regNo)
        .input('leafType', sql.NVarChar, leafType)
        .input('today', sql.Date, today)
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
            AND CAST([LogTime] AS DATE) = @today
        `);
      
      if (!result.recordset[0] || result.recordset[0].TotalBags === 0) {
        return {
          TotalBags: 0,
          TotalGross: 0,
          TotalBagWeight: 0,
          TotalCoarse: 0,
          TotalWater: 0,
          TotalBoiled: 0,
          TotalRejected: 0,
          TotalNetWeight: 0,
          TransactionCount: 0
        };
      }
      
      return result.recordset[0];
    } catch (error) {
      console.error('Error in getTodayDeductionSummary:', error);
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
            [Mode],
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

  // Save new deduction - creates ONE NEW RECORD per entry with IsDeduction = 1
  async saveDeduction(deductionData) {
    try {
      const pool = await getConnection();
      
      // Log the complete received data for debugging
      console.log('📥 COMPLETE RECEIVED DATA:', JSON.stringify(deductionData, null, 2));
      
      // Determine shift based on current time
      const currentHour = new Date().getHours();
      const shift = currentHour < 12 ? 'Morning' : 'Evening';
      
      // Get PC name
      const pcName = deductionData.pcName || 'MOBILE_APP';
      
      // Get day number from current date
      const dayNo = new Date().getDate();
      
      // Get current month name if not provided
      const monthName = deductionData.month || new Date().toLocaleString('default', { month: 'short', year: 'numeric' });
      
      // IMPORTANT: Explicitly extract and parse each value with fallbacks
      
      // Registration number (required)
      const regNo = parseInt(deductionData.regNo) || parseInt(deductionData.RegNo) || 0;
      if (!regNo) {
        throw new Error('Registration number is required');
      }
      
      // Route
      const route = deductionData.route || deductionData.Route || '';
      
      // Supplier/Dealer name
      const dealer = deductionData.supplierName || deductionData.SupplierName || deductionData.dealer || deductionData.Dealer || '';
      
      // Leaf type
      const leafType = deductionData.leafType || deductionData.LeafType || 'Normal';
      
      // Bags/Qty - each save creates one row
      const qty = 1; // Always 1 for each deduction entry
      
      // Gross - the current gross from summary
      const gross = parseFloat(deductionData.Gross) || 0;
      
      // BagWeight
      const bagWeight = parseFloat(deductionData.BagWeight) || 0;
      
      // Coarse
      const coarse = parseFloat(deductionData.Coarse) || 0;
      
      // Water
      const water = parseFloat(deductionData.Water) || 0;
      
      // Boiled/Boild
      const boild = parseFloat(deductionData.Boild) || parseFloat(deductionData.Boiled) || 0;
      
      // Rejected
      const rejected = parseFloat(deductionData.Rejected) || 0;
      
      // NetWeight
      const netWeight = parseFloat(deductionData.NetWeight) || 0;
      
      // User name - from logged-in user
      const userName = deductionData.userName || 'mobile_user';
      
      // Mode - from logged-in user (A for Auto, M for Manual)
      const mode = deductionData.mode || 'A';
      
      // Log the mapped values to verify they're correct
      console.log('📊 MAPPED VALUES FOR DATABASE:', {
        regNo,
        route,
        dealer,
        leafType,
        qty,
        gross,
        bagWeight,
        coarse,
        water,
        boild,
        rejected,
        netWeight,
        shift,
        userName,
        mode,
        pcName,
        isDeduction: 1,
        monthName,
        dayNo
      });
      
      // Execute the insert query with explicit parameter mapping
      const result = await pool.request()
        .input('regNo', sql.Int, regNo)
        .input('route', sql.NVarChar, route)
        .input('dealer', sql.NVarChar, dealer)
        .input('leafType', sql.NVarChar, leafType)
        .input('qty', sql.Int, qty)
        .input('gross', sql.Decimal(10,2), gross)
        .input('bagWeight', sql.Decimal(10,2), bagWeight)
        .input('water', sql.Decimal(10,2), water)
        .input('coarse', sql.Decimal(10,2), coarse)
        .input('rejected', sql.Decimal(10,2), rejected)
        .input('boild', sql.Decimal(10,2), boild)
        .input('netWeight', sql.Decimal(10,2), netWeight)
        .input('shift', sql.NVarChar, shift)
        .input('userName', sql.NVarChar, userName)
        .input('mode', sql.NVarChar, mode) // Add mode parameter
        .input('pcName', sql.NVarChar, pcName)
        .input('isDeduction', sql.Bit, 1)
        .input('monthName', sql.NVarChar, monthName)
        .input('dayNo', sql.Int, dayNo)
        .query(`
          INSERT INTO [BoughtLeaf_Kandedola].[dbo].[Tr_LeafCollection_Temp] (
            [RegNo], [Route], [Dealer], [LeafType], [Qty], [Gross],
            [BagWeight], [Water], [Coarse], [Rejected], [Boild],
            [NetWeight], [Shift], [UserName], [Mode], [PC_Name],
            [IsDeduction], [MonthName], [DayNo], [LogTime]
          ) VALUES (
            @regNo, @route, @dealer, @leafType, @qty, @gross,
            @bagWeight, @water, @coarse, @rejected, @boild,
            @netWeight, @shift, @userName, @mode, @pcName,
            @isDeduction, @monthName, @dayNo, GETDATE()
          );
          
          SELECT SCOPE_IDENTITY() as Ind;
        `);
      
      console.log('✅ SAVE SUCCESSFUL! Ind:', result.recordset[0].Ind);
      
      return {
        success: true,
        ind: result.recordset[0].Ind,
        message: 'Deduction saved successfully'
      };
    } catch (error) {
      console.error('❌ ERROR in saveDeduction:', error);
      throw error;
    }
  }
}

module.exports = new DbService();