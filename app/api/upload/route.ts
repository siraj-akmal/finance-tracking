import { type NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { exec } from "child_process"
import { promisify } from "util"
import { progressStore } from './progress/route'
import fs from "fs"
import { setInterval } from "timers"

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  console.log('📋 Parsing form data...')
  const formData = await request.formData()
  const file = formData.get("file") as File
  const bankType = formData.get("bankType") as string
  const uploadId = formData.get("uploadId") as string || Date.now().toString()
  
  console.log(`🚀 Starting upload process with ID: ${uploadId}`)
  
  try {
    console.log(`📁 File received: ${file?.name}, size: ${file?.size} bytes`)
    console.log(`🏦 Bank type: ${bankType}`)

    if (!file || !bankType) {
      console.error('❌ Missing file or bank type')
      return NextResponse.json({ error: "Missing file or bank type" }, { status: 400 })
    }

    // Report upload start
    console.log('📤 Reporting upload start...')
    await reportProgress(uploadId, 'uploading', 5, 'Preparing to upload your file...')

    // Create uploads directory if it doesn't exist
    console.log('📁 Creating uploads directory...')
    const uploadsDir = join(process.cwd(), "uploads")
    try {
      await mkdir(uploadsDir, { recursive: true })
      console.log('✅ Uploads directory ready')
    } catch (error) {
      console.log('ℹ️  Uploads directory might already exist')
    }

    await reportProgress(uploadId, 'uploading', 15, 'Uploading file to secure servers...')

    // Save the uploaded file
    console.log('💾 Saving uploaded file...')
    const fileName = `upload_${Date.now()}.csv`
    const filePath = join(uploadsDir, fileName)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)
    console.log(`✅ File saved to: ${filePath}`)

    await reportProgress(uploadId, 'uploading', 35, 'File uploaded successfully!')

    // Create a progress file path
    const progressFilePath = join(uploadsDir, `progress_${uploadId}.json`)

    // Report categorization start
    console.log('🤖 Starting categorization process...')
    await reportProgress(uploadId, 'categorizing', 45, 'Starting AI analysis of your transactions...')

    // Run the categorization script with progress file
    try {
      console.log('🔄 Executing categorization script...')
      await reportProgress(uploadId, 'categorizing', 55, 'AI is analyzing transaction descriptions...')

      // Start polling the progress file in the background
      let polling = true
      const pollInterval = 200
      let lastPercent = 0
      const poller = setInterval(async () => {
        try {
          if (fs.existsSync(progressFilePath)) {
            const raw = fs.readFileSync(progressFilePath, 'utf8')
            const progressData = JSON.parse(raw)
            if (progressData.percent !== lastPercent) {
              lastPercent = progressData.percent
              await reportProgress(
                uploadId,
                'categorizing',
                progressData.percent,
                progressData.message
              )
            }
            if (progressData.percent >= 100) {
              polling = false
              clearInterval(poller)
            }
          }
        } catch (e) {
          // Ignore errors
        }
      }, pollInterval)

      // Pass the progress file path to the script
      console.log(`📜 Running: node scripts/categorize-csv.js "${filePath}" "${filePath.replace('.csv', '_categorized.csv')}" "${progressFilePath}"`)
      const { stdout, stderr } = await execAsync(`node scripts/categorize-csv.js "${filePath}" "${filePath.replace('.csv', '_categorized.csv')}" "${progressFilePath}"`)
      console.log('📤 Categorization stdout:', stdout)
      if (stderr) console.error('📤 Categorization stderr:', stderr)
      polling = false
      clearInterval(poller)
      
      // Extract transaction count from output
      const transactionMatch = stdout.match(/Total transactions: (\d+)/)
      const transactionCount = transactionMatch ? parseInt(transactionMatch[1]) : 0
      console.log(`📊 Extracted transaction count: ${transactionCount}`)
      
      await reportProgress(uploadId, 'categorizing', 75, `Successfully categorized ${transactionCount} transactions with AI`)
    } catch (error) {
      console.error('❌ Categorization error:', error)
      await reportProgress(uploadId, 'error', 0, 'Failed to categorize transactions', error instanceof Error ? error.message : 'Unknown error')
      return NextResponse.json({ error: "Failed to categorize transactions" }, { status: 500 })
    }

    // Report import start
    console.log('💾 Starting import process...')
    await reportProgress(uploadId, 'importing', 85, 'Preparing to import transactions...')

    // Run the import script
    const categorizedFilePath = filePath.replace('.csv', '_categorized.csv')
    console.log(`📁 Looking for categorized file: ${categorizedFilePath}`)
    
    try {
      console.log('🔄 Executing import script...')
      await reportProgress(uploadId, 'importing', 90, 'Importing transactions to your finance tracker...')
      
      console.log(`📜 Running: node scripts/import-categorized-csv.js "${categorizedFilePath}"`)
      const { stdout, stderr } = await execAsync(`node scripts/import-categorized-csv.js "${categorizedFilePath}"`)
      console.log('📤 Import stdout:', stdout)
      if (stderr) console.error('📤 Import stderr:', stderr)
      
      // Extract transaction count from import output
      const importMatch = stdout.match(/Inserted: (\d+) transactions/)
      const importedCount = importMatch ? parseInt(importMatch[1]) : 0
      console.log(`📊 Extracted imported count: ${importedCount}`)
      
      await reportProgress(uploadId, 'importing', 95, 'Finalizing import...')
      await reportProgress(uploadId, 'complete', 100, `Successfully imported ${importedCount} transactions!`, undefined, importedCount)
    } catch (error) {
      console.error('❌ Import error:', error)
      await reportProgress(uploadId, 'error', 0, 'Failed to import transactions', error instanceof Error ? error.message : 'Unknown error')
      return NextResponse.json({ error: "Failed to import transactions" }, { status: 500 })
    }

    console.log('🎉 Upload process completed successfully!')
    return NextResponse.json({
      success: true,
      message: "CSV processed successfully",
      uploadId,
      transactionCount: 0, // Will be updated by the import script
      categorizedFile: categorizedFilePath,
    })
  } catch (error) {
    console.error("❌ Upload error:", error)
    await reportProgress(uploadId, 'error', 0, 'Failed to process CSV file', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({ error: "Failed to process CSV file" }, { status: 500 })
  }
  }
 
