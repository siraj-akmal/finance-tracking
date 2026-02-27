"use client"

/**
 * components/budget-panel.tsx
 *
 * Budget management panel: summary cards, overall progress bar,
 * per-category spending-vs-budget table, and action buttons.
 *
 * State management:
 * - selectedMonth / months come from FinanceProvider (shared across tabs).
 * - budgetData and totalInvestments are local: they are derived from the
 *   selected month and the global budget settings.
 *
 * Data flow:
 *   1. Fetch global budgets (category → budgeted amount, month-agnostic)
 *   2. Fetch transactions for selectedMonth to get per-category spend
 *   3. Fetch savings for selectedMonth to identify investment amounts
 *   4. Merge into BudgetItem[] for display
 */

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
import { useFinance } from "@/context/finance-context"
import { SpendingVsBudgetTable } from "@/components/spending-vs-budget-table"
import { TransactionModal } from "@/components/transaction-modal"
import { getGlobalBudgets, getTransactions, getSavings, saveGlobalBudget } from "@/lib/api"
import type { BudgetItem } from "@/lib/types"

/** Investment saving types that count against the budget. */
const INVESTMENT_TYPES = new Set([
  'investment', 'stocks', 'bonds', 'crypto', 'etf',
  'mutual-fund', 'real-estate', '401k', 'ira', 'roth-ira',
])

interface BudgetPanelProps {
  onTransactionUpdate?: () => void
}

/**
 * BudgetPanel
 *
 * Combines global budget settings with the current month's actual spending
 * to show how well each category is tracking against its budget.
 */
