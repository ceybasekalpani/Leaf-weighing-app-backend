const sql = require('mssql/msnodesqlv8');
require('dotenv').config();

const dbHost = process.env.DB_SERVER || '68.178.166.190';
const dbPort = process.env.DB_PORT || '1434';

// Main DB (BoughtLeaf_Kandedola)
const mainDbConfig = {
  connectionString: `Driver={ODBC Driver 17 for SQL Server};Server=${dbHost},${dbPort};Database=${process.env.DB_DATABASE};UID=${process.env.DB_DATABASE_USER};PWD=${process.env.DB_DATABASE_PASSWORD};Encrypt=yes;TrustServerCertificate=yes;`,
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

// Setup DB (Setup_tbl_Kandedola)
const setupDbConfig = {
  connectionString: `Driver={ODBC Driver 17 for SQL Server};Server=${dbHost},${dbPort};Database=${process.env.DB_NAME};UID=${process.env.DB_DATABASE_USER};PWD=${process.env.DB_DATABASE_PASSWORD};Encrypt=yes;TrustServerCertificate=yes;`,
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

let mainPool = null;
let setupPool = null;

const getMainConnection = async () => {
  if (mainPool) return mainPool;
  mainPool = new sql.ConnectionPool(mainDbConfig);
  await mainPool.connect();
  return mainPool;
};

const getSetupConnection = async () => {
  if (setupPool) return setupPool;
  setupPool = new sql.ConnectionPool(setupDbConfig);
  await setupPool.connect();
  return setupPool;
};

module.exports = { getMainConnection, getSetupConnection, sql };
