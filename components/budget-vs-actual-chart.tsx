"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface BudgetVsActual {
  category: string
  budgeted: number
  spent: number
  remaining: number
}

interface BudgetVsActualChartProps {
  data: BudgetVsActual[]
  onCategoryClick?: (category: string) => void
}

export function BudgetVsActualChart({ data, onCategoryClick }: BudgetVsActualChartProps) {
  const chartData = data.map(item => ({
    category: item.category,
    budgeted: item.budgeted,
    actual: item.spent,
  }))

  const handleClick = (entry: any) => {
    if (onCategoryClick) {
      onCategoryClick(entry.category)
    }
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="category" 
          angle={-45}
          textAnchor="end"
          height={80}
          fontSize={12}
        />
        <YAxis />
        <Tooltip 
          formatter={(value: any) => [`$${value.toFixed(2)}`, 'Amount']}
          labelFormatter={(label) => `Category: ${label}`}
        />
        <Legend />
        <Bar 
          dataKey="budgeted" 
          fill="#8884d8" 
          name="Budgeted"
          onClick={handleClick}
          style={{ cursor: onCategoryClick ? 'pointer' : 'default' }}
        />
        <Bar 
          dataKey="actual" 
          fill="#82ca9d" 
          name="Actual"
          onClick={handleClick}
          style={{ cursor: onCategoryClick ? 'pointer' : 'default' }}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
