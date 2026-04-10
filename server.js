const app = require('./src/app');
const { getMainConnection, getSetupConnection } = require('./src/config/database');

const PORT = process.env.PORT || 5000;

// Test database connection and start server
const startServer = async () => {
  try {
    // Test both database connections
    await getMainConnection();
    await getSetupConnection();
    console.log('✅ Both databases connected successfully');
    
    // Start server
    app.listen(PORT, () => {
      console.log(`✅ Server is running on port ${PORT}`);
      console.log(`📍 API available at http://localhost:${PORT}/api`);
      console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
    }); 
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  process.exit(0);
});
