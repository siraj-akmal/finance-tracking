const { processCsvFile } = require('./categorize-csv.js');
const { importCategorizedCsv } = require('./import-categorized-csv.js');
const fs = require('fs').promises;

/**
 * Complete workflow: categorize CSV and import to database
 */
async function processAndImportCsv(inputFilePath, outputFilePath = null) {
  try {
    console.log('🚀 Starting CSV processing and import workflow...');
    
    // Generate output filename if not provided
    if (!outputFilePath) {
      const baseName = inputFilePath.replace('.csv', '');
      outputFilePath = `${baseName}_categorized.csv`;
    }
    
    console.log(`📁 Input file: ${inputFilePath}`);
    console.log(`📤 Categorized output: ${outputFilePath}`);
    
    // Step 1: Categorize the CSV
    console.log('\n🤖 Step 1: Categorizing transactions with Ollama...');
    const transactions = await processCsvFile(inputFilePath, outputFilePath);
    
    // Step 2: Import to database
    console.log('\n💾 Step 2: Importing to database...');
    await importCategorizedCsv(outputFilePath);
    
    console.log('\n🎉 Workflow completed successfully!');
    console.log(`📊 Total transactions processed: ${transactions.length}`);
    
    // Clean up temporary file
    try {
      await fs.unlink(outputFilePath);
      console.log(`🧹 Cleaned up temporary file: ${outputFilePath}`);
    } catch (error) {
      console.log(`⚠️  Could not clean up temporary file: ${outputFilePath}`);
    }
    
  } catch (error) {
    console.error('❌ Workflow failed:', error.message);
    throw error;
  }
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: node process-and-import-csv.js <input-csv-file> [output-csv-file]');
    console.log('');
    console.log('This script will:');
    console.log('  1. Categorize transactions using Ollama');
    console.log('  2. Import categorized transactions to database');
    console.log('  3. Clean up temporary files');
    console.log('');
    console.log('Examples:');
    console.log('  node process-and-import-csv.js activity.csv');
    console.log('  node process-and-import-csv.js activity.csv temp_categorized.csv');
    return;
  }
  
  const inputFile = args[0];
  const outputFile = args[1] || null;
  
  try {
    await processAndImportCsv(inputFile, outputFile);
  } catch (error) {
    console.error('❌ Failed to process and import CSV:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  processAndImportCsv
}; 