"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const data = [
  { month: "Aug", spending: 2800 },
  { month: "Sep", spending: 3100 },
  { month: "Oct", spending: 2950 },
  { month: "Nov", spending: 3240 },
  { month: "Dec", spending: 2890 },
  { month: "Jan", spending: 3240 },
]

export function SpendingChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="month" stroke="#374151" />
        <YAxis stroke="#374151" />
        <Tooltip
          formatter={(value) => [`$${Number(value).toLocaleString()}`, "Spending"]}
          contentStyle={{
            backgroundColor: "#ffffff",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          }}
        />
        <Line
          type="monotone"
          dataKey="spending"
          stroke="#2563eb"
          strokeWidth={3}
          dot={{ fill: "#2563eb", strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, fill: "#1d4ed8" }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
