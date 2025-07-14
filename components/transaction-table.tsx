"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Edit, Plus, Search, Filter, Bot, Calendar, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { CategoryBadge } from "@/components/category-badge"
import { categories } from "@/lib/category-colors"
import { useMonths } from "@/hooks/use-months"

interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  category: string
  bank: string
  edited: boolean
  llmCategorized?: boolean
  month: string
}

interface TransactionTableProps {
  onTransactionUpdate?: () => void;
}

export function TransactionTable({ onTransactionUpdate }: TransactionTableProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [monthFilter, setMonthFilter] = useState("all")
  const [bankFilter, setBankFilter] = useState("all")
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [newTransaction, setNewTransaction] = useState({
    date: "",
    description: "",
    amount: "",
    category: "",
  })
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { toast } = useToast()
  const { months: availableMonths, loading: monthsLoading, refreshMonths } = useMonths()

  const months = [
    { value: "all", label: "All Months" },
    ...availableMonths
  ]

  const banks = [
    { value: "all", label: "All Banks" },
    { value: "Chase", label: "Chase" },
    { value: "AMEX", label: "American Express" },
    { value: "BOA", label: "Bank of America" },
    { value: "Manual", label: "Manual Entry" },
  ]

  useEffect(() => {
    fetchTransactions()
  }, [])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/transactions?limit=1000')
      const data = await response.json()
      
      if (response.ok) {
        // Convert decimal amounts to numbers
        const processedTransactions = data.transactions.map((transaction: any) => ({
          ...transaction,
          amount: Number(transaction.amount),
          id: transaction.id.toString()
        }))
        setTransactions(processedTransactions)
      } else {
        console.error('Failed to fetch transactions:', data.error)
        toast({
          title: "Error",
          description: "Failed to load transactions",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
      toast({
        title: "Error",
        description: "Failed to load transactions",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const refreshTransactions = async () => {
    setRefreshing(true)
    await fetchTransactions()
    await refreshMonths() // Refresh available months
    setRefreshing(false)
  }

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch =
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.bank.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = categoryFilter === "all" || transaction.category === categoryFilter
    const matchesMonth = monthFilter === "all" || transaction.month === monthFilter
    const matchesBank = bankFilter === "all" || transaction.bank === bankFilter
    
    return matchesSearch && matchesCategory && matchesMonth && matchesBank
  })

  const totalAmount = filteredTransactions.reduce((sum, t) => sum + t.amount, 0)
  const totalSpent = filteredTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const totalIncome = filteredTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction({ ...transaction })
  }

  const handleSaveEdit = async () => {
    if (!editingTransaction) return

    try {
      const response = await fetch(`/api/transactions/${editingTransaction.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingTransaction),
      })

      if (response.ok) {
        setTransactions((prev) =>
          prev.map((t) => (t.id === editingTransaction.id ? { ...editingTransaction, edited: true } : t)),
        )
        setEditingTransaction(null)
        toast({
          title: "Transaction updated",
          description: "The transaction has been successfully updated",
        })
        
        // Refresh available months in case the transaction month changed
        await refreshMonths()
        
        // Trigger parent component refresh
        onTransactionUpdate?.()
      } else {
        toast({
          title: "Error",
          description: "Failed to update transaction",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error updating transaction:', error)
      toast({
        title: "Error",
        description: "Failed to update transaction",
        variant: "destructive",
      })
    }
  }

  const handleDeleteTransaction = async () => {
    if (!editingTransaction) return;
    try {
      const response = await fetch(`/api/transactions/${editingTransaction.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setTransactions((prev) => prev.filter((t) => t.id !== editingTransaction.id));
        setEditingTransaction(null);
        toast({
          title: 'Transaction deleted',
          description: 'The transaction has been successfully deleted',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete transaction',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete transaction',
        variant: 'destructive',
      });
    }
  };

  const handleAddTransaction = async () => {
    if (!newTransaction.date || !newTransaction.description || !newTransaction.amount || !newTransaction.category) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    try {
      const transactionData = {
        date: newTransaction.date,
        description: newTransaction.description,
        amount: parseFloat(newTransaction.amount),
        category: newTransaction.category,
        bank: "Manual",
        month: newTransaction.date.substring(0, 7), // Extract YYYY-MM
      }

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionData),
      })

      if (response.ok) {
        const result = await response.json()
        const newTransactionWithId = {
          id: result.id.toString(),
          ...transactionData,
          edited: false,
          llmCategorized: false,
        }

        setTransactions((prev) => [newTransactionWithId, ...prev])
        setNewTransaction({ date: "", description: "", amount: "", category: "" })
        setShowAddDialog(false)
        toast({
          title: "Transaction added",
          description: "The transaction has been successfully added",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to add transaction",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error adding transaction:', error)
      toast({
        title: "Error",
        description: "Failed to add transaction",
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
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem key="filter-all" value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={`filter-${category}`} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-40">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={`transaction-month-${month.value}`} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={bankFilter} onValueChange={setBankFilter}>
            <SelectTrigger className="w-40">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by bank" />
            </SelectTrigger>
            <SelectContent>
              {banks.map((bank) => (
                <SelectItem key={`transaction-bank-${bank.value}`} value={bank.value}>
                  {bank.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refreshTransactions} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Transaction</DialogTitle>
                <DialogDescription>
                  Enter the details for the new transaction.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="date" className="text-right">
                    Date
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={newTransaction.date}
                    onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={newTransaction.description}
                    onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="amount" className="text-right">
                    Amount
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={newTransaction.amount}
                    onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="category" className="text-right">
                    Category
                  </Label>
                  <Select
                    value={newTransaction.category}
                    onValueChange={(value) => setNewTransaction({ ...newTransaction, category: value })}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={`add-${category}`} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddTransaction}>Add Transaction</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredTransactions.length}</div>
            <p className="text-xs text-muted-foreground">Filtered results</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Net Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${totalAmount.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Income - Expenses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">${totalSpent.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">All expenses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${totalIncome.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">All income</p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions ({filteredTransactions.length})</CardTitle>
          <CardDescription>View and edit your transaction history</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-mono text-sm">{new Date(transaction.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="truncate max-w-xs" title={transaction.description}>
                        {transaction.description}
                      </span>
                      {transaction.edited && (
                        <Badge variant="secondary" className="text-xs">
                          Edited
                        </Badge>
                      )}
                      {transaction.llmCategorized && (
                        <Badge variant="outline" className="text-xs">
                          <Bot className="w-3 h-3 mr-1" />
                          AI
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <CategoryBadge category={transaction.category} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{transaction.bank}</Badge>
                  </TableCell>
                  <TableCell className={`text-right font-mono ${transaction.amount < 0 ? "text-red-600" : "text-green-600"}`}>
                    ${Math.abs(transaction.amount).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handleEditTransaction(transaction)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredTransactions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || categoryFilter !== "all" || monthFilter !== "all" || bankFilter !== "all" 
                ? "No transactions match your filters" 
                : "No transactions found"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Transaction Dialog */}
      <Dialog open={!!editingTransaction} onOpenChange={() => setEditingTransaction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
            <DialogDescription>
              Update the transaction details.
            </DialogDescription>
          </DialogHeader>
          {editingTransaction && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="edit-description"
                  value={editingTransaction.description}
                  onChange={(e) => setEditingTransaction({ ...editingTransaction, description: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-category" className="text-right">
                  Category
                </Label>
                <Select
                  value={editingTransaction.category}
                  onValueChange={(value) => setEditingTransaction({ ...editingTransaction, category: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={`edit-${category}`} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTransaction(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTransaction}>
              Delete
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
