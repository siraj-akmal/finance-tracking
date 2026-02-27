/**
 * lib/types.ts
 *
 * Canonical domain types for the finance tracker.
 * Importing from this single module guarantees type consistency across
 * API routes, client-side API service, hooks, and components.
 */

// ─── Core entities ───────────────────────────────────────────────────────────

export interface Transaction {
  id: string
  date: string
  description: string
  /** Always negative for expenses, positive for income credits. */
  amount: number
  category: string
  bank: string
  edited: boolean
  llmCategorized: boolean
  /** Format: YYYY-MM */
  month: string
}

export interface Budget {
  id?: string
  category: string
  /** Monthly budget allocation in dollars. */
  budgeted: number
  /** YYYY-MM for month-specific budgets; empty string '' for global budgets. */
  month: string
}

/**
 * BudgetItem joins a global Budget with the current month's actual spending.
 * Computed client-side in budget-panel.tsx and by the dashboard API route.
 */
export interface BudgetItem {
  category: string
  budgeted: number
  spent: number
  remaining: number
}

export interface IncomeEntry {
  id: string
  /** Format: YYYY-MM */
  month: string
  /** e.g. 'salary' | 'freelance' | 'bonus' | 'investment' | 'other' */
  type: string
  description: string
  amount: number
}

export interface SavingsEntry {
  id: string
  /** Format: YYYY-MM */
  month: string
  /** e.g. 'savings' | '401k' | 'ira' | 'stocks' | 'crypto' | 'emergency' | 'other' */
  type: string
  description: string
  amount: number
}

// ─── UI helpers ──────────────────────────────────────────────────────────────

export interface MonthOption {
  /** YYYY-MM storage value. */
  value: string
  /** Human-readable label, e.g. "January 2024". */
  label: string
}

// ─── API response shapes ─────────────────────────────────────────────────────

export interface DashboardMetrics {
  totalSpend: number
  totalIncome: number
  totalSavings: number
  totalInvestments: number
  budgetVariance: number
}

export interface CategorySpending {
  category: string
  total: number
}

export interface DashboardData {
  metrics: DashboardMetrics
  categorySpending: CategorySpending[]
  budgetVsActual: BudgetItem[]
}
