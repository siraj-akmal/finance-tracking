const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// Progress file support
let progressFile = null;
function writeProgress(currentStep, totalSteps, message) {
  if (!progressFile) return;
  const percent = Math.floor((currentStep / totalSteps) * 100);
  const data = { currentStep, totalSteps, percent, message };
  try {
    fs.writeFileSync(progressFile, JSON.stringify(data));
  } catch (e) {
    // Ignore errors
  }
}

// Configuration
const OLLAMA_URL = 'http://localhost:11434/api/generate';
const CATEGORIES = [
  'Food & Drink', 'Groceries', 'Transportation', 'Lifestyle & Entertainment', 
  'Shopping', 'Subscriptions', 'Health & Wellness', 'Gifts & Donations', 'Travel', 'Miscellaneous'
];

console.log('🤖 Starting categorization script...');
console.log(`🔗 Ollama URL: ${OLLAMA_URL}`);
console.log(`📋 Available categories (${CATEGORIES.length}): ${CATEGORIES.join(', ')}`);

/**
 * System prompt for Ollama to categorize transactions
 */
const SYSTEM_PROMPT = `You are a financial transaction categorizer. Your job is to categorize credit card transactions into one of these 10 categories:

${CATEGORIES.join(', ')}

Rules:
- Food & Drink: Restaurants, dining out, coffee shops, bars, cafes, takeout
- Groceries: Grocery stores, supermarkets, food shopping, farmers markets
- Transportation: Uber, Lyft, taxi, bus, train, subway, gas stations, parking, tolls
- Lifestyle & Entertainment: Movies, concerts, games, entertainment venues, gym, fitness
- Shopping: Retail stores, online shopping, clothing, electronics, department stores
- Subscriptions: Netflix, Spotify, software subscriptions, recurring services, memberships
- Health & Wellness: Medical expenses, pharmacy, doctor visits, dental, vision, therapy
- Gifts & Donations: Gift purchases, presents, gift cards, charitable donations
- Travel: Flights, hotels, airbnb, vacation expenses, travel insurance
- Miscellaneous: Everything else that doesn't fit the above categories

Respond with ONLY the category name, nothing else.`;

/**
 * System prompt for Ollama to clean transaction descriptions
 */
const DESCRIPTION_CLEAN_PROMPT = `You are a financial transaction description cleaner. Your job is to convert messy bank transaction descriptions into clean, readable merchant names.

Examples:
- "AplPay TABLE MERCATOBOSTON MA" → "Table Mercato"
- "PAYPAL *UBER 8665761039 CA" → "Uber"
- "TST* LOLITA COCINA &BOSTON MA" → "Lolita Cocina"
- "AplPay MBTA-55001252BOSTON MA" → "MBTA"
- "AMAZON.COM AMZN.COM/BILL WA" → "Amazon"
- "DUNKIN' MOBILE CANTON MA" → "Dunkin'"
- "AplPay STARBUCKS COFFEE BOSTON MA" → "Starbucks"

Rules:
- Remove bank prefixes like "AplPay", "PAYPAL *", "TST*"
- Remove location suffixes like "BOSTON MA", "CA", "WA"
- Remove reference numbers and codes
- Keep the main merchant name
- Use proper capitalization
- Keep it concise but recognizable

Respond with ONLY the cleaned description, nothing else.`;

/**
 * User prompt template for categorizing a transaction
 */
function createUserPrompt(transaction) {
  return `Categorize this transaction:

Description: ${transaction.Description || transaction.description || ''}
Amount: $${transaction.Amount || transaction.amount || ''}
Extended Details: ${transaction['Extended Details'] || transaction.extendedDetails || ''}
Category (if provided): ${transaction.Category || transaction.category || ''}
Appears On Statement As: ${transaction['Appears On Your Statement As'] || transaction.appearsOnStatement || ''}

Category:`;
}

/**
 * Call Ollama API to categorize a transaction
 */
async function categorizeWithOllama(transaction) {
  try {
    console.log(`   🤖 Calling Ollama for categorization: ${transaction.Description || transaction.description}`);
    
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
              body: JSON.stringify({
          model: 'mistral:latest',
          prompt: SYSTEM_PROMPT + '\n\n' + createUserPrompt(transaction),
          stream: false,
          options: {
            temperature: 0.1, // Low temperature for consistent categorization
          }
        })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    const category = data.response.trim();
    
    console.log(`   ✅ Ollama response: "${category}"`);
    
    // Validate the category is in our list
    if (!CATEGORIES.includes(category)) {
      console.warn(`⚠️  Invalid category "${category}" for transaction: ${transaction.Description || transaction.description}`);
      return 'Miscellaneous'; // Default fallback
    }
    
    return category;
  } catch (error) {
    console.error(`❌ Error categorizing transaction: ${error.message}`);
    return 'Miscellaneous'; // Default fallback
  }
}

