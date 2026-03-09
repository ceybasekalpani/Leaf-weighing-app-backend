// const { getConnection, sql } = require('../config/database');

// const getLoginAuditTable = () => {
//   const table = process.env.LOGIN_AUDIT_TABLE || '[Setup_tbl_Kandedola].[dbo].[UserLoginAudit]';
//   if (!/^[\[\]\w.]+$/.test(table)) {
//     throw new Error('Invalid LOGIN_AUDIT_TABLE format');
//   }
//   return table;
// };

// const getClientIp = (req) => {
//   const forwardedFor = req.headers['x-forwarded-for'];
//   if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
//     return forwardedFor.split(',')[0].trim();
//   }
//   return req.ip || req.socket?.remoteAddress || null;
// };

// const saveLoginAttempt = async ({ pool, username, password, isSuccess, req }) => {
//   const auditTable = getLoginAuditTable();

//   await pool.request()
//     .input('auditUsername', sql.NVarChar, username || null)
//     .input('auditPassword', sql.NVarChar, password || null)
//     .input('isSuccess', sql.Bit, isSuccess ? 1 : 0)
//     .input('clientIp', sql.NVarChar, getClientIp(req))
//     .query(`
//       INSERT INTO ${auditTable}
//       ([UserName], [Password], [IsSuccess], [AttemptedAt], [ClientIp])
//       VALUES
//       (@auditUsername, @auditPassword, @isSuccess, GETDATE(), @clientIp)
//     `);
// };

// // Login function
// const login = async (req, res) => {
//   try {
//     const { username, password } = req.body;

//     console.log(`Login attempt for username: ${username}`);

//     if (!username || !password) {
//       return res.status(400).json({
//         success: false,
//         message: 'Username and password are required'
//       });
//     }

//     const pool = await getConnection();

//     // Query to check user credentials from UserSetup table
//     const result = await pool.request()
//       .input('username', sql.NVarChar, username)
//       .input('password', sql.NVarChar, password)
//       .query(`
//         SELECT
//           [Ind],
//           [FullName],
//           [UserName],
//           [Admin],
//           [AdminLevel],
//           [Active],
//           [TempWorker],
//           [Bl_Confirm],
//           [Bl_Report],
//           [Bl_Transfer],
//           [Bl_LeafEditDel],
//           [BackDays]
//         FROM [Setup_tbl_Kandedola].[dbo].[UserSetup]
//         WHERE [UserName] = @username
//         AND [Password] = @password
//         AND [Active] = 1
//       `);

//     if (result.recordset.length === 0) {
//       await saveLoginAttempt({
//         pool,
//         username,
//         password,
//         isSuccess: false,
//         req
//       }).catch((auditError) => {
//         console.error('Login audit insert failed:', auditError.message);
//       });

//       console.log(`Login failed for username: ${username} - Invalid credentials or inactive account`);
//       return res.status(401).json({
//         success: false,
//         message: 'Invalid username or password'
//       });
//     }

//     const user = result.recordset[0];
//     console.log(`Login successful for username: ${username}`);

//     await saveLoginAttempt({
//       pool,
//       username,
//       password,
//       isSuccess: true,
//       req
//     }).catch((auditError) => {
//       console.error('Login audit insert failed:', auditError.message);
//     });

//     // Generate a simple token (in production, use JWT)
//     const token = Buffer.from(`${user.UserName}-${Date.now()}`).toString('base64');

//     // Return user data (excluding password)
//     res.json({
//       success: true,
//       message: 'Login successful',
//       token: token,
//       user: {
//         ind: user.Ind,
//         fullName: user.FullName,
//         userName: user.UserName,
//         admin: user.Admin,
//         adminLevel: user.AdminLevel,
//         active: user.Active,
//         tempWorker: user.TempWorker,
//         permissions: {
//           confirm: user.Bl_Confirm,
//           report: user.Bl_Report,
//           transfer: user.Bl_Transfer,
//           leafEditDel: user.Bl_LeafEditDel,
//           backDays: user.BackDays
//         }
//       }
//     });

//   } catch (error) {
//     console.error('Login error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Internal server error during login',
//       error: error.message
//     });
//   }
// };

// // Verify token function (optional)
// const verifyToken = async (req, res) => {
//   try {
//     const token = req.headers.authorization?.split(' ')[1];

//     if (!token) {
//       return res.status(401).json({
//         success: false,
//         message: 'No token provided'
//       });
//     }

//     // In a real app, you would verify JWT here
//     // For now, we'll just return a simple response
//     res.json({
//       success: true,
//       message: 'Token is valid',
//       token: token
//     });

