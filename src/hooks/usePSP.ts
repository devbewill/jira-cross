'use client';

import { useState, useEffect } from 'react';
import { PSPApiResponse } from '@/types';
import { useRefresh } from '@/contexts/RefreshContext';

interface UsePSPState {
  data: PSPApiResponse | null;
  loading: boolean;
  error: Error | null;
  cacheHit: boolean;
}

export function usePSP(): UsePSPState & { refetch: () => Promise<void> } {
  const { refreshKey } = useRefresh();
  const [state, setState] = useState<UsePSPState>({
    data: null,
    loading: true,
    error: null,
    cacheHit: false,
  });

  const fetchPSP = async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch('/api/jira/psp');
      if (!response.ok) {
        let errorMsg = response.statusText;
        try {
          const errorData = await response.json();
          if (errorData.error) errorMsg = errorData.error;
        } catch (_) { /* ignore */ }
        throw new Error(errorMsg);
      }
      const data: PSPApiResponse = await response.json();
      setState({ data, loading: false, error: null, cacheHit: data.cacheHit || false });
    } catch (error) {
      setState({ data: null, loading: false, error: error instanceof Error ? error : new Error('Unknown error'), cacheHit: false });
    }
  };

  useEffect(() => { fetchPSP(); }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { ...state, refetch: fetchPSP };
}
