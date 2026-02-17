const sql = require('mssql/msnodesqlv8'); // Use the native Windows driver
require('dotenv').config();

// Use the DSN we just created in the ODBC Administrator
const dbConfig = {
  connectionString: `DSN=TeaFactoryDB;Trusted_Connection=yes;`,
  options: {
    trustServerCertificate: true, // Important for local development
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
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