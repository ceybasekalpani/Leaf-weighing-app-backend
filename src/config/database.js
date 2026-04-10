const sql = require('mssql/msnodesqlv8'); 
require('dotenv').config();

// Use the DSN we just created in the ODBC Administrator
// const dbConfig = {
//   //connectionString: `DSN=BoughtLeaf_Kandedola;Trusted_Connection=yes;`,

//   connectionString: `Data Source=68.178.166.190,1434;Initial Catalog=BoughtLeaf_Kandedola;Persist Security Info=True;User ID=sa;Password=Cey_2025;Encrypt=True;Trust Server Certificate=True;`,
//   options: {
//     trustServerCertificate: true, 
//   },
//   pool: {
//     max: 10,
//     min: 0,
//     idleTimeoutMillis: 30000
//   }
// };


const dbConfig = {
  connectionString: `Driver={ODBC Driver 17 for SQL Server};Server=68.178.166.190,1434;Database=BoughtLeaf_Kandedola;UID=sa;PWD=Cey_2025;Encrypt=yes;TrustServerCertificate=yes;`,
};

console.log('🚀 Attempting to connect using DSN: TeaFactoryDB');
let pool = null;

const getConnection = async () => {
  try {
    if (pool) {
      return pool;
    }

    pool = await sql.connect(dbConfig);
    console.log('✅ Connected to SQL Server successfully using Windows Authentication!');
    return pool;
  } catch (err) {
    console.error('❌ Database connection failed:');
    console.error('Error:', err.message);
    throw err;
  }
};

module.exports = {
  getConnection,
  sql
};