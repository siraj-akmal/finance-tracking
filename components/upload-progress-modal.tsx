"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { CheckCircle, AlertCircle, Loader2, FileText, Brain, Database, Upload, Clock } from "lucide-react"

interface UploadProgress {
  status: 'uploading' | 'categorizing' | 'importing' | 'complete' | 'error'
  progress: number
  message: string
  transactionCount?: number
  error?: string
}

interface UploadProgressModalProps {
  isOpen: boolean
  uploadId: string | null
  onClose: () => void
  onComplete: (transactionCount?: number) => void
}

export function UploadProgressModal({ isOpen, uploadId, onClose, onComplete }: UploadProgressModalProps) {
  const [progress, setProgress] = useState<UploadProgress | null>(null)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    if (!isOpen || !uploadId) return

    // Clear any existing polling
    if (pollingInterval) {
      clearInterval(pollingInterval)
      setPollingInterval(null)
    }

    // Set start time when modal opens
    setStartTime(Date.now())

    // Set initial progress state for temporary IDs
    if (uploadId.startsWith('temp_')) {
      setProgress({
        status: 'uploading',
        progress: 5,
        message: 'Preparing to upload your file...'
      })
      return // Don't start polling for temporary IDs
    }

    // Start polling for progress updates (only for real upload IDs)
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/upload/progress?uploadId=${uploadId}`)
        if (response.ok) {
          const data = await response.json()
          console.log('📊 Progress modal received update:', data)
          setProgress(data)
          
          // Stop polling if complete or error
          if (data.status === 'complete' || data.status === 'error') {
            clearInterval(interval)
            setPollingInterval(null)
            
            if (data.status === 'complete') {
              // Wait a moment before calling onComplete
              setTimeout(() => {
                onComplete(data.transactionCount)
              }, 3000)
            }
          }
        } else {
          console.error('Error polling progress:', response.status, response.statusText)
        }
      } catch (error) {
        console.error('Error polling progress:', error)
      }
    }, 1000) // Poll every second

    setPollingInterval(interval)

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [isOpen, uploadId, onComplete])

  // Update elapsed time
  useEffect(() => {
    if (!startTime) return

    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)

    return () => clearInterval(timer)
  }, [startTime])

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploading':
        return <Upload className="h-5 w-5 text-blue-500" />
      case 'categorizing':
        return <Brain className="h-5 w-5 text-purple-500" />
      case 'importing':
        return <Database className="h-5 w-5 text-green-500" />
      case 'complete':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      default:
        return <Loader2 className="h-5 w-5 text-gray-500 animate-spin" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploading':
        return 'text-blue-600'
      case 'categorizing':
        return 'text-purple-600'
      case 'importing':
        return 'text-green-600'
      case 'complete':
        return 'text-green-600'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getDetailedMessage = (status: string, message: string) => {
    switch (status) {
      case 'uploading':
        return "We're uploading your CSV file to our secure servers. This usually takes just a few seconds."
      case 'categorizing':
        return "Our AI is analyzing each transaction and automatically categorizing them. This helps you track spending patterns."
      case 'importing':
        return "We're importing your categorized transactions into your personal finance tracker. Almost there!"
      case 'complete':
        return "All done! Your transactions have been successfully processed and are now available in your dashboard."
      case 'error':
        return "Something went wrong during processing. Please check your file format and try again."
      default:
        return message
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Processing Your CSV File
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header with time and status */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Elapsed: {formatTime(elapsedTime)}
              </span>
            </div>

          </div>

          {/* Progress Bar */}
          {progress && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className={`font-medium ${getStatusColor(progress.status)}`}>
                  {progress.message}
                </span>
                <span className="font-bold text-lg">{progress.progress}%</span>
              </div>
              <Progress value={progress.progress} className="w-full h-3" />
              <p className="text-sm text-muted-foreground">
                {getDetailedMessage(progress.status, progress.message)}
              </p>
            </div>
          )}



          {/* Status Messages */}
          {progress && (
            <div className="space-y-2">
              {progress.status === 'complete' && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <div className="font-medium mb-1">
                      Successfully processed {progress.transactionCount || 0} transactions!
                    </div>
                    <div className="text-sm">
                      Your data has been categorized and imported into the database. 
                      You can now view your transactions in the dashboard.
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {progress.status === 'error' && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    <div className="font-medium mb-1">
                      Processing failed
                    </div>
                    <div className="text-sm">
                      {progress.error || 'An error occurred during processing. Please check your file format and try again.'}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            {progress?.status === 'complete' && (
              <Button onClick={onClose} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="mr-2 h-4 w-4" />
                View Dashboard
              </Button>
            )}
            
            {progress?.status === 'error' && (
              <Button onClick={onClose} variant="outline">
                Close
              </Button>
            )}
            
            {(progress?.status === 'uploading' || progress?.status === 'categorizing' || progress?.status === 'importing') && (
              <Button onClick={onClose} variant="outline" disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 