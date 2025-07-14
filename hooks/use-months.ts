import { useState, useEffect } from 'react';

interface MonthOption {
  value: string;
  label: string;
}

export function useMonths() {
  const [months, setMonths] = useState<MonthOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMonths();
  }, []);

  const fetchMonths = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/months');
      const data = await response.json();
      
      if (response.ok) {
        setMonths(data.months);
      } else {
        setError(data.error || 'Failed to fetch months');
      }
    } catch (err) {
      setError('Failed to fetch months');
      console.error('Error fetching months:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshMonths = () => {
    fetchMonths();
  };

  return {
    months,
    loading,
    error,
    refreshMonths
  };
}

/**
 * useDefaultMonth
 * 
 * Provides a consistent default month selection across the entire application.
 * Automatically selects the most recent month when months are available.
 * 
 * Returns:
 * - selectedMonth: the currently selected month value
 * - setSelectedMonth: function to update the selected month
 * - months: array of available months
 * - loading: loading state for months
 */
export function useDefaultMonth() {
  const { months, loading } = useMonths();
  const [selectedMonth, setSelectedMonth] = useState("");

  // Auto-select the most recent month when months are loaded
  useEffect(() => {
    if (months.length > 0 && !selectedMonth && !loading) {
      // Select the first month (most recent) from the list
      setSelectedMonth(months[0].value);
    }
  }, [months, selectedMonth, loading]);

  return {
    selectedMonth,
    setSelectedMonth,
    months,
    loading
  };
} 