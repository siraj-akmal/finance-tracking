"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Edit } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { CategoryBadge } from "@/components/category-badge"
import { categories } from "@/lib/category-colors"
import { Label } from "@/components/ui/label"
import { useMonths } from "@/hooks/use-months"
import { removeNumbers } from "@/lib/utils"

interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  category: string
  bank: string
  edited: boolean
}

interface TransactionModalProps {
  isOpen: boolean
  onClose: () => void
  category: string | null
  month: string
  onTransactionUpdate?: () => void
}

export function TransactionModal({ isOpen, onClose, category, month, onTransactionUpdate }: TransactionModalProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (category && isOpen) {
      fetchTransactions()
    }
  }, [category, month, isOpen])

  const fetchTransactions = async () => {
    if (!category) return

    try {
      setLoading(true)
      const response = await fetch(`/api/transactions?category=${encodeURIComponent(category)}&month=${month}`)
      const data = await response.json()
      
      if (response.ok) {
        setTransactions(data.transactions)
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

  const filteredTransactions = transactions.filter((transaction) =>
    transaction.description.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const totalAmount = filteredTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const transactionCount = filteredTransactions.length

  const handleEditCategory = async (transaction: Transaction, newCategory: string) => {
    try {
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...transaction,
          category: newCategory,
          edited: true,
        }),
      })

      if (response.ok) {
        setTransactions((prev) =>
          prev.map((t) => (t.id === transaction.id ? { ...t, category: newCategory, edited: true } : t)),
        )
        setEditingTransaction(null)
        toast({
          title: "Transaction updated",
          description: `Transaction moved to ${newCategory}`,
        })
        
        // Trigger parent component refresh
        if (onTransactionUpdate) {
          onTransactionUpdate()
        }
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

  const { months: availableMonths } = useMonths()

  const getMonthLabel = (monthValue: string) => {
    return availableMonths.find((m) => m.value === monthValue)?.label || monthValue
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {category} Transactions - {getMonthLabel(month)}
          </DialogTitle>
          <DialogDescription>
            View and edit transactions for {category} in {getMonthLabel(month)}. Total: ${totalAmount.toFixed(2)} across {transactionCount} transactions.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-muted-foreground">Loading transactions...</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
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
                        {removeNumbers(transaction.description)}
                        {transaction.edited && (
                          <Badge variant="secondary" className="text-xs">
                            Edited
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{transaction.bank}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-red-600">
                      ${Math.abs(transaction.amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setEditingTransaction(transaction)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!loading && filteredTransactions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "No transactions match your search" : "No transactions found for this category"}
            </div>
          )}
        </div>

        {/* Edit Category Dialog */}
        <Dialog open={!!editingTransaction} onOpenChange={() => setEditingTransaction(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Transaction Category</DialogTitle>
              <DialogDescription>
                Change the category for "{removeNumbers(editingTransaction?.description)}"
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Category</Label>
                <Select
                  value={editingTransaction?.category}
                  onValueChange={(value) => editingTransaction && handleEditCategory(editingTransaction, value)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={`modal-${category}`} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