/**
 * Call Ollama API to clean a transaction description
 */
async function cleanDescriptionWithOllama(originalDescription) {
  try {
    console.log(`   🧹 Calling Ollama for description cleaning: "${originalDescription}"`);
    
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral:latest',
        prompt: DESCRIPTION_CLEAN_PROMPT + '\n\n' + `Clean this description: ${originalDescription}`,
        stream: false,
        options: {
          temperature: 0.1, // Low temperature for consistent cleaning
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    const cleanedDescription = data.response.trim();
    
    console.log(`   ✅ Ollama cleaned description: "${cleanedDescription}"`);
    
    // Basic validation - ensure we got something reasonable
    if (!cleanedDescription || cleanedDescription.length < 2) {
      console.warn(`⚠️  Invalid cleaned description for: ${originalDescription}`);
      return originalDescription; // Fallback to original
    }
    
    return cleanedDescription;
  } catch (error) {
    console.error(`❌ Error cleaning description: ${error.message}`);
    return originalDescription; // Fallback to original
  }
}

/**
 * Parse date from various formats
 */
function parseDate(dateStr) {
  if (!dateStr) return null;
  
  // Handle MM/DD/YYYY format (AMEX)
  if (dateStr.includes('/')) {
    const [month, day, year] = dateStr.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Handle YYYY-MM-DD format
  if (dateStr.includes('-')) {
    return dateStr;
  }
  
  return null;
}

/**
 * Extract month from date (YYYY-MM format)
 */
function extractMonth(dateStr) {
  if (!dateStr) return null;
  const date = parseDate(dateStr);
  if (!date) return null;
  return date.substring(0, 7); // YYYY-MM
}

/**
 * Determine bank from CSV structure
 */
function detectBankType(headers) {
  const headerStr = headers.join(',').toLowerCase();
  
  if (headerStr.includes('extended details') && headerStr.includes('appears on your statement as')) {
    return 'amex';
  } else if (headerStr.includes('posted date') && headerStr.includes('reference number')) {
    return 'boa';
  }
  
  return 'unknown';
}

/**
 * Process AMEX CSV format
 */
async function processAmexCsv(filePath) {
  console.log('📊 Processing AMEX CSV format...');
  const transactions = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        // Skip payment transactions (negative amounts)
        if (row.Amount && parseFloat(row.Amount) < 0) {
          console.log(`   ⏭️  Skipping payment transaction: ${row.Description}`);
          return;
        }
        
        transactions.push({
          date: parseDate(row.Date),
          description: row.Description,
          amount: parseFloat(row.Amount) || 0,
          extendedDetails: row['Extended Details'],
          appearsOnStatement: row['Appears On Your Statement As'],
          originalCategory: row.Category,
          bank: 'AMEX'
        });
      })
      .on('end', () => {
        console.log(`✅ AMEX CSV processing complete. Found ${transactions.length} transactions`);
        resolve(transactions);
      })
      .on('error', reject);
  });
}

/**
 * Process Bank of America CSV format
 */
async function processBoaCsv(filePath) {
  console.log('📊 Processing Bank of America CSV format...');
  const transactions = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        // Skip payment transactions (negative amounts)
        if (row.Amount && parseFloat(row.Amount) < 0) {
          console.log(`   ⏭️  Skipping payment transaction: ${row.Description || row['Transaction Description']}`);
          return;
        }
        
        transactions.push({
          date: parseDate(row['Posted Date'] || row['Transaction Date']),
          description: row.Description || row['Transaction Description'],
          amount: parseFloat(row.Amount) || 0,
          extendedDetails: row['Memo'] || row['Transaction Memo'] || '',
          appearsOnStatement: row.Description || row['Transaction Description'],
          originalCategory: row.Category || '',
          bank: 'BOA'
        });
      })
      .on('end', () => {
        console.log(`✅ Bank of America CSV processing complete. Found ${transactions.length} transactions`);
        resolve(transactions);
      })
      .on('error', reject);
  });
}

/**
 * Convert transactions to database format
 */
function convertToDatabaseFormat(transactions) {
  return transactions.map(t => ({
    date: t.date,
    description: t.cleanedDescription || t.description, // Use cleaned description if available
    amount: -Math.abs(t.amount), // Make negative for expenses
    category: t.categorizedCategory,
    bank: t.bank,
    month: extractMonth(t.date),
    llmCategorized: true
  }));
}

/**
 * Main function to process CSV file
 */
