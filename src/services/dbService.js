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
          -- For bags (Qty): sum from entries where IsDeduction = 0 (original collections)
          ISNULL(SUM(CASE WHEN [IsDeduction] = 0 THEN [Qty] ELSE 0 END), 0) as TotalBags,
          
          -- For gross: sum from entries where IsDeduction = 0 (original collections)
          ISNULL(SUM(CASE WHEN [IsDeduction] = 0 THEN [Gross] ELSE 0 END), 0) as TotalGross,
          
          -- For deduction totals: sum from entries where IsDeduction = 1
          ISNULL(SUM(CASE WHEN [IsDeduction] = 1 THEN [BagWeight] ELSE 0 END), 0) as TotalBagWeight,
          ISNULL(SUM(CASE WHEN [IsDeduction] = 1 THEN [Coarse] ELSE 0 END), 0) as TotalCoarse,
          ISNULL(SUM(CASE WHEN [IsDeduction] = 1 THEN [Water] ELSE 0 END), 0) as TotalWater,
          ISNULL(SUM(CASE WHEN [IsDeduction] = 1 THEN [Boild] ELSE 0 END), 0) as TotalBoiled,
          ISNULL(SUM(CASE WHEN [IsDeduction] = 1 THEN [Rejected] ELSE 0 END), 0) as TotalRejected,
          
          -- For net weight: sum from entries where IsDeduction = 0 (original collections)
          ISNULL(SUM(CASE WHEN [IsDeduction] = 0 THEN [NetWeight] ELSE 0 END), 0) as TotalNetWeight,
          
          -- Count only deduction transactions
          COUNT(CASE WHEN [IsDeduction] = 1 THEN 1 ELSE NULL END) as TransactionCount
        FROM [BoughtLeaf_Kandedola].[dbo].[Tr_LeafCollection_Temp]
        WHERE [RegNo] = @regNo 
          AND [LeafType] = @leafType
          AND CAST([LogTime] AS DATE) = @today
      `);
    
    // Always return the recordset, even if all values are 0
    return result.recordset[0] || {
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
    
    // Get mode from deductionData or default to 'App'
    const mode = deductionData.mode || 'App';
    
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
    
    // For deduction entries:
    const qty = 1; // Each deduction is one transaction
    const gross = 0; // Gross should be 0 for deductions
    
    // Deduction values - handle all possible field name variations
    const bagWeight = parseFloat(deductionData.BagWeight) || parseFloat(deductionData.bagWeight) || 0;
    
    // Handle Coarse field variations
    const coarse = parseFloat(deductionData.Coarse) || 
                   parseFloat(deductionData.coarse) || 
                   parseFloat(deductionData.coarce) || 0;
    
    const water = parseFloat(deductionData.Water) || parseFloat(deductionData.water) || 0;
    
    // Handle Boiled field variations
    const boild = parseFloat(deductionData.Boild) ||
                  parseFloat(deductionData.boild) ||
                  parseFloat(deductionData.Boiled) ||
                  parseFloat(deductionData.boiled) || 0;
    
    const rejected = parseFloat(deductionData.Rejected) || parseFloat(deductionData.rejected) || 0;
    
    // NetWeight should be 0 for deduction entries
    const netWeight = 0;
    
    // User name
    const userName = deductionData.userName || deductionData.UserName || 'mobile_user';
    
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
      mode,  // Now using the mode from request
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
      .input('mode', sql.NVarChar, mode)  // Using the mode from request
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

// Add these methods to your existing dbService.js file inside the class

// Get today's collections grouped by registration number (combining both original collections and deductions)
async getTodayGroupedCollections() {
  try {
    const pool = await getConnection();
    const today = new Date().toISOString().split('T')[0];
    
    console.log(`📊 Getting TODAY'S grouped collections for date: ${today}`);
    
    const result = await pool.request()
      .input('today', sql.Date, today)
      .query(`
        SELECT 
          [RegNo],
          MAX([Dealer]) as SupplierName,
          MAX([Route]) as Route,
          
          -- Total Bags (sum Qty where IsDeduction = 0)
          ISNULL(SUM(CASE WHEN [IsDeduction] = 0 THEN [Qty] ELSE 0 END), 0) as TotalBags,
          
          -- Gross Weight (sum Gross where IsDeduction = 0)
          ISNULL(SUM(CASE WHEN [IsDeduction] = 0 THEN [Gross] ELSE 0 END), 0) as TotalGross,
          
          -- Total Deductions (sum all deduction fields where IsDeduction = 1)
          ISNULL(SUM(CASE WHEN [IsDeduction] = 1 THEN [BagWeight] ELSE 0 END), 0) as TotalBagWeight,
          ISNULL(SUM(CASE WHEN [IsDeduction] = 1 THEN [Coarse] ELSE 0 END), 0) as TotalCoarse,
          ISNULL(SUM(CASE WHEN [IsDeduction] = 1 THEN [Water] ELSE 0 END), 0) as TotalWater,
          ISNULL(SUM(CASE WHEN [IsDeduction] = 1 THEN [Boild] ELSE 0 END), 0) as TotalBoiled,
          ISNULL(SUM(CASE WHEN [IsDeduction] = 1 THEN [Rejected] ELSE 0 END), 0) as TotalRejected,
          
          -- Net Weight (sum NetWeight where IsDeduction = 0)
          ISNULL(SUM(CASE WHEN [IsDeduction] = 0 THEN [NetWeight] ELSE 0 END), 0) as TotalNetWeight,
          
          -- Count transactions for information
          COUNT(*) as TransactionCount,
          SUM(CASE WHEN [IsDeduction] = 0 THEN 1 ELSE 0 END) as CollectionCount,
          SUM(CASE WHEN [IsDeduction] = 1 THEN 1 ELSE 0 END) as DeductionCount
          
        FROM [BoughtLeaf_Kandedola].[dbo].[Tr_LeafCollection_Temp]
        WHERE CAST([LogTime] AS DATE) = @today
        GROUP BY [RegNo]
        ORDER BY [RegNo]
      `);
    
    // Format the results for the frontend
    const formattedResults = result.recordset.map(item => ({
      regNo: item.RegNo,
      supplierName: item.SupplierName || `Supplier ${item.RegNo}`,
      route: item.Route || '',
      bags: Math.round(item.TotalBags || 0).toString(),
      gross: Math.round(item.TotalGross || 0).toString(),
      totalBagWeight: Math.round(item.TotalBagWeight || 0).toString(),
      totalCoarce: Math.round(item.TotalCoarse || 0).toString(),
      totalWater: Math.round(item.TotalWater || 0).toString(),
      totalBoiled: Math.round(item.TotalBoiled || 0).toString(),
      totalRejected: Math.round(item.TotalRejected || 0).toString(),
      netWeight: Math.round(item.TotalNetWeight || 0).toString(),
      transactionCount: item.TransactionCount,
      collectionCount: item.CollectionCount,
      deductionCount: item.DeductionCount,
      date: today,
      month: new Date().toLocaleString('default', { month: 'short', year: 'numeric' })
    }));
    
    return formattedResults;
  } catch (error) {
    console.error('Error in getTodayGroupedCollections:', error);
    throw error;
  }
}

