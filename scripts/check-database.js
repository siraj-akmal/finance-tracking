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

async function checkDatabase() {
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
    
    // Check table counts
    const [transactionCount] = await connection.query('SELECT COUNT(*) as count FROM transactions');
    const [budgetCount] = await connection.query('SELECT COUNT(*) as count FROM budgets');
    const [incomeCount] = await connection.query('SELECT COUNT(*) as count FROM income');
    const [savingsCount] = await connection.query('SELECT COUNT(*) as count FROM savings');
    
    console.log('📊 Current data counts:');
    console.log(`   Transactions: ${transactionCount[0].count}`);
    console.log(`   Budgets: ${budgetCount[0].count}`);
    console.log(`   Income: ${incomeCount[0].count}`);
    console.log(`   Savings: ${savingsCount[0].count}`);
    
    // Check categories in transactions
    const [categories] = await connection.query('SELECT DISTINCT category FROM transactions ORDER BY category');
    console.log('📋 Categories in transactions:', categories.map(row => row.category).join(', '));
    
    // Check sample transactions
    const [sampleTransactions] = await connection.query('SELECT date, description, amount, category FROM transactions LIMIT 5');
    console.log('📝 Sample transactions:');
    sampleTransactions.forEach(t => {
      console.log(`   ${t.date} | ${t.description} | $${t.amount} | ${t.category}`);
    });
    
    // Check budgets
    const [budgets] = await connection.query('SELECT category, budgeted FROM budgets LIMIT 5');
    console.log('💰 Sample budgets:');
    budgets.forEach(b => {
      console.log(`   ${b.category}: $${b.budgeted}`);
    });
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

checkDatabase(); 