async function reportProgress(uploadId: string, status: string, progress: number, message: string, error?: string, transactionCount?: number) {
  try {
    // Update progress directly in the store
    progressStore.set(uploadId, {
      status: status as 'uploading' | 'categorizing' | 'importing' | 'complete' | 'error',
      progress,
      message,
      transactionCount,
      error
    })
    console.log(`📊 Progress updated for ${uploadId}: ${status} - ${progress}% - ${message}`)
  } catch (error) {
    console.error('❌ Failed to report progress:', error)
  }
}

async function parseCSV(lines: string[], bankType: string) {
  const transactions = []
  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""))

    let transaction

    switch (bankType) {
      case "amex":
        transaction = parseAmexTransaction(headers, values)
        break
      case "boa":
        transaction = parseBoaTransaction(headers, values)
        break
      case "chase":
        transaction = parseChaseTransaction(headers, values)
        break
      default:
        transaction = parseGenericTransaction(headers, values)
    }

    if (transaction) {
      transactions.push(transaction)
    }
  }

  return transactions
}

function parseAmexTransaction(headers: string[], values: string[]) {
  // American Express CSV format: Date, Description, Amount
  if (values.length < 3) return null

  const dateStr = values[0].trim()
  const description = values[1].trim()
  const amountStr = values[2].trim()

  // Parse date from MM/DD/YYYY format
  let parsedDate = dateStr
  try {
    const [month, day, year] = dateStr.split("/")
    if (month && day && year) {
      parsedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
    }
  } catch (e) {
    console.warn("Date parsing failed for:", dateStr)
  }

  // Parse amount - American Express shows debits as positive, credits as negative
  const amount = Number.parseFloat(amountStr) || 0

  return {
    date: parsedDate,
    description: description,
    amount: -amount, // Convert to negative for expenses (standard accounting)
    bank: "AMEX",
    rawData: {
      originalDate: dateStr,
      originalAmount: amountStr,
    },
  }
}

function parseBoaTransaction(headers: string[], values: string[]) {
  const amount = -Math.abs(Number.parseFloat(values[2]) || 0)
  return {
    date: values[0],
    description: values[1],
    amount,
    bank: "BOA",
  }
}

function parseChaseTransaction(headers: string[], values: string[]) {
  const amount = -Math.abs(Number.parseFloat(values[3]) || 0)
  return {
    date: values[0],
    description: values[2],
    amount,
    bank: "Chase",
  }
}

function parseGenericTransaction(headers: string[], values: string[]) {
  const amount = -Math.abs(Number.parseFloat(values[2]) || 0)
  return {
    date: values[0],
    description: values[1],
    amount,
    bank: "Generic",
  }
}

async function categorizeTransactions(transactions: any[]) {
  // Mock LLM categorization with updated categories
  return transactions.map((transaction) => ({
    ...transaction,
    category: categorizeSingleTransaction(transaction.description),
    llmCategorized: true,
  }))
}

