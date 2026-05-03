import { useState, useEffect, useCallback } from 'react';
import { TimesheetData } from '@/types';
import { useRefresh } from '@/contexts/RefreshContext';

export function useTimesheet(startDate: string, endDate: string) {
  const [data, setData] = useState<TimesheetData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [cacheHit, setCacheHit] = useState(false);
  const { isRefreshing, refreshKey } = useRefresh();

  const fetchTimesheet = useCallback(async (forceRefresh = false) => {
    if (!startDate || !endDate || startDate > endDate) return;
    try {
      if (!forceRefresh) setLoading(true);
      setError(null);
      const url = `/api/jira/timesheet?startDate=${startDate}&endDate=${endDate}${forceRefresh ? '&refresh=1' : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch timesheet data');
      const json = await res.json();
      setData(json);
      setCacheHit(json.cacheHit ?? false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      if (!forceRefresh) setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchTimesheet(refreshKey > 0);
  }, [fetchTimesheet, refreshKey]);

  return { data, loading: loading || isRefreshing, error, cacheHit, refetch: () => fetchTimesheet(true) };
}
