/**
 * lib/api.ts
 *
 * Functional client-side API service layer.
 *
 * Principles:
 * - Pure async functions — no React hooks, no side effects beyond the HTTP call.
 * - Every function is fully typed using domain types from lib/types.ts.
 * - A single `apiFetch` helper centralises error handling so callers only
 *   need to handle domain errors, not HTTP plumbing.
 * - Functions are grouped by resource and exported individually so
 *   tree-shaking removes unused ones from client bundles.
 */

import type {
  Budget,
  DashboardData,
  IncomeEntry,
  MonthOption,
  SavingsEntry,
  Transaction,
} from './types'

// ─── Internal helper ─────────────────────────────────────────────────────────

/**
 * Core fetch wrapper. Throws an Error with the server's error message on
 * non-OK responses, falling back to the HTTP status code.
 */
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options)
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? `HTTP ${response.status}`)
  }
  return response.json() as Promise<T>
}

/** Produces the RequestInit fields for a JSON POST/PUT body. */
const jsonBody = (data: unknown): Pick<RequestInit, 'headers' | 'body'> => ({
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
})

// ─── Transactions ─────────────────────────────────────────────────────────────

export interface TransactionFilters {
  month?: string
  category?: string
  limit?: number
}

/**
 * Fetches transactions with optional filters.
 * Returns all columns including computed `edited` and `llmCategorized` flags.
 */
export function getTransactions(filters: TransactionFilters = {}): Promise<{ transactions: Transaction[] }> {
  const params = new URLSearchParams()
  if (filters.month)    params.set('month',    filters.month)
  if (filters.category) params.set('category', filters.category)
  if (filters.limit !== undefined) params.set('limit', String(filters.limit))
  return apiFetch(`/api/transactions?${params}`)
}

/**
 * Creates a new transaction. Amount is normalised to negative by the API.
 */
export function createTransaction(
  data: Omit<Transaction, 'id' | 'edited' | 'llmCategorized'>,
): Promise<{ success: boolean; id: number }> {
  return apiFetch('/api/transactions', { method: 'POST', ...jsonBody(data) })
}

/**
 * Updates editable fields of an existing transaction.
 * The API always sets `edited = true` on the server row.
 */
export function updateTransaction(
  id: string,
  data: Partial<Pick<Transaction, 'description' | 'category' | 'amount' | 'edited'>>,
): Promise<{ success: boolean }> {
  return apiFetch(`/api/transactions/${id}`, { method: 'PUT', ...jsonBody(data) })
}

/** Hard-deletes a transaction by ID. */
export function deleteTransaction(id: string): Promise<{ success: boolean }> {
  return apiFetch(`/api/transactions/${id}`, { method: 'DELETE' })
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

/**
 * Returns aggregated dashboard metrics, category spending, and budget-vs-actual
 * data for the given month (YYYY-MM).
 */
export function getDashboard(month: string): Promise<DashboardData> {
  return apiFetch(`/api/dashboard?month=${encodeURIComponent(month)}`)
}

// ─── Months ───────────────────────────────────────────────────────────────────

/**
 * Returns the union of all months present across transactions, income, and
 * savings tables, sorted newest-first and formatted for display.
 */
export function getMonths(): Promise<{ months: MonthOption[] }> {
  return apiFetch('/api/months')
}

// ─── Budgets ──────────────────────────────────────────────────────────────────

/**
 * Returns all global budgets (month = ''), which apply to every month.
 * Ordered by budgeted amount descending.
 */
export function getGlobalBudgets(): Promise<{ budgets: Budget[] }> {
  return apiFetch('/api/budgets/global')
}

/**
 * Creates or updates the global budget for a single category.
 * The API uses upsert logic (update if exists, insert if not).
 */
export function saveGlobalBudget(
  category: string,
  budgeted: number,
): Promise<{ success: boolean }> {
  return apiFetch('/api/budgets/global', { method: 'POST', ...jsonBody({ category, budgeted }) })
}

// ─── Income ───────────────────────────────────────────────────────────────────

/**
 * Returns income entries, optionally filtered by month (YYYY-MM).
 * Ordered by month DESC, type.
 */
export function getIncome(month?: string): Promise<{ income: IncomeEntry[] }> {
  const qs = month ? `?month=${encodeURIComponent(month)}` : ''
  return apiFetch(`/api/income${qs}`)
}

/** Creates a new income entry for the given month. */
export function createIncome(
  data: Omit<IncomeEntry, 'id'>,
): Promise<{ success: boolean; id: number }> {
  return apiFetch('/api/income', { method: 'POST', ...jsonBody(data) })
}

// ─── Savings ──────────────────────────────────────────────────────────────────

/**
 * Returns savings entries, optionally filtered by month (YYYY-MM).
 * Ordered by month DESC, type.
 */
export function getSavings(month?: string): Promise<{ savings: SavingsEntry[] }> {
  const qs = month ? `?month=${encodeURIComponent(month)}` : ''
  return apiFetch(`/api/savings${qs}`)
}

/** Creates a new savings or investment entry for the given month. */
export function createSavings(
  data: Omit<SavingsEntry, 'id'>,
): Promise<{ success: boolean; id: number }> {
  return apiFetch('/api/savings', { method: 'POST', ...jsonBody(data) })
}
