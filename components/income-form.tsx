"use client"

/**
 * components/income-form.tsx
 *
 * Income & Savings tracking panel: summary cards, income source table,
 * savings / investment table, and quick-invest leftover-budget shortcut.
 *
 * State management:
 * - selectedMonth / months come from FinanceProvider (shared across tabs).
 * - incomeData, savingsData, budgetData are local — they are derived from
 *   the selected month and do not need cross-tab sharing.
 */

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, TrendingUp, PiggyBank, Zap, DollarSign } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useFinance } from "@/context/finance-context"
import { getIncome, createIncome, getSavings, createSavings, getDashboard } from "@/lib/api"
import type { IncomeEntry, SavingsEntry } from "@/lib/types"

interface LocalBudgetSummary {
  totalBudgeted: number
  totalSpent: number
  remainingBudget: number
}

/**
 * IncomeForm
 *
 * Renders income sources and savings / investment entries for the selected
 * month. Shares the month selector with the Dashboard and Budget tabs via
 * FinanceContext so all three tabs always display the same month.
 */
export function IncomeForm() {
  const { selectedMonth, setSelectedMonth, months } = useFinance()
  const { toast } = useToast()

  const [incomeData,  setIncomeData]  = useState<IncomeEntry[]>([])
  const [savingsData, setSavingsData] = useState<SavingsEntry[]>([])
  const [budgetSummary, setBudgetSummary] = useState<LocalBudgetSummary>({
    totalBudgeted: 0,
    totalSpent: 0,
    remainingBudget: 0,
  })
  const [showIncomeDialog,  setShowIncomeDialog]  = useState(false)
  const [showSavingsDialog, setShowSavingsDialog] = useState(false)
  const [newIncome, setNewIncome] = useState({ type: "salary", description: "", amount: "" })
  const [newSavings, setNewSavings] = useState({ type: "savings", description: "", amount: "" })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (selectedMonth) fetchData()
  }, [selectedMonth])

  /**
   * Fetches income, savings, and dashboard metrics for the selected month
   * in parallel. Dashboard metrics are used to compute the budget summary card.
   */
  const fetchData = async () => {
    try {
      setLoading(true)
      const [incomeRes, savingsRes, dashboardRes] = await Promise.all([
        getIncome(selectedMonth),
        getSavings(selectedMonth),
        getDashboard(selectedMonth),
      ])

      setIncomeData(incomeRes.income)
      setSavingsData(savingsRes.savings)

      const { metrics } = dashboardRes
      setBudgetSummary({
        totalBudgeted:  metrics.budgetVariance + metrics.totalSpend + (metrics.totalInvestments ?? 0),
        totalSpent:     metrics.totalSpend,
        remainingBudget: Math.max(0, metrics.budgetVariance),
      })
    } catch (error) {
      console.error('IncomeForm: failed to fetch data:', error)
      toast({
        title: "Error",
        description: "Failed to load income and savings data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Filter to entries for the selected month (API already filters, this is a safeguard)
  const currentMonthIncome   = incomeData.filter(item => item.month === selectedMonth)
  const currentMonthSavings  = savingsData.filter(item => item.month === selectedMonth)

  const totalIncome  = currentMonthIncome.reduce((sum, i) => sum + Number(i.amount), 0)
  const totalSavings = currentMonthSavings.reduce((sum, s) => sum + Number(s.amount), 0)

  /** Creates a new income entry and appends it to the local list optimistically. */
  const handleAddIncome = async () => {
    if (!newIncome.description || !newIncome.amount) {
      toast({ title: "Missing information", description: "Please fill in all fields", variant: "destructive" })
      return
    }
    try {
      const payload = {
        month: selectedMonth,
        type: newIncome.type,
        description: newIncome.description,
        amount: parseFloat(newIncome.amount),
      }
      const result = await createIncome(payload)
      setIncomeData(prev => [...prev, { id: result.id.toString(), ...payload }])
      setNewIncome({ type: "salary", description: "", amount: "" })
      setShowIncomeDialog(false)
      toast({ title: "Income added", description: "Income entry has been added successfully" })
    } catch (error) {
      console.error('IncomeForm: failed to add income:', error)
      toast({ title: "Error", description: "Failed to add income", variant: "destructive" })
    }
  }

  /** Creates a new savings entry and re-fetches data so budget summary updates. */
  const handleAddSavings = async () => {
    if (!newSavings.description || !newSavings.amount) {
      toast({ title: "Missing information", description: "Please fill in all fields", variant: "destructive" })
      return
    }
    try {
      const payload = {
        month: selectedMonth,
        type: newSavings.type,
        description: newSavings.description,
        amount: parseFloat(newSavings.amount),
      }
      const result = await createSavings(payload)
      setSavingsData(prev => [...prev, { id: result.id.toString(), ...payload }])
      setNewSavings({ type: "savings", description: "", amount: "" })
      setShowSavingsDialog(false)
      toast({ title: "Savings added", description: "Savings entry has been added successfully" })
      // Re-fetch so the budget summary (which includes investments) is accurate
      await fetchData()
    } catch (error) {
      console.error('IncomeForm: failed to add savings:', error)
      toast({ title: "Error", description: "Failed to add savings", variant: "destructive" })
    }
  }

  /**
   * Pre-fills the savings dialog with the remaining budget so the user can
   * invest their leftover money in one click.
   */
  const handleQuickInvestLeftover = () => {
    if (budgetSummary.remainingBudget > 0) {
      setNewSavings({
        type: "investment",
        description: `Leftover budget investment - ${selectedMonth}`,
        amount: budgetSummary.remainingBudget.toFixed(2),
      })
      setShowSavingsDialog(true)
    } else {
      toast({
        title: "No leftover budget",
        description: "You don't have any remaining budget to invest this month",
        variant: "destructive",
      })
    }
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
          <h2 className="text-2xl font-bold tracking-tight">Income &amp; Savings Tracking</h2>
          <p className="text-muted-foreground">
            Track your monthly income, investments, and savings for {selectedMonthLabel}
          </p>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            {months.map(month => (
              <SelectItem key={`income-${month.value}`} value={month.value}>
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
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalIncome.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Total income this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalSavings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Total savings this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${budgetSummary.totalSpent.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              of ${budgetSummary.totalBudgeted.toFixed(2)} budgeted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining Budget</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${budgetSummary.remainingBudget.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Available for investment</p>
          </CardContent>
        </Card>
      </div>

      {/* Income table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Income Sources</CardTitle>
              <CardDescription>Track all your income sources for the month</CardDescription>
            </div>
            <Dialog open={showIncomeDialog} onOpenChange={setShowIncomeDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Income
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Income</DialogTitle>
                  <DialogDescription>Add a new income source for this month.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="income-type" className="text-right">Type</Label>
                    <Select value={newIncome.type} onValueChange={v => setNewIncome({ ...newIncome, type: v })}>
                      <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="salary">Salary</SelectItem>
                        <SelectItem value="freelance">Freelance</SelectItem>
                        <SelectItem value="consulting">Consulting</SelectItem>
                        <SelectItem value="investment">Investment Returns</SelectItem>
                        <SelectItem value="bonus">Bonus</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="income-description" className="text-right">Description</Label>
                    <Input
                      id="income-description"
                      value={newIncome.description}
                      onChange={e => setNewIncome({ ...newIncome, description: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="income-amount" className="text-right">Amount</Label>
                    <Input
                      id="income-amount"
                      type="number"
                      step="0.01"
                      value={newIncome.amount}
                      onChange={e => setNewIncome({ ...newIncome, amount: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowIncomeDialog(false)}>Cancel</Button>
                  <Button onClick={handleAddIncome}>Add Income</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentMonthIncome.map(income => (
                <TableRow key={income.id}>
                  <TableCell><Badge variant="secondary">{income.type}</Badge></TableCell>
                  <TableCell>{income.description}</TableCell>
                  <TableCell className="text-right font-mono text-green-600">
                    ${Number(income.amount).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
              {currentMonthIncome.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No income entries for this month
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Savings / investments table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Savings &amp; Investments</CardTitle>
              <CardDescription>Track your savings and investment contributions</CardDescription>
            </div>
            <div className="flex gap-2">
              {budgetSummary.remainingBudget > 0 && (
                <Button variant="outline" onClick={handleQuickInvestLeftover} className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Quick Invest ${budgetSummary.remainingBudget.toFixed(2)}
                </Button>
              )}
              <Dialog open={showSavingsDialog} onOpenChange={setShowSavingsDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Savings
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Savings</DialogTitle>
                    <DialogDescription>Add a new savings or investment entry for this month.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="savings-type" className="text-right">Type</Label>
                      <Select value={newSavings.type} onValueChange={v => setNewSavings({ ...newSavings, type: v })}>
                        <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="savings">Savings Account</SelectItem>
                          <SelectItem value="401k">401k</SelectItem>
                          <SelectItem value="ira">IRA</SelectItem>
                          <SelectItem value="roth-ira">Roth IRA</SelectItem>
                          <SelectItem value="stocks">Stocks</SelectItem>
                          <SelectItem value="bonds">Bonds</SelectItem>
                          <SelectItem value="crypto">Cryptocurrency</SelectItem>
                          <SelectItem value="etf">ETF</SelectItem>
                          <SelectItem value="mutual-fund">Mutual Fund</SelectItem>
                          <SelectItem value="real-estate">Real Estate</SelectItem>
                          <SelectItem value="investment">Other Investment</SelectItem>
                          <SelectItem value="emergency">Emergency Fund</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="savings-description" className="text-right">Description</Label>
                      <Input
                        id="savings-description"
                        value={newSavings.description}
                        onChange={e => setNewSavings({ ...newSavings, description: e.target.value })}
                        className="col-span-3"
                        placeholder="e.g., Vanguard S&P 500 ETF"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="savings-amount" className="text-right">Amount</Label>
                      <Input
                        id="savings-amount"
                        type="number"
                        step="0.01"
                        value={newSavings.amount}
                        onChange={e => setNewSavings({ ...newSavings, amount: e.target.value })}
                        className="col-span-3"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowSavingsDialog(false)}>Cancel</Button>
                    <Button onClick={handleAddSavings}>Add Savings</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentMonthSavings.map(savings => (
                <TableRow key={savings.id}>
                  <TableCell><Badge variant="outline">{savings.type}</Badge></TableCell>
                  <TableCell>{savings.description}</TableCell>
                  <TableCell className="text-right font-mono text-blue-600">
                    ${Number(savings.amount).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
              {currentMonthSavings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No savings entries for this month
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
