"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

interface BudgetVsActual {
  category: string
  budgeted: number
  spent: number
  remaining: number
}

interface SpendingVsBudgetTableProps {
  data: BudgetVsActual[]
  onCategoryClick?: (category: string) => void
  onBudgetChange?: (category: string, newBudget: number) => void
}

/**
 * SpendingVsBudgetTable
 *
 * Table comparing budgeted vs actual spending for each category.
 * - Sortable by any column (click header)
 * - Progress bar color-coded by percent used (green/yellow/red)
 * - Clicking a row triggers onCategoryClick (for drill-down)
 *
 * Props:
 * - data: Array of { category, budgeted, spent, remaining }
 * - onCategoryClick: callback when a row is clicked (optional)
 */
export function SpendingVsBudgetTable({ data, onCategoryClick, onBudgetChange }: SpendingVsBudgetTableProps) {
  console.log('🔍 SpendingVsBudgetTable received data:', data.map((b: any) => ({ category: b.category, budgeted: b.budgeted })))
  
  // Deduplicate by category
  const uniqueTableData = Array.from(
    new Map(data.map(item => [item.category, item])).values()
  ).map(item => ({
    category: item.category,
    budgeted: item.budgeted,
    actual: item.spent,
    remaining: item.remaining,
    percentUsed: item.budgeted > 0 ? (item.spent / item.budgeted) * 100 : 0
  }))
  
  console.log('🔍 uniqueTableData after deduplication:', uniqueTableData.map((b: any) => ({ category: b.category, budgeted: b.budgeted })))

  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [userSorted, setUserSorted] = useState(false)

  // Reset sorting to parent order when data changes
  useEffect(() => {
    setSortColumn(null)
    setSortDirection("desc")
    setUserSorted(false)
  }, [data])

  // Track which category is being edited and the input value
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>("")

  /**
   * Handles sorting when a column header is clicked.
   * Toggles direction if already sorting by that column.
   */
  const handleSort = (column: string) => {
    setUserSorted(true)
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  // Sort the table data only if user has sorted
  const sortedData = userSorted && sortColumn
    ? [...uniqueTableData].sort((a, b) => {
        let aValue = a[sortColumn as keyof typeof a]
        let bValue = b[sortColumn as keyof typeof b]
        if (typeof aValue === "string") aValue = aValue.toLowerCase()
        if (typeof bValue === "string") bValue = bValue.toLowerCase()
        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
        return 0
      })
    : uniqueTableData
  
  console.log('🔍 Final sortedData in table:', sortedData.map((b: any) => ({ category: b.category, budgeted: b.budgeted })))

  /**
   * Handles clicking a row (category).
   * Calls onCategoryClick with the category name if provided.
   */
  const handleRowClick = (category: string) => {
    if (onCategoryClick) {
      onCategoryClick(category)
    }
  }

  /**
   * Renders a sort arrow (▲▼) for the current sort column.
   */
  const sortArrow = (column: string) => {
    if (sortColumn !== column) return null
    return sortDirection === "asc" ? " ▲" : " ▼"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending vs Budget</CardTitle>
        <CardDescription>Detailed breakdown of budget performance</CardDescription>
      </CardHeader>
      <CardContent>
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer select-none w-1/5"
                onClick={() => handleSort("category")}
              >
                Category{sortArrow("category")}
              </TableHead>
              <TableHead
                className="cursor-pointer select-none w-1/5"
                onClick={() => handleSort("budgeted")}
              >
                Budgeted{sortArrow("budgeted")}
              </TableHead>
              <TableHead
                className="cursor-pointer select-none w-1/5"
                onClick={() => handleSort("actual")}
              >
                Actual{sortArrow("actual")}
              </TableHead>
              <TableHead
                className="cursor-pointer select-none w-1/5"
                onClick={() => handleSort("remaining")}
              >
                Remaining{sortArrow("remaining")}
              </TableHead>
              <TableHead
                className="cursor-pointer select-none w-1/5"
                onClick={() => handleSort("percentUsed")}
              >
                Progress{sortArrow("percentUsed")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((item) => (
              <TableRow 
                key={item.category}
                onClick={() => handleRowClick(item.category)}
                className={onCategoryClick ? "cursor-pointer hover:bg-gray-50" : ""}
              >
                <TableCell className="w-1/5 font-medium">{item.category}</TableCell>
                <TableCell
                  className="w-1/5"
                  onDoubleClick={e => {
                    e.stopPropagation();
                    setEditingCategory(item.category);
                    setEditValue(String(item.budgeted));
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {editingCategory === item.category ? (
                    <input
                      type="number"
                      className="w-20 px-1 py-0.5 border rounded text-right"
                      value={editValue}
                      autoFocus
                      min={0}
                      step={0.01}
                      onChange={e => setEditValue(e.target.value)}
                      onBlur={() => {
                        setEditingCategory(null);
                        if (
                          onBudgetChange &&
                          editValue !== '' &&
                          !isNaN(Number(editValue)) &&
                          Number(editValue) !== item.budgeted
                        ) {
                          onBudgetChange(item.category, Number(editValue));
                        }
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          setEditingCategory(null);
                          if (
                            onBudgetChange &&
                            editValue !== '' &&
                            !isNaN(Number(editValue)) &&
                            Number(editValue) !== item.budgeted
                          ) {
                            onBudgetChange(item.category, Number(editValue));
                          }
                        } else if (e.key === 'Escape') {
                          setEditingCategory(null);
                        }
                      }}
                    />
                  ) : (
                    <span title="Double-click to edit">${Number(item.budgeted).toFixed(2)}</span>
                  )}
                </TableCell>
                <TableCell className="w-1/5">${Number(item.actual).toFixed(2)}</TableCell>
                <TableCell className="w-1/5">
                  <span className={item.remaining >= 0 ? "text-green-600" : "text-red-600"}>
                    ${Number(item.remaining).toFixed(2)}
                  </span>
                </TableCell>
                <TableCell className="w-1/5">
                  <div className="flex items-center gap-2 min-w-[120px]">
                    {(() => {
                      let barColor = "bg-green-500";
                      if (item.percentUsed >= 90) barColor = "bg-red-500";
                      else if (item.percentUsed >= 70) barColor = "bg-yellow-400";
                      return (
                        <Progress
                          value={Math.min(item.percentUsed, 100)}
                          className="w-24"
                          barColor={barColor}
                        />
                      );
                    })()}
                    <span className="text-xs text-muted-foreground">
                      {item.percentUsed.toFixed(1)}%
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
