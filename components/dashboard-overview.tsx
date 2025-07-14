"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CategoryChart } from "@/components/category-chart"
import { MonthlyTrendChart } from "@/components/monthly-trend-chart"
import { BudgetVsActualChart } from "@/components/budget-vs-actual-chart"
import { DollarSign, TrendingUp, TrendingDown, PiggyBank } from "lucide-react"
import { TransactionModal } from "@/components/transaction-modal"
import { useDefaultMonth } from "@/hooks/use-months"

interface DashboardMetrics {
  totalSpend: number
  totalIncome: number
  totalSavings: number
  budgetVariance: number
}

interface CategorySpending {
  category: string
  total: number
}

interface BudgetVsActual {
  category: string
  budgeted: number
  spent: number
  remaining: number
}

/**
 * DashboardOverview
 *
 * Main dashboard component displaying summary cards, category donut chart, monthly trend chart,
 * and budget vs actual chart. Handles month selection, data fetching, and category drill-downs.
 *
 * State:
 * - selectedMonth: currently selected month for dashboard data
 * - metrics: summary metrics (spend, income, savings, variance)
 * - categorySpending: spending by category for the selected month
 * - budgetVsActual: budget vs actual data for all categories
 * - loading: loading state for dashboard data
 * - selectedCategory: category selected for transaction modal
 * - showTransactionModal: controls transaction modal visibility
 * - selectedTrendCategory: category filter for monthly trend chart
 */
interface DashboardOverviewProps {
  onTransactionUpdate?: () => void;
}

export function DashboardOverview({ onTransactionUpdate }: DashboardOverviewProps) {
  const { selectedMonth, setSelectedMonth, months, loading: monthsLoading } = useDefaultMonth()
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalSpend: 0,
    totalIncome: 0,
    totalSavings: 0,
    budgetVariance: 0,
  })
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([])
  const [budgetVsActual, setBudgetVsActual] = useState<BudgetVsActual[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [selectedTrendCategory, setSelectedTrendCategory] = useState<string | null>(null)

  // Fetch dashboard data for the selected month
  useEffect(() => {
    if (selectedMonth) {
      fetchDashboardData()
    }
  }, [selectedMonth])

  /**
   * Fetches dashboard metrics, category spending, and budget vs actual data
   * for the currently selected month from the backend API.
   */
  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/dashboard?month=${selectedMonth}`)
      const data = await response.json()
      
      if (response.ok) {
        // Ensure all metrics are numbers
        const safeMetrics = {
          totalSpend: Number(data.metrics?.totalSpend) || 0,
          totalIncome: Number(data.metrics?.totalIncome) || 0,
          totalSavings: Number(data.metrics?.totalSavings) || 0,
          budgetVariance: Number(data.metrics?.budgetVariance) || 0,
        }
        
        setMetrics(safeMetrics)
        setCategorySpending(data.categorySpending || [])
        setBudgetVsActual(data.budgetVsActual || [])
      } else {
        console.error('Failed to fetch dashboard data:', data.error)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handles clicking a category in the donut chart or table.
   * Opens the transaction modal and optionally filters the trend chart.
   */
  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category)
    setShowTransactionModal(true)
    setSelectedTrendCategory(category) // Optionally filter trend chart when clicking donut
  }

  /**
   * Handles clicking a category in the monthly trend chart legend or bars.
   * Filters the trend chart to the selected category.
   */
  const handleTrendCategoryClick = (category: string | null) => {
    setSelectedTrendCategory(category)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Loading...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$0.00</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Show empty state if no months available
  if (months.length === 0 && !monthsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            No data available. Upload your first CSV file to get started.
          </p>
        </div>
        <div className="text-center py-12">
          <div className="text-muted-foreground text-lg mb-4">
            📊 Your dashboard will appear here once you upload transaction data
          </div>
          <p className="text-sm text-muted-foreground">
            Go to the "Upload CSV" tab to import your credit card statements
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            {selectedMonth ? `Overview of your financial health for ${months.find((m: any) => m.value === selectedMonth)?.label}` : 'Select a month to view your financial overview'}
          </p>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            {months.map((month: any) => (
              <SelectItem key={`dashboard-${month.value}`} value={month.value}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.totalSpend.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              This month's total spending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.totalIncome.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              This month's total income
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.totalSavings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              This month's total savings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Variance</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.budgetVariance.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.budgetVariance >= 0 ? "Over budget" : "Under budget"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Monthly Trend</CardTitle>
            <CardDescription>
              Track your spending trends over time
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <MonthlyTrendChart 
              selectedCategory={selectedTrendCategory}
              onCategoryClick={handleTrendCategoryClick}
            />
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <CardDescription>
              Click a category to see transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryChart 
              data={categorySpending}
              budgetData={budgetVsActual}
              onCategoryClick={handleCategoryClick}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-7">
          <CardHeader>
            <CardTitle>Budget vs Actual</CardTitle>
            <CardDescription>
              Compare your budgeted amounts with actual spending
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BudgetVsActualChart data={budgetVsActual} />
          </CardContent>
        </Card>
      </div>

      {showTransactionModal && selectedCategory && (
        <TransactionModal
          isOpen={showTransactionModal}
          category={selectedCategory}
          month={selectedMonth}
          onClose={() => {
            setShowTransactionModal(false)
            setSelectedCategory(null)
          }}
          onTransactionUpdate={onTransactionUpdate}
        />
      )}
    </div>
  )
}