async function processCsvFile(inputFilePath, outputFilePath, progressFileArg) {
  try {
    console.log('📁 Reading CSV file...');
    console.log(`📂 Input file: ${inputFilePath}`);
    console.log(`📂 Output file: ${outputFilePath}`);
    
    // Check if input file exists
    if (!fs.existsSync(inputFilePath)) {
      throw new Error(`Input file does not exist: ${inputFilePath}`);
    }
    
    // Read headers to detect bank type
    console.log('🔍 Reading file headers to detect bank type...');
    const fileContent = await fsPromises.readFile(inputFilePath, 'utf8');
    const lines = fileContent.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    console.log(`📋 File headers: ${headers.join(', ')}`);
    const bankType = detectBankType(headers);
    console.log(`🏦 Detected bank type: ${bankType.toUpperCase()}`);
    
    // Process transactions based on bank type
    let transactions;
    if (bankType === 'amex') {
      transactions = await processAmexCsv(inputFilePath);
    } else if (bankType === 'boa') {
      transactions = await processBoaCsv(inputFilePath);
    } else {
      throw new Error('Unsupported CSV format. Please use AMEX or Bank of America format.');
    }
    
    console.log(`📊 Found ${transactions.length} transactions to categorize`);
    
    if (transactions.length === 0) {
      console.log('⚠️  No transactions found to process');
      return [];
    }
    
    if (progressFileArg) progressFile = progressFileArg;

    // Categorize and clean descriptions using Ollama
    const totalSteps = transactions.length * 2;
    let currentStep = 0;
    writeProgress(currentStep, totalSteps, 'Starting AI processing...');
    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i];
      // Clean description first
      const cleanedDescription = await cleanDescriptionWithOllama(transaction.description);
      transaction.cleanedDescription = cleanedDescription;
      currentStep++;
      writeProgress(currentStep, totalSteps, `Cleaned name for row ${i + 1} of ${transactions.length}`);
      // Then categorize
      const category = await categorizeWithOllama(transaction);
      transaction.categorizedCategory = category;
      currentStep++;
      writeProgress(currentStep, totalSteps, `Categorized row ${i + 1} of ${transactions.length}`);
      if (i < transactions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    writeProgress(totalSteps, totalSteps, 'All rows processed!');
    
    console.log('\n📝 Converting to database format...');
    // Convert to database format
    const dbTransactions = convertToDatabaseFormat(transactions);
    
    console.log('💾 Writing categorized CSV...');
    // Write categorized CSV
    const csvWriter = createCsvWriter({
      path: outputFilePath,
      header: [
        { id: 'date', title: 'date' },
        { id: 'description', title: 'description' },
        { id: 'amount', title: 'amount' },
        { id: 'category', title: 'category' },
        { id: 'bank', title: 'bank' },
        { id: 'month', title: 'month' },
        { id: 'llmCategorized', title: 'llmCategorized' }
      ]
    });
    
    await csvWriter.writeRecords(dbTransactions);
    
    console.log(`✅ Processing complete! Output saved to: ${outputFilePath}`);
    console.log(`📊 Summary:`);
    console.log(`   Total transactions: ${dbTransactions.length}`);
    
    // Show category breakdown
    const categoryCount = {};
    dbTransactions.forEach(t => {
      categoryCount[t.category] = (categoryCount[t.category] || 0) + 1;
    });
    
    console.log(`   Category breakdown:`);
    Object.entries(categoryCount).forEach(([category, count]) => {
      console.log(`     ${category}: ${count}`);
    });
    
    // Show sample of cleaned descriptions
    console.log(`\n📝 Sample cleaned descriptions:`);
    const sampleTransactions = transactions.slice(0, 5);
    sampleTransactions.forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.description} → ${t.cleanedDescription}`);
    });
    
    return dbTransactions;
    
  } catch (error) {
    if (progressFile) writeProgress(0, 1, 'Error processing CSV');
    console.error('❌ Error processing CSV:', error.message);
    console.error('❌ Full error:', error);
    throw error;
  }
}

/**
 * CLI interface
 */
async function main() {
  console.log('🚀 Starting categorization script...');
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: node categorize-csv.js <input-csv-file> [output-csv-file] [--progress-file <path>]');
    console.log('');
    console.log('Examples:');
    console.log('  node categorize-csv.js activity.csv');
    console.log('  node categorize-csv.js activity.csv categorized-transactions.csv');
    return;
  }
  
  const inputFile = args[0];
  const outputFile = args[1] || inputFile.replace('.csv', '_categorized.csv');
  const progressFileArg = args[2];
  
  console.log(`📂 Input file: ${inputFile}`);
  console.log(`📂 Output file: ${outputFile}`);
  
  try {
    await processCsvFile(inputFile, outputFile, progressFileArg);
    console.log('🎉 Categorization script completed successfully!');
  } catch (error) {
    console.error('❌ Failed to process CSV:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  processCsvFile,
  categorizeWithOllama,
  detectBankType
}; 