// const sql = require('mssql/msnodesqlv8');
// require('dotenv').config();

// const dbHost = process.env.DB_SERVER || '68.178.166.190';
// const dbPort = process.env.DB_PORT || '1434';

// // Main DB (BoughtLeaf_Kandedola)
// const mainDbConfig = {
//   connectionString: `Driver={ODBC Driver 17 for SQL Server};Server=${dbHost},${dbPort};Database=${process.env.DB_DATABASE};UID=${process.env.DB_DATABASE_USER};PWD=${process.env.DB_DATABASE_PASSWORD};Encrypt=yes;TrustServerCertificate=yes;`,
//   connectionTimeout: 30000,
//   requestTimeout: 30000,
// };

// // Setup DB (Setup_tbl_Kandedola)
// const setupDbConfig = {
//   connectionString: `Driver={ODBC Driver 17 for SQL Server};Server=${dbHost},${dbPort};Database=${process.env.DB_NAME};UID=${process.env.DB_DATABASE_USER};PWD=${process.env.DB_DATABASE_PASSWORD};Encrypt=yes;TrustServerCertificate=yes;`,
//   connectionTimeout: 30000,
//   requestTimeout: 30000,
// };

// let mainPool = null;
// let setupPool = null;

// const getMainConnection = async () => {
//   if (mainPool) return mainPool;
//   mainPool = new sql.ConnectionPool(mainDbConfig);
//   await mainPool.connect();
//   return mainPool;
// };

// const getSetupConnection = async () => {
//   if (setupPool) return setupPool;
//   setupPool = new sql.ConnectionPool(setupDbConfig);
//   await setupPool.connect();
//   return setupPool;
// };

// module.exports = { getMainConnection, getSetupConnection, sql };



const sql = require('mssql/msnodesqlv8');
require('dotenv').config();

const dbConfig = {
  server: process.env.DB_SERVER || 'DESKTOP-445DEIC',
  database: process.env.DB_DATABASE || 'BoughtLeaf_Kandedola',
  driver: 'msnodesqlv8',
  options: {
    trustedConnection: true,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
  beforeConnect: (config) => {
    if (config.conn_str) {
      config.conn_str = config.conn_str.replace(
        "SQL Server Native Client 11.0",
        "ODBC Driver 17 for SQL Server"
      );
      console.log('🔧 Driver override applied: using ODBC Driver 17 for SQL Server');
    }
  }
};

console.log('🚀 Attempting to connect to local SQL Server...');
console.log(`📡 Server: ${dbConfig.server}`);
console.log(`💾 Database: ${dbConfig.database}`);

let mainPool = null;
let setupPool = null;

const getConnection = async () => {
  if (mainPool) return mainPool;
  mainPool = await sql.connect(dbConfig);
  console.log('✅ Connected to Main Database successfully!');
  return mainPool;
};

const getMainConnection = getConnection;

const getSetupConnection = async () => {
  if (setupPool) return setupPool;
  const setupConfig = {
    ...dbConfig,
    database: process.env.DB_NAME || 'Setup_tbl_Kandedola',
    beforeConnect: (config) => {
      if (config.conn_str) {
        config.conn_str = config.conn_str.replace(
          "SQL Server Native Client 11.0",
          "ODBC Driver 17 for SQL Server"
        );
      }
    }
  };
  setupPool = await sql.connect(setupConfig);
  console.log('✅ Connected to Setup Database successfully!');
  return setupPool;
};

module.exports = { getConnection, getMainConnection, getSetupConnection, sql };