function categorizeSingleTransaction(description: string) {
  const desc = description.toLowerCase()

  // Bills - utilities, rent, insurance, etc.
  if (
    desc.includes("electric") ||
    desc.includes("water") ||
    desc.includes("gas bill") ||
    desc.includes("rent") ||
    desc.includes("mortgage") ||
    desc.includes("insurance") ||
    desc.includes("phone bill") ||
    desc.includes("internet") ||
    desc.includes("cable")
  ) {
    return "Bills"
  }

  // Subscriptions - recurring services
  if (
    desc.includes("netflix") ||
    desc.includes("spotify") ||
    desc.includes("subscription") ||
    desc.includes("monthly") ||
    desc.includes("adobe") ||
    desc.includes("office 365") ||
    desc.includes("icloud") ||
    desc.includes("amazon prime")
  ) {
    return "Subscriptions"
  }

  // Entertainment - movies, games, events
  if (
    desc.includes("movie") ||
    desc.includes("theater") ||
    desc.includes("cinema") ||
    desc.includes("game") ||
    desc.includes("entertainment") ||
    desc.includes("concert") ||
    desc.includes("event") ||
    desc.includes("ticket")
  ) {
    return "Entertainment"
  }

  // Food & Drink - restaurants, bars, coffee
  if (
    desc.includes("restaurant") ||
    desc.includes("cafe") ||
    desc.includes("coffee") ||
    desc.includes("pizza") ||
    desc.includes("bar") ||
    desc.includes("dining") ||
    desc.includes("mcdonald") ||
    desc.includes("subway") ||
    desc.includes("starbucks") ||
    desc.includes("dunkin") ||
    desc.includes("burger") ||
    desc.includes("taco") ||
    desc.includes("carmelina") ||
    desc.includes("kitchen") ||
    desc.includes("grill") ||
    desc.includes("bistro") ||
    desc.includes("deli") ||
    desc.includes("bakery")
  ) {
    return "Food & Drink"
  }

  // Groceries - supermarkets, food stores
  if (
    desc.includes("whole foods") ||
    desc.includes("safeway") ||
    desc.includes("kroger") ||
    desc.includes("walmart") ||
    desc.includes("target") ||
    desc.includes("costco") ||
    desc.includes("grocery") ||
    desc.includes("supermarket") ||
    desc.includes("market") ||
    desc.includes("food store")
  ) {
    return "Groceries"
  }

  // Health & Wellbeing - medical, pharmacy, fitness
  if (
    desc.includes("doctor") ||
    desc.includes("pharmacy") ||
    desc.includes("medical") ||
    desc.includes("hospital") ||
    desc.includes("dental") ||
    desc.includes("health") ||
    desc.includes("cvs") ||
    desc.includes("walgreens") ||
    desc.includes("gym") ||
    desc.includes("fitness") ||
    desc.includes("wellness")
  ) {
    return "Health & Wellbeing"
  }

  // Shopping - general retail, online shopping
  if (
    desc.includes("amazon") ||
    desc.includes("ebay") ||
    desc.includes("store") ||
    desc.includes("shop") ||
    desc.includes("mall") ||
    desc.includes("retail") ||
    desc.includes("clothing") ||
    desc.includes("electronics")
  ) {
    return "Shopping"
  }

  // Transport - gas, uber, public transport
  if (
    desc.includes("uber") ||
    desc.includes("lyft") ||
    desc.includes("taxi") ||
    desc.includes("gas") ||
    desc.includes("fuel") ||
    desc.includes("shell") ||
    desc.includes("exxon") ||
    desc.includes("bp ") ||
    desc.includes("chevron") ||
    desc.includes("parking") ||
    desc.includes("metro") ||
    desc.includes("transit") ||
    desc.includes("bus") ||
    desc.includes("train")
  ) {
    return "Transport"
  }

  // Travel - flights, hotels, vacation
  if (
    desc.includes("airline") ||
    desc.includes("flight") ||
    desc.includes("hotel") ||
    desc.includes("airbnb") ||
    desc.includes("booking") ||
    desc.includes("expedia") ||
    desc.includes("travel") ||
    desc.includes("vacation") ||
    desc.includes("trip")
  ) {
    return "Travel"
  }

  // Business - office supplies, business services
  if (
    desc.includes("office") ||
    desc.includes("business") ||
    desc.includes("supplies") ||
    desc.includes("staples") ||
    desc.includes("fedex") ||
    desc.includes("ups") ||
    desc.includes("conference") ||
    desc.includes("meeting")
  ) {
    return "Business"
  }

  // Gifts - gift cards, presents
  if (
    desc.includes("gift") ||
    desc.includes("present") ||
    desc.includes("card") ||
    desc.includes("flowers") ||
    desc.includes("jewelry")
  ) {
    return "Gifts"
  }

  return "Other"
}
