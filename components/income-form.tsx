"use client"

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
import { useDefaultMonth } from "@/hooks/use-months"

interface IncomeEntry {
  id: string
  month: string
  type: string
  description: string
  amount: number
}

interface SavingsEntry {
  id: string
  month: string
  type: string
  description: string
  amount: number
}

interface BudgetData {
  totalBudgeted: number
  totalSpent: number
  remainingBudget: number
}

export function IncomeForm() {
  const { selectedMonth, setSelectedMonth, months, loading: monthsLoading } = useDefaultMonth()
  const [incomeData, setIncomeData] = useState<IncomeEntry[]>([])
  const [savingsData, setSavingsData] = useState<SavingsEntry[]>([])
  const [budgetData, setBudgetData] = useState<BudgetData>({ totalBudgeted: 0, totalSpent: 0, remainingBudget: 0 })
  const [showIncomeDialog, setShowIncomeDialog] = useState(false)
  const [showSavingsDialog, setShowSavingsDialog] = useState(false)
  const [newIncome, setNewIncome] = useState({
    type: "salary" as string,
    description: "",
    amount: "",
  })
  const [newSavings, setNewSavings] = useState({
    type: "savings" as string,
    description: "",
    amount: "",
  })
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [selectedMonth])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [incomeResponse, savingsResponse, dashboardResponse] = await Promise.all([
        fetch(`/api/income?month=${selectedMonth}`),
        fetch(`/api/savings?month=${selectedMonth}`),
        fetch(`/api/dashboard?month=${selectedMonth}`)
      ])

      const incomeData = await incomeResponse.json()
      const savingsData = await savingsResponse.json()
      const dashboardData = await dashboardResponse.json()

      if (incomeResponse.ok) {
        setIncomeData(incomeData.income)
      } else {
        console.error('Failed to fetch income data:', incomeData.error)
      }

      if (savingsResponse.ok) {
        setSavingsData(savingsData.savings)
      } else {
        console.error('Failed to fetch savings data:', savingsData.error)
      }

      if (dashboardResponse.ok) {
        const { metrics } = dashboardData
        // The budgetVariance now includes investments as deductions
        // So remainingBudget = budgetVariance (which is already calculated as totalBudgeted - totalSpent - totalInvestments)
        setBudgetData({
          totalBudgeted: metrics.budgetVariance + metrics.totalSpend + (metrics.totalInvestments || 0),
          totalSpent: metrics.totalSpend,
          remainingBudget: Math.max(0, metrics.budgetVariance)
        })
      } else {
        console.error('Failed to fetch dashboard data:', dashboardData.error)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        title: "Error",
        description: "Failed to load income and savings data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const currentMonthIncome = incomeData.filter((item) => item.month === selectedMonth)
  const currentMonthSavings = savingsData.filter((item) => item.month === selectedMonth)

  const totalIncome = currentMonthIncome.reduce((sum, income) => sum + Number(income.amount), 0)
  const totalSavings = currentMonthSavings.reduce((sum, savings) => sum + Number(savings.amount), 0)

  const handleAddIncome = async () => {
    if (!newIncome.description || !newIncome.amount) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    try {
      const incomeData = {
        month: selectedMonth,
        type: newIncome.type,
        description: newIncome.description,
        amount: parseFloat(newIncome.amount),
      }

      const response = await fetch('/api/income', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(incomeData),
      })

      if (response.ok) {
        const result = await response.json()
        const newIncomeWithId = {
          id: result.id.toString(),
          ...incomeData,
        }

        setIncomeData((prev) => [...prev, newIncomeWithId])
        setNewIncome({ type: "salary" as string, description: "", amount: "" })
        setShowIncomeDialog(false)
        toast({
          title: "Income added",
          description: "Income entry has been added successfully",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to add income",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error adding income:', error)
      toast({
        title: "Error",
        description: "Failed to add income",
        variant: "destructive",
      })
    }
  }

  const handleAddSavings = async () => {
    if (!newSavings.description || !newSavings.amount) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    try {
      const savingsData = {
        month: selectedMonth,
        type: newSavings.type,
        description: newSavings.description,
        amount: parseFloat(newSavings.amount),
      }

      const response = await fetch('/api/savings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(savingsData),
      })

      if (response.ok) {
        const result = await response.json()
        const newSavingsWithId = {
          id: result.id.toString(),
          ...savingsData,
        }

        setSavingsData((prev) => [...prev, newSavingsWithId])
        setNewSavings({ type: "savings" as string, description: "", amount: "" })
        setShowSavingsDialog(false)
        toast({
          title: "Savings added",
          description: "Savings entry has been added successfully",
        })
        // Refresh data to update budget calculations
        await fetchData()
      } else {
        toast({
          title: "Error",
          description: "Failed to add savings",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error adding savings:', error)
      toast({
        title: "Error",
        description: "Failed to add savings",
        variant: "destructive",
      })
    }
  }

  const handleQuickInvestLeftover = () => {
    if (budgetData.remainingBudget > 0) {
      setNewSavings({
        type: "investment",
        description: `Leftover budget investment - ${selectedMonth}`,
        amount: budgetData.remainingBudget.toFixed(2)
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
          <h2 className="text-2xl font-bold tracking-tight">Income & Savings Tracking</h2>
          <p className="text-muted-foreground">
            Track your monthly income, investments, and savings for {months.find((m: any) => m.value === selectedMonth)?.label}
          </p>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            {months.map((month: any) => (
              <SelectItem key={`income-${month.value}`} value={month.value}>
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
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${Number(totalIncome).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Total income this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${Number(totalSavings).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Total savings this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${Number(budgetData.totalSpent).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">of ${Number(budgetData.totalBudgeted).toFixed(2)} budgeted</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining Budget</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${Number(budgetData.remainingBudget).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Available for investment</p>
          </CardContent>
        </Card>
      </div>

      {/* Income Section */}
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
                    <Label htmlFor="income-type" className="text-right">
                      Type
                    </Label>
                    <Select
                      value={newIncome.type}
                      onValueChange={(value: any) => setNewIncome({ ...newIncome, type: value })}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem key="income-salary" value="salary">Salary</SelectItem>
                        <SelectItem key="income-freelance" value="freelance">Freelance</SelectItem>
                        <SelectItem key="income-consulting" value="consulting">Consulting</SelectItem>
                        <SelectItem key="income-investment" value="investment">Investment Returns</SelectItem>
                        <SelectItem key="income-bonus" value="bonus">Bonus</SelectItem>
                        <SelectItem key="income-other" value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="income-description" className="text-right">
                      Description
                    </Label>
                    <Input
                      id="income-description"
                      value={newIncome.description}
                      onChange={(e) => setNewIncome({ ...newIncome, description: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="income-amount" className="text-right">
                      Amount
                    </Label>
                    <Input
                      id="income-amount"
                      type="number"
                      step="0.01"
                      value={newIncome.amount}
                      onChange={(e) => setNewIncome({ ...newIncome, amount: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowIncomeDialog(false)}>
                    Cancel
                  </Button>
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
              {currentMonthIncome.map((income) => (
                <TableRow key={income.id}>
                  <TableCell>
                    <Badge variant="secondary">{income.type}</Badge>
                  </TableCell>
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

      {/* Savings Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Savings & Investments</CardTitle>
              <CardDescription>Track your savings and investment contributions</CardDescription>
            </div>
            <div className="flex gap-2">
              {budgetData.remainingBudget > 0 && (
                <Button 
                  variant="outline" 
                  onClick={handleQuickInvestLeftover}
                  className="flex items-center gap-2"
                >
                  <Zap className="h-4 w-4" />
                  Quick Invest ${budgetData.remainingBudget.toFixed(2)}
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
                      <Label htmlFor="savings-type" className="text-right">
                        Type
                      </Label>
                      <Select
                        value={newSavings.type}
                        onValueChange={(value: any) => setNewSavings({ ...newSavings, type: value })}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem key="savings-savings" value="savings">Savings Account</SelectItem>
                          <SelectItem key="savings-401k" value="401k">401k</SelectItem>
                          <SelectItem key="savings-ira" value="ira">IRA</SelectItem>
                          <SelectItem key="savings-roth-ira" value="roth-ira">Roth IRA</SelectItem>
                          <SelectItem key="savings-stocks" value="stocks">Stocks</SelectItem>
                          <SelectItem key="savings-bonds" value="bonds">Bonds</SelectItem>
                          <SelectItem key="savings-crypto" value="crypto">Cryptocurrency</SelectItem>
                          <SelectItem key="savings-etf" value="etf">ETF</SelectItem>
                          <SelectItem key="savings-mutual-fund" value="mutual-fund">Mutual Fund</SelectItem>
                          <SelectItem key="savings-real-estate" value="real-estate">Real Estate</SelectItem>
                          <SelectItem key="savings-investment" value="investment">Other Investment</SelectItem>
                          <SelectItem key="savings-emergency" value="emergency">Emergency Fund</SelectItem>
                          <SelectItem key="savings-other" value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="savings-description" className="text-right">
                        Description
                      </Label>
                      <Input
                        id="savings-description"
                        value={newSavings.description}
                        onChange={(e) => setNewSavings({ ...newSavings, description: e.target.value })}
                        className="col-span-3"
                        placeholder="e.g., Vanguard S&P 500 ETF, Apple stock purchase, etc."
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="savings-amount" className="text-right">
                        Amount
                      </Label>
                      <Input
                        id="savings-amount"
                        type="number"
                        step="0.01"
                        value={newSavings.amount}
                        onChange={(e) => setNewSavings({ ...newSavings, amount: e.target.value })}
                        className="col-span-3"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowSavingsDialog(false)}>
                      Cancel
                  </Button>
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
              {currentMonthSavings.map((savings) => (
                <TableRow key={savings.id}>
                  <TableCell>
                    <Badge variant="outline">{savings.type}</Badge>
                  </TableCell>
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
