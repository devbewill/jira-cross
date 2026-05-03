import { useState, useEffect, useCallback } from 'react';

export function useGroup(groupname: string) {
  const [data, setData] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchGroup = useCallback(async () => {
    if (!groupname) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/jira/group?groupname=${groupname}`);
      if (!res.ok) throw new Error('Failed to fetch group data');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [groupname]);

  useEffect(() => {
    fetchGroup();
  }, [fetchGroup]);

  return { data, loading, error, refetch: fetchGroup };
}
