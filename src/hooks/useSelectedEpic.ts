'use client';

import { useState, useCallback } from 'react';
import { Epic } from '@/types';

export function useSelectedEpic() {
  const [selectedEpic, setSelectedEpic] = useState<Epic | null>(null);

  const select = useCallback((epic: Epic) => {
    setSelectedEpic(epic);
  }, []);

  const deselect = useCallback(() => {
    setSelectedEpic(null);
  }, []);

  return {
    selectedEpic,
    select,
    deselect,
  };
}
