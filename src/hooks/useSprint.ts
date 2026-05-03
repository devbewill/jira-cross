import { useState, useEffect, useCallback } from 'react';
import { SprintDashboardData } from '@/types';
import { useRefresh } from '@/contexts/RefreshContext';

export function useSprint() {
  const [data, setData] = useState<SprintDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [cacheHit, setCacheHit] = useState(false);
  const { isRefreshing, refreshKey } = useRefresh();

  const fetchSprint = useCallback(async (forceRefresh = false) => {
    try {
      if (!forceRefresh) setLoading(true);
      setError(null);
      const url = forceRefresh ? '/api/jira/sprint?refresh=1' : '/api/jira/sprint';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch sprint data');
      const json = await res.json();
      setData(json);
      setCacheHit(json.cacheHit ?? false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      if (!forceRefresh) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSprint(refreshKey > 0);
  }, [fetchSprint, refreshKey]);

  return { data, loading: loading || isRefreshing, error, cacheHit, refetch: () => fetchSprint(true) };
}
