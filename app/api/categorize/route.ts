import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { description, amount } = await request.json()

    if (!description) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 })
    }

    // Mock local LLM categorization
    // In a real implementation, you would call Ollama here
    const category = await callLocalLLM(description, amount)

    return NextResponse.json({
      category,
      confidence: 0.85,
    })
  } catch (error) {
    console.error("Categorization error:", error)
    return NextResponse.json({ error: "Failed to categorize transaction" }, { status: 500 })
  }
}

async function callLocalLLM(description: string, amount: number) {
  // Mock implementation - replace with actual Ollama API call
  // Example Ollama call:
  /*
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama2',
      prompt: `Categorize this financial transaction into one of these categories: Food & Drink, Transportation, Shopping, Entertainment, Bills & Utilities, Healthcare, Income, Investment, Other.
      
      Transaction: ${description}
      Amount: $${amount}
      
      Category:`,
      stream: false
    })
  })
  
  const data = await response.json()
  return data.response.trim()
  */

  // Simple rule-based fallback
  const desc = description.toLowerCase()

  if (desc.includes("starbucks") || desc.includes("restaurant") || desc.includes("grocery") || desc.includes("food")) {
    return "Food & Drink"
  } else if (desc.includes("uber") || desc.includes("gas") || desc.includes("transport")) {
    return "Transportation"
  } else if (desc.includes("amazon") || desc.includes("store") || desc.includes("shop")) {
    return "Shopping"
  } else if (desc.includes("netflix") || desc.includes("movie") || desc.includes("entertainment")) {
    return "Entertainment"
  } else if (
    desc.includes("electric") ||
    desc.includes("water") ||
    desc.includes("internet") ||
    desc.includes("phone")
  ) {
    return "Bills & Utilities"
  } else if (desc.includes("doctor") || desc.includes("pharmacy") || desc.includes("medical")) {
    return "Healthcare"
  } else if (amount > 0) {
    return "Income"
  } else {
    return "Other"
  }
}