export function BudgetPanel({ onTransactionUpdate }: BudgetPanelProps) {
  const { selectedMonth, setSelectedMonth, months, monthsLoading } = useFinance()
  const { toast } = useToast()

  const [budgetData, setBudgetData]           = useState<BudgetItem[]>([])
  const [templateBudget, setTemplateBudget]   = useState<Record<string, number>>({})
  const [totalInvestments, setTotalInvestments] = useState(0)
  const [loading, setLoading]                 = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showTransactionModal, setShowTransactionModal] = useState(false)

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category)
    setShowTransactionModal(true)
  }

  // Re-fetch when the shared month selection changes
  useEffect(() => {
    if (selectedMonth) fetchBudgetData()
  }, [selectedMonth])

  /**
   * Loads global budgets, spending, and savings for the selected month,
   * then merges them into BudgetItem[] using pure functional map/filter/reduce.
   */
  const fetchBudgetData = async () => {
    try {
      setLoading(true)

      // Parallel fetch for all required data
      const [budgetRes, spendingRes, savingsRes] = await Promise.all([
        getGlobalBudgets(),
        getTransactions({ month: selectedMonth }),
        getSavings(selectedMonth),
      ])

      // Build category → amount map using reduce (functional style)
      const spendingByCategory = spendingRes.transactions.reduce<Map<string, number>>(
        (acc, t) => {
          const amount = Math.abs(Number(t.amount))
          return acc.set(t.category, (acc.get(t.category) ?? 0) + amount)
        },
        new Map(),
      )

      // Sum investment amounts to deduct from remaining budget
      const investments = savingsRes.savings
        .filter(s => INVESTMENT_TYPES.has(s.type))
        .reduce((sum, s) => sum + Number(s.amount), 0)

      // Merge global budgets with actual spend (pure map — no mutation)
      const combined = budgetRes.budgets.map(b => ({
        category: b.category,
        budgeted: Number(b.budgeted),
        spent:    spendingByCategory.get(b.category) ?? 0,
        remaining: Number(b.budgeted) - (spendingByCategory.get(b.category) ?? 0),
      }))

      setBudgetData(combined)
      setTotalInvestments(investments)
    } catch (error) {
      console.error('BudgetPanel: failed to fetch budget data:', error)
      toast({
        title: "Error",
        description: "Failed to load budget data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  /**
   * Persists an updated budget amount for a single category, then refreshes
   * the local state so the UI reflects the change immediately.
   */
  const handleBudgetChange = async (category: string, amount: number) => {
    try {
      await saveGlobalBudget(category, amount)

      // Optimistic local update for responsive UI
      setBudgetData(prev =>
        prev.map(item =>
          item.category === category
            ? { ...item, budgeted: amount, remaining: amount - item.spent }
            : item,
        ),
      )

      // Full refetch to ensure sort order and totals are accurate
      await fetchBudgetData()

      toast({
        title: 'Budget Updated',
        description: `${category} budget updated to $${amount.toFixed(2)}`,
      })
    } catch (error) {
      console.error('BudgetPanel: failed to update budget:', error)
      toast({ title: 'Error', description: 'Failed to save budget', variant: 'destructive' })
    }
  }

  /**
   * Persists every category's current budget to the backend in parallel.
   */
  const handleSaveBudget = async () => {
    try {
      await Promise.all(
        uniqueBudgetData.map(b => saveGlobalBudget(b.category, b.budgeted)),
      )
      toast({
        title: "Budget saved",
        description: "Global budget settings have been saved for all months",
      })
    } catch (error) {
      console.error('BudgetPanel: failed to save budget:', error)
      toast({ title: "Error", description: "Failed to save budget", variant: "destructive" })
    }
  }

  /**
   * Snapshots the current budget amounts into an in-memory template.
   * The template can later be re-applied via handleApplyTemplate.
   */
  const handleSaveAsTemplate = () => {
    const template = budgetData.reduce<Record<string, number>>(
      (acc, item) => ({ ...acc, [item.category]: item.budgeted }),
      {},
    )
    setTemplateBudget(template)
    toast({ title: "Template saved", description: "Current budget saved as default template" })
  }

  /** Applies the saved template amounts to the current budget state. */
  const handleApplyTemplate = () => {
    if (Object.keys(templateBudget).length === 0) {
      toast({
        title: "No template found",
        description: "Please save a template first",
        variant: "destructive",
      })
      return
    }
    setBudgetData(prev =>
      prev.map(item => {
        const budgeted = templateBudget[item.category] ?? item.budgeted
        return { ...item, budgeted, remaining: budgeted - item.spent }
      }),
    )
    toast({ title: "Template applied", description: "Default budget template has been applied" })
  }

  // Deduplicate by category and sort by budgeted amount descending
  const uniqueBudgetData = Array.from(
    new Map(budgetData.map(item => [item.category, item])).values(),
  ).sort((a, b) => b.budgeted - a.budgeted)

  const totalBudgeted   = uniqueBudgetData.reduce((sum, item) => sum + Number(item.budgeted), 0)
  const totalSpent      = uniqueBudgetData.reduce((sum, item) => sum + Number(item.spent),    0)
  const totalRemaining  = totalBudgeted - totalSpent - totalInvestments
  const overallProgress = totalBudgeted > 0
    ? ((totalSpent + totalInvestments) / totalBudgeted) * 100
    : 0

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
            Your budget settings will appear here once you upload transaction data
          </div>
          <p className="text-sm text-muted-foreground">
            Go to the &quot;Upload CSV&quot; tab to import your credit card statements
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse" />
        </div>
        <div className="h-96 bg-gray-200 rounded animate-pulse" />
      </div>
    )
  }

  const selectedMonthLabel = months.find(m => m.value === selectedMonth)?.label ?? ''

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Budget Management</h2>
          <p className="text-muted-foreground">
            Set global budget amounts by category (applies to all months).
            Viewing spending for {selectedMonthLabel}
          </p>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            {months.map(month => (
              <SelectItem key={`budget-${month.value}`} value={month.value}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budgeted</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalBudgeted.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Monthly budget allocation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalSpent.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Actual spending this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Investments</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">${totalInvestments.toFixed(2)}</div>
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
            <div className={`text-2xl font-bold ${totalRemaining >= 0 ? "text-green-600" : "text-red-600"}`}>
              ${Math.abs(totalRemaining).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalRemaining >= 0 ? "Available to spend" : "Over budget amount"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Overall progress */}
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
            <span>${totalSpent.toFixed(2)} spent + ${totalInvestments.toFixed(2)} invested</span>
            <span>${totalBudgeted.toFixed(2)} budgeted</span>
          </div>
        </CardContent>
      </Card>

      <SpendingVsBudgetTable
        key={`budget-table-${selectedMonth}-${JSON.stringify(uniqueBudgetData.map(d => d.budgeted))}`}
        data={uniqueBudgetData}
        onBudgetChange={handleBudgetChange}
        onCategoryClick={handleCategoryClick}
      />

      {/* Action buttons */}
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

      {showTransactionModal && selectedCategory && (
        <TransactionModal
          isOpen={showTransactionModal}
          category={selectedCategory}
          month={selectedMonth}
          onClose={() => {
            setShowTransactionModal(false)
            setSelectedCategory(null)
          }}
          onTransactionUpdate={fetchBudgetData}
        />
      )}
    </div>
  )
}
