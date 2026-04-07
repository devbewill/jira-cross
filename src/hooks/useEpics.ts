'use client';

import { useState, useEffect } from 'react';
import { EpicsApiResponse } from '@/types';
import { useRefresh } from '@/contexts/RefreshContext';

interface UseEpicsState {
  data: EpicsApiResponse | null;
  loading: boolean;
  error: Error | null;
  cacheHit: boolean;
}

export function useEpics(): UseEpicsState & {
  refetch: () => Promise<void>;
} {
  const { refreshKey } = useRefresh();
  const [state, setState] = useState<UseEpicsState>({
    data: null,
    loading: true,
    error: null,
    cacheHit: false,
  });

  const fetchEpics = async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch(`/api/jira/epics`);

      if (!response.ok) {
        let errorMsg = response.statusText;
        try {
          const errorData = await response.json();
          if (errorData.error) errorMsg = errorData.error;
        } catch (e) {
          // ignore parsing error
        }
        throw new Error(errorMsg);
      }

      const data: EpicsApiResponse = await response.json();
      setState({
        data,
        loading: false,
        error: null,
        cacheHit: data.cacheHit || false,
      });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
        cacheHit: false,
      });
    }
  };

  useEffect(() => {
    fetchEpics();
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    ...state,
    refetch: fetchEpics,
  };
}
