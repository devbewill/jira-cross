'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  buildTimelineConfig,
  dateToPixels,
  getScrollLeftForToday,
  clampScrollLeft,
  getScrollBounds,
  isTodayVisible,
  parseDate,
} from '@/lib/utils/date-utils';
import { TimeScale, TimelineConfig } from '@/types';
import { startOfDay } from 'date-fns';

const DEFAULT_SCALE: TimeScale = 'weeks';

export function useTimelineScale(viewportWidth: number = 1200) {
  const [scale, setScale] = useState<TimeScale>(DEFAULT_SCALE);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Today is stable for the entire session (midnight of current day)
  const today = useMemo(() => startOfDay(new Date()), []);

  // The scroll origin is the min date of the scrollable bounds.
  // All pixel positions are relative to this date.
  const scrollOrigin = useMemo(() => {
    const bounds = getScrollBounds(scale, today);
    return bounds.min;
  }, [scale, today]);

  const config = useMemo<TimelineConfig>(
    () => buildTimelineConfig(scale, viewportWidth, today),
    [scale, viewportWidth, today],
  );

  // Convert a date string to pixel position relative to scrollOrigin
  const dateToPosition = useCallback(
    (date: string | null): number | null => {
      if (!date) return null;
      const parsed = parseDate(date);
      return dateToPixels(parsed, scrollOrigin, config.pxPerDay);
    },
    [scrollOrigin, config.pxPerDay],
  );

  // Snap scroll so that today is at its natural position in the visible range
  const snapToToday = useCallback(
    (behavior: ScrollBehavior = 'instant') => {
      const container = scrollContainerRef.current;
      if (!container) return;
      const scrollLeft = getScrollLeftForToday(scale, viewportWidth, scrollOrigin, today);
      const clamped = clampScrollLeft(scrollLeft, scale, viewportWidth, scrollOrigin, today);
      container.scrollTo({ left: clamped, behavior });
    },
    [scale, viewportWidth, scrollOrigin, today],
  );

  // Public "go to today" with smooth animation
  const goToToday = useCallback(() => {
    snapToToday('smooth');
  }, [snapToToday]);

  // Change scale (scroll snap happens via the effect below)
  const changeScale = useCallback((newScale: TimeScale) => {
    setScale(newScale);
  }, []);

  // Snap to today whenever scale or viewportWidth changes.
  // This covers: initial mount, scale change, and viewport resize.
  // We skip the snap only if viewportWidth is still the default placeholder (0 or unchanged).
  const lastSnapKey = useRef<string>('');
  useEffect(() => {
    // Don't snap until we have a real measured width
    if (viewportWidth <= 0) return;

    const snapKey = `${scale}-${viewportWidth}`;
    if (lastSnapKey.current === snapKey) return;
    lastSnapKey.current = snapKey;

    // Use rAF to ensure the DOM has updated with the new dimensions
    requestAnimationFrame(() => {
      const container = scrollContainerRef.current;
      if (!container) return;
      const originForScale = getScrollBounds(scale, today).min;
      const scrollLeft = getScrollLeftForToday(scale, viewportWidth, originForScale, today);
      const clamped = clampScrollLeft(scrollLeft, scale, viewportWidth, originForScale, today);
      container.scrollLeft = clamped;
    });
  }, [scale, viewportWidth, today]);

  // Check if today marker is currently visible
  const checkTodayVisible = useCallback((): boolean => {
    const container = scrollContainerRef.current;
    if (!container) return true;
    return isTodayVisible(container.scrollLeft, viewportWidth, scrollOrigin, config.pxPerDay, today);
  }, [viewportWidth, scrollOrigin, config.pxPerDay, today]);

  return {
    scale,
    config,
    scrollOrigin,
    scrollContainerRef,
    dateToPosition,
    changeScale,
    goToToday,
    checkTodayVisible,
    today,
  };
}
