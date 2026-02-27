"use client"

/**
 * context/finance-context.tsx
 *
 * Shared finance application state via React Context.
 *
 * Responsibilities:
 * - selectedMonth  : single source of truth for the active YYYY-MM month,
 *                    shared across Dashboard, Transactions, Budget, and Income tabs.
 *                    Changing month on any tab automatically reflects everywhere.
 * - months         : the list of available months, fetched once and refreshed
 *                    on demand after mutations (upload, edit, delete).
 * - triggerRefresh : increments refreshKey, which components use as a `key`
 *                    prop or as a useEffect dependency to re-fetch stale data.
 *
 * Usage:
 *   1. Wrap the app with <FinanceProvider> (done in app/layout.tsx).
 *   2. Call useFinance() in any client component to access shared state.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { getMonths } from '@/lib/api'
import type { MonthOption } from '@/lib/types'

// ─── Context shape ────────────────────────────────────────────────────────────

interface FinanceContextValue {
  /** Currently active month in YYYY-MM format. Shared across all tabs. */
  selectedMonth: string
  setSelectedMonth: (month: string) => void

  /** All months that have data in the DB, sorted newest-first. */
  months: MonthOption[]
  monthsLoading: boolean

  /**
   * Increments refreshKey and re-fetches the months list.
   * Call after any mutation so every tab re-renders with fresh data.
   */
  triggerRefresh: () => void

  /**
   * Monotonically-increasing counter. Components pass this as a `key` prop
   * to force full re-renders, or list it in a useEffect dependency array to
   * re-fetch data without remounting.
   */
  refreshKey: number
}

// ─── Context + Provider ───────────────────────────────────────────────────────

const FinanceContext = createContext<FinanceContextValue | null>(null)

/**
 * FinanceProvider
 *
 * Must wrap the application (added in app/layout.tsx inside ThemeProvider).
 * Fetches available months on mount and after every triggerRefresh() call.
 * Auto-selects the most recent month the first time data arrives.
 */
export function FinanceProvider({ children }: { children: ReactNode }) {
  const [months, setMonths]           = useState<MonthOption[]>([])
  const [monthsLoading, setMonthsLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState('')
  const [refreshKey, setRefreshKey]   = useState(0)

  const loadMonths = useCallback(async () => {
    try {
      setMonthsLoading(true)
      const { months: fetched } = await getMonths()
      setMonths(fetched)
      // Auto-select the most recent month only on initial load (when no month
      // is selected yet). Preserves any month the user already selected.
      setSelectedMonth(prev => prev || fetched[0]?.value || '')
    } catch (error) {
      console.error('FinanceProvider: failed to load months:', error)
    } finally {
      setMonthsLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => { loadMonths() }, [loadMonths])

  // Re-fetch months after any mutation (upload, transaction edit, etc.)
  useEffect(() => {
    if (refreshKey > 0) loadMonths()
  }, [refreshKey, loadMonths])

  const triggerRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1)
  }, [])

  return (
    <FinanceContext.Provider value={{
      selectedMonth,
      setSelectedMonth,
      months,
      monthsLoading,
      triggerRefresh,
      refreshKey,
    }}>
      {children}
    </FinanceContext.Provider>
  )
}

// ─── Consumer hook ────────────────────────────────────────────────────────────

/**
 * useFinance
 *
 * Provides access to the shared finance application state.
 * Must be called from a component rendered inside <FinanceProvider>.
 *
 * @throws {Error} if called outside of FinanceProvider
 */
export function useFinance(): FinanceContextValue {
  const ctx = useContext(FinanceContext)
  if (!ctx) {
    throw new Error('useFinance must be used within a <FinanceProvider>')
  }
  return ctx
}
