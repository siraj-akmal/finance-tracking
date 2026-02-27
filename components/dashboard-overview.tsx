"use client"

/**
 * components/dashboard-overview.tsx
 *
 * Main dashboard panel: summary metric cards, category donut chart,
 * monthly trend chart, and budget-vs-actual bar chart.
 *
 * State management:
 * - selectedMonth / months / monthsLoading come from FinanceProvider (shared
 *   with every other tab — changing month here changes it everywhere).
 * - metrics, categorySpending, budgetVsActual are local because they are
 *   derived from the selected month and do not need cross-tab sharing.
 */

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CategoryChart } from "@/components/category-chart"
import { MonthlyTrendChart } from "@/components/monthly-trend-chart"
import { BudgetVsActualChart } from "@/components/budget-vs-actual-chart"
import { DollarSign, TrendingUp, TrendingDown, PiggyBank } from "lucide-react"
import { TransactionModal } from "@/components/transaction-modal"
import { useFinance } from "@/context/finance-context"
import { getDashboard } from "@/lib/api"
import type { DashboardMetrics, CategorySpending, BudgetItem } from "@/lib/types"

interface DashboardOverviewProps {
  onTransactionUpdate?: () => void
}

/**
 * DashboardOverview
 *
 * Fetches and renders aggregated financial data for the selected month.
 * Month selection is shared via FinanceContext, so switching months here
 * simultaneously updates the Budget and Income tabs.
 */
export function DashboardOverview({ onTransactionUpdate }: DashboardOverviewProps) {
  const { selectedMonth, setSelectedMonth, months, monthsLoading } = useFinance()

  // Local state: dashboard data for the selected month
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalSpend: 0,
    totalIncome: 0,
    totalSavings: 0,
    totalInvestments: 0,
    budgetVariance: 0,
  })
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([])
  const [budgetVsActual, setBudgetVsActual]       = useState<BudgetItem[]>([])
  const [loading, setLoading]                     = useState(true)
  const [selectedCategory, setSelectedCategory]   = useState<string | null>(null)
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [selectedTrendCategory, setSelectedTrendCategory] = useState<string | null>(null)

  // Re-fetch whenever the selected month changes
  useEffect(() => {
    if (!selectedMonth) return
    fetchDashboardData()
  }, [selectedMonth])

  /**
   * Fetches dashboard metrics, category spending, and budget-vs-actual data
   * for the currently selected month via the typed getDashboard() API function.
   */
  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const data = await getDashboard(selectedMonth)

      // Normalise all metric values to plain numbers
      setMetrics({
        totalSpend:       Number(data.metrics?.totalSpend)       || 0,
        totalIncome:      Number(data.metrics?.totalIncome)      || 0,
        totalSavings:     Number(data.metrics?.totalSavings)     || 0,
        totalInvestments: Number(data.metrics?.totalInvestments) || 0,
        budgetVariance:   Number(data.metrics?.budgetVariance)   || 0,
      })
      setCategorySpending(data.categorySpending ?? [])
      setBudgetVsActual(data.budgetVsActual ?? [])
    } catch (error) {
      console.error('DashboardOverview: failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Opens the transaction drill-down modal for the clicked category and
   * synchronises the trend-chart category filter.
   */
  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category)
    setShowTransactionModal(true)
    setSelectedTrendCategory(category)
  }

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
            Your dashboard will appear here once you upload transaction data
          </div>
          <p className="text-sm text-muted-foreground">
            Go to the &quot;Upload CSV&quot; tab to import your credit card statements
          </p>
        </div>
      </div>
    )
  }

  const selectedMonthLabel = months.find(m => m.value === selectedMonth)?.label ?? ''

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            {selectedMonth
              ? `Overview of your financial health for ${selectedMonthLabel}`
              : 'Select a month to view your financial overview'}
          </p>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            {months.map(month => (
              <SelectItem key={`dashboard-${month.value}`} value={month.value}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.totalSpend.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">This month&apos;s total spending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.totalIncome.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">This month&apos;s total income</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.totalSavings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">This month&apos;s total savings</p>
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

      {/* Charts row */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Monthly Trend</CardTitle>
            <CardDescription>Track your spending trends over time</CardDescription>
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
            <CardDescription>Click a category to see transactions</CardDescription>
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
            <CardDescription>Compare your budgeted amounts with actual spending</CardDescription>
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
