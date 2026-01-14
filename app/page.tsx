"use client"

import { Suspense, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardOverview } from "@/components/dashboard-overview"
import { TransactionTable } from "@/components/transaction-table"
import { BudgetPanel } from "@/components/budget-panel"
import { UploadForm } from "@/components/upload-form"
import { Skeleton } from "@/components/ui/skeleton"
import { useRefresh } from "@/hooks/use-refresh"

export default function HomePage() {
  const { refreshKey, triggerRefresh } = useRefresh();
  const [activeTab, setActiveTab] = useState("dashboard");

  const handleTransactionUpdate = () => {
    triggerRefresh();
    // Stay on upload tab after successful upload
    // setActiveTab("dashboard"); // Removed automatic redirect
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Personal Finance Tracker</h1>
          <p className="text-muted-foreground">
            Upload credit card statements, categorize transactions, and track your financial health
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="upload">Upload CSV</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <Suspense fallback={<DashboardSkeleton />}>
            <DashboardOverview key={refreshKey} onTransactionUpdate={handleTransactionUpdate} />
          </Suspense>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Management</CardTitle>
              <CardDescription>View, edit, and categorize your transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                <TransactionTable key={refreshKey} onTransactionUpdate={handleTransactionUpdate} />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Credit Card Statements</CardTitle>
              <CardDescription>
                Upload CSV files from AMEX, Bank of America, or other credit card providers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UploadForm 
                onTransactionUpdate={handleTransactionUpdate} 
                onSwitchToDashboard={() => setActiveTab("dashboard")}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budget" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Budget Management</CardTitle>
              <CardDescription>Set and manage your monthly budget by category</CardDescription>
            </CardHeader>
            <CardContent>
              <BudgetPanel key={refreshKey} onTransactionUpdate={handleTransactionUpdate} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-20 mb-2" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
