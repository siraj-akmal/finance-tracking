"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { getCategoryColor } from "@/lib/category-colors"

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

interface CategoryChartProps {
  data: CategorySpending[]
  budgetData?: BudgetVsActual[]
  onCategoryClick?: (category: string) => void
}

/**
 * CategoryChart
 *
 * Donut chart visualizing spending by category, with budget overlays and legend.
 * - Shows each category's share of total spend
 * - Overlays a colored outline for over/near budget categories
 * - Tooltip shows details on hover
 * - Legend below chart
 * - Clicking a segment triggers onCategoryClick (for drill-down)
 *
 * Props:
 * - data: Array of { category, total } for spending
 * - budgetData: Array of { category, budgeted, spent, remaining } for budgets (optional)
 * - onCategoryClick: callback when a category is clicked (optional)
 */
export function CategoryChart({ data, budgetData = [], onCategoryClick }: CategoryChartProps) {
  // Calculate total spend for percent calculations
  const totalSpend = data.reduce((sum, item) => sum + (item.total || 0), 0)
  
  // Prepare chart data with budget overlays and percent of total
  const chartData = data.map(item => {
    const budget = budgetData.find(b => b.category === item.category)
    const budgeted = budget?.budgeted || 0
    const budgetUtilization = budgeted > 0 ? ((item.total || 0) / budgeted) * 100 : 0
    
    // Determine budget status color for outline
    let budgetColor = '#22c55e' // Green - under budget
    if (budgetUtilization >= 100) {
      budgetColor = '#ef4444' // Red - over budget
    } else if (budgetUtilization >= 80) {
      budgetColor = '#eab308' // Yellow - near budget
    }
    
    return {
      name: item.category,
      value: item.total || 0,
      color: getCategoryColor(item.category),
      budgeted: budgeted,
      budgetUtilization: budgetUtilization,
      budgetColor: budgetColor,
      percentOfTotal: totalSpend > 0 ? ((item.total || 0) / totalSpend) * 100 : 0
    }
  })

  /**
   * Handles clicking a donut segment (category).
   * Calls onCategoryClick with the category name if provided.
   */
  const handleClick = (entry: any) => {
    if (onCategoryClick) {
      onCategoryClick(entry.name)
    }
  }

  /**
   * Custom tooltip for the donut chart, showing category details.
   */
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">Category: {data.name}</p>
          <p className="text-gray-700">Amount: ${(data.value || 0).toFixed(2)}</p>
          <p className="text-gray-700">% of Total Spend: {(data.percentOfTotal || 0).toFixed(0)}%</p>
          <p className="text-gray-700">Budget Used: {(data.budgetUtilization || 0).toFixed(0)}%</p>
        </div>
      )
    }
    return null
  }

  /**
   * Custom legend rendered below the chart, showing category color and label.
   */
  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload?.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-600">{entry.value}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col items-center">
      <ResponsiveContainer width="100%" height={400}>
        <PieChart>
          {/* Main donut chart - made larger */}
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={80}
            outerRadius={140}
            fill="#8884d8"
            dataKey="value"
            onClick={handleClick}
            style={{ cursor: onCategoryClick ? 'pointer' : 'default' }}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color}
                stroke="none"
                strokeWidth={0}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      {/* Render the custom legend below the chart */}
      <div className="w-full flex justify-center mt-6">
        <CustomLegend payload={chartData.map((entry) => ({
          color: entry.color,
          value: entry.name,
        }))} />
      </div>
    </div>
  )
}
