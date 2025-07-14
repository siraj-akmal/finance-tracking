"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Save, Download, Upload, TrendingUp, TrendingDown, PiggyBank } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { categories } from "@/lib/category-colors"
import { useDefaultMonth } from "@/hooks/use-months"
import { SpendingVsBudgetTable } from "@/components/spending-vs-budget-table"
import { TransactionModal } from "@/components/transaction-modal"

interface BudgetItem {
  category: string
  budgeted: number
  spent: number
  remaining: number
}

interface BudgetPanelProps {
  onTransactionUpdate?: () => void;
}

export function BudgetPanel({ onTransactionUpdate }: BudgetPanelProps) {
  const [budgetData, setBudgetData] = useState<BudgetItem[]>([])
  const { selectedMonth, setSelectedMonth, months, loading: monthsLoading } = useDefaultMonth()
  const [templateBudget, setTemplateBudget] = useState<Record<string, number>>({})
  const [totalInvestments, setTotalInvestments] = useState(0)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // State for transaction modal
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Handler for category click
  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category)
    setShowTransactionModal(true)
  }

  useEffect(() => {
    if (selectedMonth) {
      fetchBudgetData()
    }
  }, [selectedMonth])

  // Add a refresh function that can be called from parent components
  const refreshBudgetData = () => {
    fetchBudgetData()
  }

  const fetchBudgetData = async () => {
    try {
      setLoading(true)
      
      // Fetch global budget settings (not tied to specific month)
      const budgetResponse = await fetch('/api/budgets/global')
      const budgetData = await budgetResponse.json()
      
      // Fetch spending data for the selected month
      const spendingResponse = await fetch(`/api/transactions?month=${selectedMonth}`)
      const spendingData = await spendingResponse.json()
      
      // Fetch investment data for the selected month
      const investmentsResponse = await fetch(`/api/savings?month=${selectedMonth}`)
      const investmentsData = await investmentsResponse.json()
      
      if (budgetResponse.ok && spendingResponse.ok && investmentsResponse.ok) {
        // Get global budget amounts
        const globalBudgets = budgetData.budgets || []
        console.log('🔍 Global budgets from API:', globalBudgets.map((b: any) => ({ category: b.category, budgeted: b.budgeted })))
        
        // Calculate spending by category for the selected month
        const spendingByCategory = new Map()
        if (spendingData.transactions) {
          spendingData.transactions.forEach((transaction: any) => {
            const category = transaction.category
            const amount = Math.abs(Number(transaction.amount))
            spendingByCategory.set(category, (spendingByCategory.get(category) || 0) + amount)
          })
        }
        
        // Calculate total investments for the month (to be deducted from remaining budget)
        const totalInvestments = (investmentsData.savings || [])
          .filter((saving: any) => ['investment', 'stocks', 'bonds', 'crypto', 'etf', 'mutual-fund', 'real-estate', '401k', 'ira', 'roth-ira'].includes(saving.type))
          .reduce((sum: number, saving: any) => sum + Number(saving.amount), 0)
        
        // Combine global budgets with current month's spending
        const combinedData = globalBudgets.map((budget: any) => {
          const spent = spendingByCategory.get(budget.category) || 0
          return {
            category: budget.category,
            budgeted: budget.budgeted,
            spent: spent,
            remaining: budget.budgeted - spent,
          }
        })
        console.log('🔍 Combined data before setting state:', combinedData.map((b: any) => ({ category: b.category, budgeted: b.budgeted })))
        
        setBudgetData(combinedData)
        
        // Store total investments for use in calculations
        setTotalInvestments(totalInvestments)
      } else {
        console.error('Failed to fetch budget data:', budgetData.error || spendingData.error || investmentsData.error)
        toast({
          title: "Error",
          description: "Failed to load budget data",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error fetching budget data:', error)
      toast({
        title: "Error",
        description: "Failed to load budget data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Update budget and persist to backend, then refetch dashboard data
  const handleBudgetChange = async (category: string, amount: number) => {
    // Persist to backend first
    try {
      await fetch('/api/budgets/global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, budgeted: amount }),
      })
      
      // Update local state immediately for responsive UI
      setBudgetData((prev) =>
        prev.map((item) =>
          item.category === category ? { ...item, budgeted: amount, remaining: amount - item.spent } : item,
        ),
      )
      
      // Refetch budget data to ensure all dependent UI is up-to-date and properly sorted
      await fetchBudgetData();
      
      toast({
        title: 'Budget Updated',
        description: `${category} budget updated to $${amount.toFixed(2)}`,
      })
    } catch (error) {
      console.error('Error updating budget:', error)
      toast({
        title: 'Error',
        description: 'Failed to save budget',
        variant: 'destructive',
      })
    }
  }

  const handleSaveBudget = async () => {
    try {
      const budgetPromises = uniqueBudgetData.map(budget => 
        fetch('/api/budgets/global', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            category: budget.category,
            budgeted: budget.budgeted,
          }),
        })
      )

      await Promise.all(budgetPromises)

      toast({
        title: "Budget saved",
        description: "Global budget settings have been saved for all months",
      })
    } catch (error) {
      console.error('Error saving budget:', error)
      toast({
        title: "Error",
        description: "Failed to save budget",
        variant: "destructive",
      })
    }
  }

  const handleSaveAsTemplate = () => {
    const template = budgetData.reduce(
      (acc, item) => {
        acc[item.category] = item.budgeted
        return acc
      },
      {} as Record<string, number>,
    )
    setTemplateBudget(template)
    toast({
      title: "Template saved",
      description: "Current budget has been saved as your default template",
    })
  }

  const handleApplyTemplate = () => {
    if (Object.keys(templateBudget).length === 0) {
      toast({
        title: "No template found",
        description: "Please save a template first",
        variant: "destructive",
      })
      return
    }

    setBudgetData((prev) =>
      prev.map((item) => ({
        ...item,
        budgeted: templateBudget[item.category] || item.budgeted,
        remaining: (templateBudget[item.category] || item.budgeted) - item.spent,
      })),
    )

    toast({
      title: "Template applied",
      description: "Default budget template has been applied",
    })
  }

  // Deduplicate budget data by category
  const uniqueBudgetData = Array.from(
    new Map(budgetData.map(item => [item.category, item])).values()
  ).sort((a, b) => b.budgeted - a.budgeted)
  
  console.log('🔍 Final sorted uniqueBudgetData:', uniqueBudgetData.map((b: any) => ({ category: b.category, budgeted: b.budgeted })))

  const totalBudgeted = uniqueBudgetData.reduce((sum, item) => sum + Number(item.budgeted), 0)
  const totalSpent = uniqueBudgetData.reduce((sum, item) => sum + Number(item.spent), 0)
  const totalRemaining = Number(totalBudgeted) - Number(totalSpent) - Number(totalInvestments)
  const overallProgress = totalBudgeted > 0 ? ((totalSpent + totalInvestments) / totalBudgeted) * 100 : 0

  // Show empty state if no months available
  if (months.length === 0 && !monthsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Budget Management</h2>
          <p className="text-muted-foreground">
            No data available. Upload your first CSV file to get started.
          </p>
        </div>
        <div className="text-center py-12">
          <div className="text-muted-foreground text-lg mb-4">
            💰 Your budget settings will appear here once you upload transaction data
          </div>
          <p className="text-sm text-muted-foreground">
            Go to the "Upload CSV" tab to import your credit card statements
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="h-96 bg-gray-200 rounded animate-pulse"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Budget Management</h2>
          <p className="text-muted-foreground">
            Set global budget amounts by category (applies to all months). Viewing spending for {months.find((m: any) => m.value === selectedMonth)?.label}
          </p>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            {months.map((month: any) => (
              <SelectItem key={`budget-${month.value}`} value={month.value}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budgeted</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${Number(totalBudgeted).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Monthly budget allocation</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${Number(totalSpent).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Actual spending this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Investments</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">${Number(totalInvestments).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Invested from budget</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
            <Badge variant={totalRemaining >= 0 ? "default" : "destructive"}>
              {totalRemaining >= 0 ? "Under Budget" : "Over Budget"}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalRemaining >= 0 ? "text-green-600" : "text-red-600"}`}>${Math.abs(Number(totalRemaining)).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {totalRemaining >= 0 ? "Available to spend" : "Over budget amount"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Budget Progress</CardTitle>
                  <CardDescription>
          {overallProgress.toFixed(1)}% of your total budget has been spent or invested
        </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={Math.min(overallProgress, 100)} className="h-3" />
          <div className="flex justify-between text-sm text-muted-foreground mt-2">
            <span>${Number(totalSpent).toFixed(2)} spent + ${Number(totalInvestments).toFixed(2)} invested</span>
            <span>${Number(totalBudgeted).toFixed(2)} budgeted</span>
          </div>
        </CardContent>
      </Card>

      {/* Budget Categories */}
      <SpendingVsBudgetTable 
        key={`budget-table-${selectedMonth}-${JSON.stringify(uniqueBudgetData.map(d => d.budgeted))}`}
        data={uniqueBudgetData} 
        onBudgetChange={handleBudgetChange} 
        onCategoryClick={handleCategoryClick}
      />

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button onClick={handleSaveBudget} className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          Save Budget
        </Button>
        <Button variant="outline" onClick={handleSaveAsTemplate} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Save as Template
        </Button>
        <Button variant="outline" onClick={handleApplyTemplate} className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Apply Template
        </Button>
      </div>

      {/* Transaction Modal */}
      {showTransactionModal && selectedCategory && (
        <TransactionModal
          isOpen={showTransactionModal}
          category={selectedCategory}
          month={selectedMonth}
          onClose={() => {
            setShowTransactionModal(false)
            setSelectedCategory(null)
          }}
          onTransactionUpdate={refreshBudgetData}
        />
      )}
    </div>
  )
}