// Get grouped collections by specific date
async getGroupedCollectionsByDate(date) {
  try {
    const pool = await getConnection();
    
    console.log(`📊 Getting grouped collections for date: ${date}`);
    
    const result = await pool.request()
      .input('date', sql.Date, date)
      .query(`
        SELECT 
          [RegNo],
          MAX([Dealer]) as SupplierName,
          MAX([Route]) as Route,
          
          -- Total Bags (sum Qty where IsDeduction = 0)
          ISNULL(SUM(CASE WHEN [IsDeduction] = 0 THEN [Qty] ELSE 0 END), 0) as TotalBags,
          
          -- Gross Weight (sum Gross where IsDeduction = 0)
          ISNULL(SUM(CASE WHEN [IsDeduction] = 0 THEN [Gross] ELSE 0 END), 0) as TotalGross,
          
          -- Total Deductions (sum all deduction fields where IsDeduction = 1)
          ISNULL(SUM(CASE WHEN [IsDeduction] = 1 THEN [BagWeight] ELSE 0 END), 0) as TotalBagWeight,
          ISNULL(SUM(CASE WHEN [IsDeduction] = 1 THEN [Coarse] ELSE 0 END), 0) as TotalCoarse,
          ISNULL(SUM(CASE WHEN [IsDeduction] = 1 THEN [Water] ELSE 0 END), 0) as TotalWater,
          ISNULL(SUM(CASE WHEN [IsDeduction] = 1 THEN [Boild] ELSE 0 END), 0) as TotalBoiled,
          ISNULL(SUM(CASE WHEN [IsDeduction] = 1 THEN [Rejected] ELSE 0 END), 0) as TotalRejected,
          
          -- Net Weight (sum NetWeight where IsDeduction = 0)
          ISNULL(SUM(CASE WHEN [IsDeduction] = 0 THEN [NetWeight] ELSE 0 END), 0) as TotalNetWeight
          
        FROM [BoughtLeaf_Kandedola].[dbo].[Tr_LeafCollection_Temp]
        WHERE CAST([LogTime] AS DATE) = @date
        GROUP BY [RegNo]
        ORDER BY [RegNo]
      `);
    
    // Format the results for the frontend
    const formattedResults = result.recordset.map(item => ({
      regNo: item.RegNo,
      supplierName: item.SupplierName || `Supplier ${item.RegNo}`,
      route: item.Route || '',
      bags: Math.round(item.TotalBags || 0).toString(),
      gross: Math.round(item.TotalGross || 0).toString(),
      totalBagWeight: Math.round(item.TotalBagWeight || 0).toString(),
      totalCoarce: Math.round(item.TotalCoarse || 0).toString(),
      totalWater: Math.round(item.TotalWater || 0).toString(),
      totalBoiled: Math.round(item.TotalBoiled || 0).toString(),
      totalRejected: Math.round(item.TotalRejected || 0).toString(),
      netWeight: Math.round(item.TotalNetWeight || 0).toString(),
      date: date,
      month: new Date(date).toLocaleString('default', { month: 'short', year: 'numeric' })
    }));
    
    return formattedResults;
  } catch (error) {
    console.error('Error in getGroupedCollectionsByDate:', error);
    throw error;
  }
}
}

module.exports = new DbService();