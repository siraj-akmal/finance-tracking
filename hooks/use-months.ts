/**
 * hooks/use-months.ts
 *
 * Thin compatibility wrappers around FinanceContext.
 *
 * These hooks previously fetched months independently, causing each component
 * to maintain its own month list and selected-month state — leading to
 * out-of-sync dropdowns when switching tabs.
 *
 * They now delegate to useFinance() so the entire app shares a single
 * source of truth: one month list, one selected month, one refresh cycle.
 *
 * If you need month data in a component, prefer calling useFinance() directly.
 * These wrappers exist only to avoid breaking any remaining call sites.
 */

import { useFinance } from '@/context/finance-context';

/**
 * useMonths — returns the shared months list and a refresh trigger.
 *
 * @returns months     - available months, newest-first
 * @returns loading    - true while months are being fetched
 * @returns refreshMonths - triggers a re-fetch (delegates to triggerRefresh)
 */
export function useMonths() {
  const { months, monthsLoading, triggerRefresh } = useFinance();

  return {
    months,
    loading: monthsLoading,
    error: null,               // errors are logged inside FinanceProvider
    refreshMonths: triggerRefresh,
  };
}

/**
 * useDefaultMonth — returns the shared selected month and setter.
 *
 * @returns selectedMonth    - currently active YYYY-MM month
 * @returns setSelectedMonth - updates the shared month (affects all tabs)
 * @returns months           - available months, newest-first
 * @returns loading          - true while months are being fetched
 */
export function useDefaultMonth() {
  const { selectedMonth, setSelectedMonth, months, monthsLoading } = useFinance();

  return {
    selectedMonth,
    setSelectedMonth,
    months,
    loading: monthsLoading,
  };
}
