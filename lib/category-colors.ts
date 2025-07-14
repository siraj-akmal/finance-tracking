// Category color mapping for the finance tracker

export const categories = [
  "Housing",
  "Food & Drink",
  "Groceries",
  "Transportation",
  "Lifestyle & Entertainment",
  "Shopping",
  "Subscriptions",
  "Health & Wellness",
  "Gifts & Donations",
  "Travel",
  "Miscellaneous",
] as const;

export type Category = typeof categories[number];

export const categoryColors: Record<Category, string> = {
  "Housing": "#6366f1",                // Indigo
  "Food & Drink": "#f59e42",           // Orange
  "Groceries": "#22c55e",              // Green
  "Transportation": "#0ea5e9",         // Sky
  "Lifestyle & Entertainment": "#a21caf", // Purple
  "Shopping": "#7c3aed",               // Violet
  "Subscriptions": "#e11d48",          // Rose
  "Health & Wellness": "#10b981",      // Emerald
  "Gifts & Donations": "#f87171",      // Red
  "Travel": "#fbbf24",                 // Amber
  "Miscellaneous": "#64748b",          // Slate
};

export function getCategoryColor(category: string): string {
  return categoryColors[category as Category] || "#6b7280";
}

// For charts that need lighter versions of colors
export const getCategoryColorLight = (category: string): string => {
  const baseColor = getCategoryColor(category)
  // Add lighter variants for each color
  const lightColors: Record<string, string> = {
    "#6366f1": "#a5b4fc", // Lighter indigo
    "#f59e42": "#fcd34d", // Lighter orange
    "#22c55e": "#86efac", // Lighter green
    "#0ea5e9": "#7dd3fc", // Lighter sky
    "#a21caf": "#e9d5ff", // Lighter purple
    "#7c3aed": "#c4b5fd", // Lighter violet
    "#e11d48": "#fb7185", // Lighter rose
    "#10b981": "#6ee7b7", // Lighter emerald
    "#f87171": "#fecaca", // Lighter red
    "#fbbf24": "#fde68a", // Lighter amber
    "#64748b": "#cbd5e1", // Lighter slate
  }
  return lightColors[baseColor] || baseColor
}