//   } catch (error) {
//     console.error('Token verification error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Token verification failed'
//     });
//   }
// };

// module.exports = {
//   login,
//   verifyToken
// };

const { getConnection, sql } = require('../config/database');

// Helper function to get database name from env
const getDatabaseName = () => {
  const dbName = process.env.DB_NAME;
  if (!dbName) {
    throw new Error('DB_NAME environment variable is not set');
  }
  // Validate database name format (allow letters, numbers, underscore)
  if (!/^[a-zA-Z0-9_]+$/.test(dbName)) {
    throw new Error('Invalid DB_NAME format');
  }
  return dbName;
};

// Helper function to get full table path with database name
const getFullTableName = (tableName) => {
  const dbName = getDatabaseName();
  return `[${dbName}].[dbo].[${tableName}]`;
};

// Get UserSetup table full path
const getUserSetupTable = () => {
  const table = process.env.USER_SETUP_TABLE || 'UserSetup';
  if (!/^[a-zA-Z0-9_]+$/.test(table)) {
    throw new Error('Invalid USER_SETUP_TABLE format');
  }
  return getFullTableName(table);
};

// Get LoginAudit table full path
const getLoginAuditTable = () => {
  const table = process.env.LOGIN_AUDIT_TABLE || 'UserLoginAudit';
  if (!/^[a-zA-Z0-9_]+$/.test(table)) {
    throw new Error('Invalid LOGIN_AUDIT_TABLE format');
  }
  return getFullTableName(table);
};

// Get Client IP
const getClientIp = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || null;
};

// Save login attempt to audit table
const saveLoginAttempt = async ({ pool, username, password, isSuccess, req }) => {
  const auditTable = getLoginAuditTable();

  await pool.request()
    .input('auditUsername', sql.NVarChar, username || null)
    .input('auditPassword', sql.NVarChar, password || null)
    .input('isSuccess', sql.Bit, isSuccess ? 1 : 0)
    .input('clientIp', sql.NVarChar, getClientIp(req))
    .query(`
      INSERT INTO ${auditTable}
      ([UserName], [Password], [IsSuccess], [AttemptedAt], [ClientIp])
      VALUES
      (@auditUsername, @auditPassword, @isSuccess, GETDATE(), @clientIp)
    `);
};

// Login function
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log(`Login attempt for username: ${username}`);

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    const pool = await getConnection();
    const userTable = getUserSetupTable();

    // Query to check user credentials from UserSetup table (completely dynamic)
    const result = await pool.request()
      .input('username', sql.NVarChar, username)
      .input('password', sql.NVarChar, password)
      .query(`
        SELECT
          [Ind],
          [FullName],
          [UserName],
          [Admin],
          [AdminLevel],
          [Active],
          [TempWorker],
          [Bl_Confirm],
          [Bl_Report],
          [Bl_Transfer],
          [Bl_LeafEditDel],
          [BackDays]
        FROM ${userTable}
        WHERE [UserName] = @username
        AND [Password] = @password
        AND [Active] = 1
      `);

    if (result.recordset.length === 0) {
      await saveLoginAttempt({
        pool,
        username,
        password,
        isSuccess: false,
        req
      }).catch((auditError) => {
        console.error('Login audit insert failed:', auditError.message);
      });

      console.log(`Login failed for username: ${username} - Invalid credentials or inactive account`);
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    const user = result.recordset[0];
    console.log(`Login successful for username: ${username}`);

    await saveLoginAttempt({
      pool,
      username,
      password,
      isSuccess: true,
      req
    }).catch((auditError) => {
      console.error('Login audit insert failed:', auditError.message);
    });

    // Generate a simple token (in production, use JWT)
    const token = Buffer.from(`${user.UserName}-${Date.now()}`).toString('base64');

    // Return user data (excluding password)
    res.json({
      success: true,
      message: 'Login successful',
      token: token,
      user: {
        ind: user.Ind,
        fullName: user.FullName,
        userName: user.UserName,
        admin: user.Admin,
        adminLevel: user.AdminLevel,
        active: user.Active,
        tempWorker: user.TempWorker,
        permissions: {
          confirm: user.Bl_Confirm,
          report: user.Bl_Report,
          transfer: user.Bl_Transfer,
          leafEditDel: user.Bl_LeafEditDel,
          backDays: user.BackDays
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login',
      error: error.message
    });
  }
};

// Verify token function
const verifyToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    res.json({
      success: true,
      message: 'Token is valid',
      token: token
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Token verification failed'
    });
  }
};

module.exports = {
  login,
  verifyToken
};