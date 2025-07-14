const mysql = require('mysql2/promise');
const csv = require('csv-parser');
const fs = require('fs');
require('dotenv').config();

// Database configuration from environment variables
const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: 3306,
  database: process.env.DB_NAME || 'finance_tracker',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
};

console.log('🚀 Starting import script...');
console.log(`🔗 Database: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
console.log(`👤 User: ${dbConfig.user}`);

/**
 * Check if a transaction already exists in the database (previously uploaded)
 */
async function checkExistingInDatabase(connection, transaction) {
  const { date, description, amount } = transaction;
  
  // Check if this exact transaction already exists in the database
  const [existing] = await connection.query(
    'SELECT id FROM transactions WHERE date = ? AND description = ? AND amount = ?',
    [date, description, amount]
  );
  
  return existing.length > 0;
}

/**
 * Remove duplicate transactions from the database
 */
async function removeDuplicates(connection) {
  console.log('🧹 Removing duplicate transactions...');
  
  try {
    // Find and remove duplicates based on date, description, and amount
    // But be more conservative - only remove exact duplicates that are clearly errors
    const [duplicates] = await connection.query(`
      DELETE t1 FROM transactions t1
      INNER JOIN transactions t2 
      WHERE t1.id > t2.id 
      AND t1.date = t2.date 
      AND t1.description = t2.description 
      AND t1.amount = t2.amount
      AND t1.category = t2.category
      AND t1.bank = t2.bank
      AND t1.month = t2.month
    `);
    
    console.log(`   ✅ Removed ${duplicates.affectedRows} exact duplicate transactions`);
    
    return duplicates.affectedRows;
  } catch (error) {
    console.error('❌ Error removing duplicates:', error.message);
    return 0;
  }
}

/**
 * Import categorized CSV into database
 */
async function importCategorizedCsv(csvFilePath) {
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
    
    // Check if CSV file exists
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`CSV file does not exist: ${csvFilePath}`);
    }
    
    // Remove duplicates before importing new data
    const removedDuplicates = await removeDuplicates(connection);
    
    // Read and process CSV
    console.log(`📁 Reading categorized CSV: ${csvFilePath}`);
    
    const transactions = await readCsvFile(csvFilePath);
    console.log(`📊 Found ${transactions.length} transactions to import`);
    
    if (transactions.length === 0) {
      console.log('⚠️  No transactions found to import');
      return [];
    }
    
    // Insert transactions into database
    console.log('💾 Inserting transactions into database...');
    console.log(`⏱️  Estimated time: ${Math.ceil(transactions.length * 0.1)} seconds (${transactions.length} transactions × 0.1s each)`);
    
    let insertedCount = 0;
    let skippedCount = 0;
    
    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i];
      console.log(`\n🔄 Processing ${i + 1}/${transactions.length}: ${transaction.description}`);
      console.log(`   💰 Amount: $${transaction.amount}`);
      console.log(`   📅 Date: ${transaction.date}`);
      console.log(`   🏷️  Category: ${transaction.category}`);
      
      try {
        // Check if the transaction already exists in the database
        const isDuplicate = await checkExistingInDatabase(connection, transaction);
        
        if (isDuplicate) {
          console.log(`   ⏭️  Skipping duplicate: ${transaction.description} (${transaction.category})`);
          skippedCount++;
          continue;
        }
        
        // Insert new transaction
        console.log(`   💾 Inserting new transaction...`);
        await connection.query(
          'INSERT INTO transactions (date, description, amount, category, bank, month, llmCategorized) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            transaction.date,
            transaction.description,
            transaction.amount,
            transaction.category,
            transaction.bank,
            transaction.month,
            transaction.llmCategorized
          ]
        );
        
        insertedCount++;
        console.log(`   ✅ Inserted: ${transaction.description} (${transaction.category})`);
        
      } catch (error) {
        console.error(`   ❌ Error inserting transaction: ${error.message}`);
        console.error(`   ❌ Full error:`, error);
      }
    }
    
    // Remove duplicates again after import to clean up any that might have been created
    console.log('\n🧹 Final duplicate cleanup...');
    const finalRemovedDuplicates = await removeDuplicates(connection);
    
    console.log('\n🎉 Import completed!');
    console.log(`📊 Summary:`);
    console.log(`   Inserted: ${insertedCount} transactions`);
    console.log(`   Skipped: ${skippedCount} duplicates (already in database)`);
    console.log(`   Removed exact duplicates before import: ${removedDuplicates}`);
    console.log(`   Removed exact duplicates after import: ${finalRemovedDuplicates}`);
    console.log(`   Total exact duplicates removed: ${removedDuplicates + finalRemovedDuplicates}`);
    console.log(`   💡 Note: Only checks for duplicates against existing database records`);
    
    // Show category breakdown
    const categoryCount = {};
    transactions.forEach(t => {
      categoryCount[t.category] = (categoryCount[t.category] || 0) + 1;
    });
    
    console.log(`   Category breakdown:`);
    Object.entries(categoryCount).forEach(([category, count]) => {
      console.log(`     ${category}: ${count}`);
    });
    
    return transactions;
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    console.error('❌ Full error:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

/**
 * Read CSV file and return transactions array
 */
function readCsvFile(csvFilePath) {
  console.log('📖 Reading CSV file...');
  
  return new Promise((resolve, reject) => {
    const transactions = [];
    let lineCount = 0;
    
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row) => {
        lineCount++;
        if (lineCount % 10 === 0) {
          console.log(`   📖 Read ${lineCount} lines...`);
        }
        
        transactions.push({
          date: row.date,
          description: row.description,
          amount: parseFloat(row.amount),
          category: row.category,
          bank: row.bank,
          month: row.month,
          llmCategorized: row.llmCategorized === 'true'
        });
      })
      .on('end', () => {
        console.log(`✅ CSV reading complete. Processed ${lineCount} lines, found ${transactions.length} transactions`);
        resolve(transactions);
      })
      .on('error', (error) => {
        console.error('❌ Error reading CSV:', error);
        reject(error);
      });
  });
}

/**
 * CLI interface
 */
async function main() {
  console.log('🚀 Starting import script...');
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: node import-categorized-csv.js <categorized-csv-file>');
    console.log('');
    console.log('Example:');
    console.log('  node import-categorized-csv.js categorized-transactions.csv');
    return;
  }
  
  const csvFile = args[0];
  console.log(`📂 CSV file: ${csvFile}`);
  
  try {
    await importCategorizedCsv(csvFile);
    console.log('🎉 Import script completed successfully!');
  } catch (error) {
    console.error('❌ Failed to import CSV:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  importCategorizedCsv,
  removeDuplicates
}; 