const { getConnection, sql } = require('./src/config/database');

async function testDB() {
  try {
    console.log('Testing database connection...');
    const pool = await getConnection();
    
    // Simple query to test
    const result = await pool.request()
      .query('SELECT TOP 1 * FROM [BoughtLeaf_Kandedola].[dbo].[Tr_LeafCollection_Temp]');
    
    console.log('✅ Database query successful!');
    console.log('Sample data:', result.recordset[0]);
    
  } catch (error) {
    console.error('❌ Database error:', error);
  }
}

testDB();