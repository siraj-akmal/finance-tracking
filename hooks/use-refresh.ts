import { useState, useCallback } from 'react';

export function useRefresh() {
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  return {
    refreshKey,
    triggerRefresh
  };
} 