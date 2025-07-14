import { NextResponse } from "next/server"

// In-memory progress store (in production, use Redis or database)
export const progressStore = new Map<string, {
  status: 'uploading' | 'categorizing' | 'importing' | 'complete' | 'error'
  progress: number
  message: string
  transactionCount?: number
  error?: string
}>()

export async function POST(request: Request) {
  const { uploadId, status, progress, message, transactionCount, error } = await request.json()
  
  progressStore.set(uploadId, {
    status,
    progress,
    message,
    transactionCount,
    error
  })
  
  return NextResponse.json({ success: true })
}

export function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const uploadId = searchParams.get('uploadId')
  
  if (!uploadId) {
    return NextResponse.json({ error: 'Upload ID required' }, { status: 400 })
  }
  
  const progress = progressStore.get(uploadId)
  
  if (!progress) {
    return NextResponse.json({ error: 'Upload not found' }, { status: 404 })
  }
  
  return NextResponse.json(progress)
}

// Clean up old progress entries (older than 1 hour)
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000
  const entries = Array.from(progressStore.entries())
  for (const [uploadId, progress] of entries) {
    if (progress.status === 'complete' || progress.status === 'error') {
      // Keep completed/error entries for a bit longer for debugging
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000
      if (Date.now() - parseInt(uploadId) > twoHoursAgo) {
        progressStore.delete(uploadId)
      }
    }
  }
}, 5 * 60 * 1000) // Run every 5 minutes 