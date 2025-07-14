"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { UploadProgressModal } from "@/components/upload-progress-modal"

interface UploadFormProps {
  onTransactionUpdate?: () => void
  onSwitchToDashboard?: () => void
}

export function UploadForm({ onTransactionUpdate, onSwitchToDashboard }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [bankType, setBankType] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadId, setUploadId] = useState<string | null>(null)
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [uploadResult, setUploadResult] = useState<{
    success: boolean
    message: string
    transactionCount?: number
    categorizedFile?: string
  } | null>(null)
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile)
      setUploadResult(null)
    } else {
      toast({
        title: "Invalid file type",
        description: "Please select a CSV file",
        variant: "destructive",
      })
    }
  }

  const handleUpload = async () => {
    if (!file || !bankType) {
      toast({
        title: "Missing information",
        description: "Please select a file and bank type",
        variant: "destructive",
      })
      return
    }

    setUploading(true)
    setUploadResult(null)

    // Generate upload ID immediately and show modal
    const uploadId = Date.now().toString()
    setUploadId(uploadId)
    setShowProgressModal(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bankType', bankType)
      formData.append('uploadId', uploadId) // Pass the ID to the server

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file')
      }

      const uploadData = await uploadResponse.json()
      
      // Keep the same upload ID (don't change it)
      console.log('Upload completed with ID:', uploadId)
      
    } catch (error) {
      console.error('Upload error:', error)
      setUploadResult({
        success: false,
        message: "Failed to upload file. Please check the format and try again.",
      })

      toast({
        title: "Upload failed",
        description: "There was an error uploading your file",
        variant: "destructive",
      })
      
      // Close modal on error
      setShowProgressModal(false)
      setUploadId(null)
    } finally {
      setUploading(false)
    }
  }

  const handleUploadComplete = (transactionCount?: number) => {
    setShowProgressModal(false)
    setUploadId(null)
    
    // Show success message in the form instead of toast
    setUploadResult({
      success: true,
      message: "Your CSV has been successfully processed and imported!",
      transactionCount: transactionCount || 0,
    })

    // Clear form
    setFile(null)
    setBankType("")
    
    // Trigger refresh of all components
    setTimeout(() => {
      onTransactionUpdate?.()
    }, 1000)
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="bank-type">Bank/Credit Card Provider</Label>
          <Select value={bankType} onValueChange={setBankType}>
            <SelectTrigger>
              <SelectValue placeholder="Select your bank or credit card provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="amex">American Express</SelectItem>
              <SelectItem value="boa">Bank of America</SelectItem>
              <SelectItem value="chase">Chase</SelectItem>
              <SelectItem value="citi">Citibank</SelectItem>
              <SelectItem value="wells">Wells Fargo</SelectItem>
              <SelectItem value="discover">Discover</SelectItem>
              <SelectItem value="capital-one">Capital One</SelectItem>
              <SelectItem value="generic">Generic CSV Format</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="csv-file">CSV File</Label>
          <div className="flex items-center gap-4">
            <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} disabled={uploading} />
            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                {file.name}
              </div>
            )}
          </div>
        </div>

        <Button onClick={handleUpload} disabled={!file || !bankType || uploading} className="w-full">
          {uploading ? (
            <>Processing...</>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload and Process CSV
            </>
          )}
        </Button>

        {/* Progress modal will handle all progress display */}

        {uploadResult && (
          <Alert className={uploadResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            {uploadResult.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={uploadResult.success ? "text-green-800" : "text-red-800"}>
              <div className="space-y-2">
                <div>{uploadResult.message}</div>
                {uploadResult.transactionCount && (
                  <div className="font-medium">
                    {uploadResult.transactionCount} transactions processed and categorized using local LLM
                  </div>
                )}
                {uploadResult.success && (
                  <div className="flex gap-2 mt-3">
                    <Button 
                      size="sm" 
                      onClick={() => onSwitchToDashboard?.()}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      View Dashboard
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setUploadResult(null)}
                    >
                      Upload Another File
                    </Button>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Progress Modal */}
      <UploadProgressModal
        isOpen={showProgressModal}
        uploadId={uploadId}
        onClose={() => setShowProgressModal(false)}
        onComplete={handleUploadComplete}
      />

      <Card>
        <CardHeader>
          <CardTitle>Supported CSV Formats</CardTitle>
          <CardDescription>Make sure your CSV file matches one of these formats</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">American Express</h4>
            <code className="text-sm bg-muted p-2 rounded block">Date, Description, Amount</code>
            <p className="text-xs text-muted-foreground mt-1">
              Date format: MM/DD/YYYY, Amount: Positive for charges, Negative for credits
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">Bank of America</h4>
            <code className="text-sm bg-muted p-2 rounded block">Date, Description, Amount, Running Bal.</code>
          </div>
          <div>
            <h4 className="font-medium mb-2">Generic Format</h4>
            <code className="text-sm bg-muted p-2 rounded block">Date, Description, Amount, Category (optional)</code>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
