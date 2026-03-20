'use client';

import { useState, useMemo } from 'react';
import { calculateTimelineRange, dateToPixels, parseDate } from '@/lib/utils/date-utils';
import { Epic, TimelineConfig } from '@/types';

const DEFAULT_PIXELS_PER_DAY = 10;

export function useTimelineScale(epics: Epic[], containerWidth: number = 1200) {
  const [pixelsPerDay, setPixelsPerDay] = useState(DEFAULT_PIXELS_PER_DAY);

  const config = useMemo<TimelineConfig>(() => {
    const { start, end } = calculateTimelineRange(epics);

    return {
      startDate: start,
      endDate: end,
      pixelsPerDay,
      containerWidth,
    };
  }, [epics, pixelsPerDay, containerWidth]);

  const dateToPosition = (date: string | null): number | null => {
    if (!date) return null;
    const parsed = parseDate(date);
    return dateToPixels(parsed, config.startDate, config.pixelsPerDay);
  };

  const zoom = (direction: 'in' | 'out') => {
    setPixelsPerDay((prev) => {
      if (direction === 'in') {
        return Math.min(prev * 1.2, 10);
      } else {
        return Math.max(prev / 1.2, 0.5);
      }
    });
  };

  const resetZoom = () => setPixelsPerDay(DEFAULT_PIXELS_PER_DAY);

  return {
    config,
    dateToPosition,
    zoom,
    resetZoom,
    pixelsPerDay,
  };
}
