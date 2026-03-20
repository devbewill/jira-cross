"use client";

import { useState, useMemo } from "react";
import {
  calculateTimelineRange,
  dateToPixels,
  parseDate,
} from "@/lib/utils/date-utils";
import { Epic, TimelineConfig } from "@/types";

const DEFAULT_PIXELS_PER_DAY = 18;

export function useTimelineScale(epics: Epic[], containerWidth: number = 1200) {
  const [pixelsPerDay, setPixelsPerDay] = useState(DEFAULT_PIXELS_PER_DAY);

  const config = useMemo<TimelineConfig>(() => {
    const { start, end } = calculateTimelineRange(pixelsPerDay);

    return {
      startDate: start,
      endDate: end,
      pixelsPerDay,
      containerWidth,
    };
  }, [pixelsPerDay, containerWidth]);

  const dateToPosition = (date: string | null): number | null => {
    if (!date) return null;
    const parsed = parseDate(date);
    return dateToPixels(parsed, config.startDate, config.pixelsPerDay);
  };

  // Preset zoom levels
  const setZoomLevel = (level: "weeks" | "months" | "quarters") => {
    const zoomLevels = {
      weeks: 30,
      months: 18,
      quarters: 6,
    };
    setPixelsPerDay(zoomLevels[level]);
  };

  return {
    config,
    dateToPosition,
    setZoomLevel,
    pixelsPerDay,
  };
}
