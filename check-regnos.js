const { getConnection } = require('./src/config/database');

async function checkRegNos() {
  const pool = await getConnection();
  
  const result = await pool.request()
    .query('SELECT DISTINCT TOP 20 RegNo, Dealer FROM Tr_LeafCollection_Temp ORDER BY RegNo');
  
  console.log('Available Registration Numbers:');
  result.recordset.forEach((row, index) => {
    console.log(`${index + 1}. RegNo: ${row.RegNo} - ${row.Dealer}`);
  });
}

checkRegNos().catch(console.error);