"use client"

import { Badge } from "@/components/ui/badge"
import { getCategoryColor } from "@/lib/category-colors"

interface CategoryBadgeProps {
  category: string
  variant?: "default" | "outline" | "secondary"
  className?: string
}

export function CategoryBadge({ category, variant = "outline", className }: CategoryBadgeProps) {
  const color = getCategoryColor(category)

  return (
    <Badge
      variant={variant}
      className={className}
      style={{
        backgroundColor: variant === "outline" ? "transparent" : color,
        borderColor: color,
        color: variant === "outline" ? color : "#ffffff",
      }}
    >
      {category}
    </Badge>
  )
}
