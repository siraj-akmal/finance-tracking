"use client"

import React, { useState, useEffect } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { getCategoryColor, categories } from "@/lib/category-colors"

interface MonthlyTrendChartProps {
  selectedCategory?: string | null
  onCategoryClick?: (category: string | null) => void
}

export function MonthlyTrendChart({ selectedCategory, onCategoryClick }: MonthlyTrendChartProps) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)

  useEffect(() => {
    fetchTrendData()
  }, [])

  const fetchTrendData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/transactions?limit=1000')
      const result = await response.json()
      
      if (response.ok && result.transactions) {
        // Group transactions by month and category
        const monthlyData = new Map()
        
        result.transactions.forEach((transaction: any) => {
          const month = transaction.month
          const category = transaction.category
          const amount = Math.abs(Number(transaction.amount))
          
          if (!monthlyData.has(month)) {
            monthlyData.set(month, { month })
          }
          
          const monthData = monthlyData.get(month)
          monthData[category] = (monthData[category] || 0) + amount
        })
        
        // Convert to array and sort by month
        const trendData = Array.from(monthlyData.values())
          .sort((a, b) => a.month.localeCompare(b.month))
        
        setData(trendData)
      }
    } catch (error) {
      console.error('Error fetching trend data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-center">
        <div className="text-muted-foreground">
          <div className="text-lg mb-2">Loading trends...</div>
        </div>
      </div>
    )
  }

  // Show empty state if no data
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-center">
        <div className="text-muted-foreground">
          <div className="text-lg mb-2">📈 Monthly trends will appear here</div>
          <div className="text-sm">Upload transaction data to see your spending trends over time</div>
        </div>
      </div>
    )
  }

  // Filter bars to show only the selected category if one is chosen
  const visibleCategories = selectedCategory ? [selectedCategory] : categories

  // Custom clickable legend styled like the donut chart
  const renderLegend = (props: any) => {
    const { payload } = props
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        <span
          className={`cursor-pointer px-2 py-1 rounded ${!selectedCategory ? "bg-gray-200 font-bold" : "hover:bg-gray-100"}`}
          onClick={() => onCategoryClick && onCategoryClick(null)}
        >
          All
        </span>
        {payload.map((entry: any, idx: number) => (
          <span
            key={entry.value}
            className={`flex items-center gap-2 cursor-pointer px-2 py-1 rounded ${selectedCategory === entry.value ? "bg-gray-300 font-bold" : "hover:bg-gray-100"}`}
            onClick={() => onCategoryClick && onCategoryClick(entry.value)}
          >
            <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
            {entry.value}
          </span>
        ))}
      </div>
    )
  }

  // Custom Tooltip: always show hovered bar's category, even with all categories visible
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length > 0 && hoveredCategory) {
      // Find the hovered bar's value for the current month
      const hovered = payload.find((entry: any) => entry.dataKey === hoveredCategory)
      if (!hovered) return null
      return (
        <div
          className="z-50 bg-white p-3 border border-gray-200 rounded-lg shadow-lg"
          style={{ position: 'relative', zIndex: 9999 }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: hovered.color }} />
            <span className="font-semibold text-gray-900">{hovered.name}</span>
          </div>
          <div className="text-gray-700 text-sm">Month: <span className="font-medium">{label}</span></div>
          <div className="text-gray-700 text-sm">Amount: <span className="font-medium">${Number(hovered.value).toLocaleString()}</span></div>
        </div>
      )
    }
    return null
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip
          content={<CustomTooltip />}
          wrapperStyle={{ zIndex: 9999, pointerEvents: 'auto' }}
        />
        <Legend content={renderLegend} />
        {visibleCategories.map((category) => (
          <Bar
            key={category}
            dataKey={category}
            stackId="a"
            fill={getCategoryColor(category)}
            name={category}
            onClick={() => onCategoryClick && onCategoryClick(category)}
            style={{ cursor: "pointer" }}
            onMouseOver={() => setHoveredCategory(category)}
            onMouseOut={() => setHoveredCategory(null)}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
