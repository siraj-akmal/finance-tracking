const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configuration from environment variables
const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: 3306,
  database: process.env.DB_NAME || 'finance_tracker',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
};

async function clearDatabase() {
  let connection;
  
  try {
    console.log('🔌 Connecting to MySQL...');
    
    connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
    });
    
    console.log('✅ Connected to MySQL successfully');
    
    // Clear all existing data
    console.log('🧹 Clearing all data from database...');
    
    // Delete all records from each table
    await connection.query('DELETE FROM transactions');
    await connection.query('DELETE FROM budgets');
    await connection.query('DELETE FROM income');
    await connection.query('DELETE FROM savings');
    
    // Reset auto-increment counters
    console.log('🔄 Resetting auto-increment counters...');
    await connection.query('ALTER TABLE transactions AUTO_INCREMENT = 1');
    await connection.query('ALTER TABLE budgets AUTO_INCREMENT = 1');
    await connection.query('ALTER TABLE income AUTO_INCREMENT = 1');
    await connection.query('ALTER TABLE savings AUTO_INCREMENT = 1');
    
    console.log('✅ Database cleared successfully!');
    console.log('📊 All tables are now empty:');
    console.log('   - transactions: 0 records');
    console.log('   - budgets: 0 records');
    console.log('   - income: 0 records');
    console.log('   - savings: 0 records');
    
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the function
clearDatabase()
  .then(() => {
    console.log('🎉 Database clearing completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Database clearing failed:', error);
    process.exit(1);
  }); 