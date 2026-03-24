import {
  differenceInDays,
  parseISO,
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfQuarter,
  endOfWeek,
  addWeeks,
  addMonths,
  addQuarters,
  addDays,
  isValid,
  format,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachQuarterOfInterval,
} from 'date-fns';
import { it } from 'date-fns/locale';
import { TimeScale, ScaleConfig, TimelineConfig } from '@/types';

// ─── Scale Definitions ──────────────────────────────────────────────
// Each scale defines:
//   - how many "units before today" and "units after today" to show
//   - what tick unit to render in the header

export const SCALE_CONFIGS: Record<TimeScale, Omit<ScaleConfig, 'pxPerDay' | 'visibleDays'>> = {
  today: {
    unitsBefore: 1,  // 1 week before
    unitsAfter: 1,   // 1 week after (current week counts as part of range)
    tickUnit: 'day',
  },
  weeks: {
    unitsBefore: 1,  // 1 week before
    unitsAfter: 4,   // 4 weeks after
    tickUnit: 'day',
  },
  months: {
    unitsBefore: 1,  // 1 month before
    unitsAfter: 4,   // 4 months after (current + 3 more)
    tickUnit: 'month',
  },
  quarters: {
    unitsBefore: 1,  // 1 quarter before
    unitsAfter: 3,   // 3 quarters after (current + 2 more)
    tickUnit: 'quarter',
  },
};

// ─── Scroll Bounds (max scrollable range per scale) ─────────────────

export function getScrollBounds(scale: TimeScale, today: Date): { min: Date; max: Date } {
  switch (scale) {
    case 'today':
      return { min: addMonths(today, -3), max: addMonths(today, 3) };
    case 'weeks':
      return { min: addMonths(today, -6), max: addMonths(today, 12) };
    case 'months':
      return { min: addMonths(today, -12), max: addMonths(today, 24) };
    case 'quarters':
      return { min: addMonths(today, -24), max: addMonths(today, 48) };
  }
}

// ─── Visible Range Calculation ──────────────────────────────────────
// Given a scale, compute the default visible start/end dates.

export function getVisibleRange(
  scale: TimeScale,
  today: Date = new Date(),
): { start: Date; end: Date; days: number } {
  const t = startOfDay(today);

  switch (scale) {
    case 'today': {
      // Start of previous week → end of next week (≈3 calendar weeks)
      const currentWeekStart = startOfWeek(t, { weekStartsOn: 1 });
      const start = addWeeks(currentWeekStart, -1);
      const end = endOfWeek(addWeeks(currentWeekStart, 1), { weekStartsOn: 1 });
      return { start, end, days: differenceInDays(end, start) + 1 };
    }
    case 'weeks': {
      // Previous week start → end of 4th week after current
      const currentWeekStart = startOfWeek(t, { weekStartsOn: 1 });
      const start = addWeeks(currentWeekStart, -1);
      const end = endOfWeek(addWeeks(currentWeekStart, 4), { weekStartsOn: 1 });
      return { start, end, days: differenceInDays(end, start) + 1 };
    }
    case 'months': {
      // Start of previous month → end of 4th month after current
      const currentMonthStart = startOfMonth(t);
      const start = addMonths(currentMonthStart, -1);
      // End = last day of the 4th successive month
      const endMonth = addMonths(currentMonthStart, 4);
      const end = addDays(startOfMonth(addMonths(endMonth, 1)), -1);
      return { start, end, days: differenceInDays(end, start) + 1 };
    }
    case 'quarters': {
      // Start of previous quarter → end of 3rd quarter after current
      const currentQuarterStart = startOfQuarter(t);
      const start = addQuarters(currentQuarterStart, -1);
      const endQuarter = addQuarters(currentQuarterStart, 3);
      const end = addDays(startOfQuarter(addQuarters(endQuarter, 1)), -1);
      return { start, end, days: differenceInDays(end, start) + 1 };
    }
  }
}

// ─── Px Per Day ─────────────────────────────────────────────────────
// Computed dynamically: viewportWidth / visibleDays

export function getPxPerDay(scale: TimeScale, viewportWidth: number, today?: Date): number {
  const { days } = getVisibleRange(scale, today);
  return viewportWidth / days;
}

// ─── Full Timeline Config ───────────────────────────────────────────
// Build a complete TimelineConfig for a given scale and viewport width.

export function buildTimelineConfig(
  scale: TimeScale,
  viewportWidth: number,
  today: Date = new Date(),
): TimelineConfig {
  const { start: visibleStart, end: visibleEnd, days } = getVisibleRange(scale, today);
  const pxPerDay = viewportWidth / days;

  // Scrollable area = scroll bounds (wider than visible)
  const bounds = getScrollBounds(scale, today);
  const totalDays = differenceInDays(bounds.max, bounds.min) + 1;
  const totalWidth = totalDays * pxPerDay;

  return {
    scale,
    visibleStart,
    visibleEnd,
    pxPerDay,
    totalWidth,
    tickUnit: SCALE_CONFIGS[scale].tickUnit,
  };
}

// ─── Date ↔ Pixel Conversion ────────────────────────────────────────

export function dateToPixels(
  date: Date | null,
  scrollOrigin: Date,
  pxPerDay: number,
): number | null {
  if (!date) return null;
  const days = differenceInDays(startOfDay(date), startOfDay(scrollOrigin));
  return days * pxPerDay;
}

export function pixelsToDate(px: number, scrollOrigin: Date, pxPerDay: number): Date {
  const days = Math.round(px / pxPerDay);
  return addDays(startOfDay(scrollOrigin), days);
}

// ─── ScrollLeft for "Go to Today" ───────────────────────────────────
// Computes the scrollLeft that places today at 55% from the left edge
// of the viewport, giving more visibility of the past.

export function getScrollLeftForToday(
  scale: TimeScale,
  viewportWidth: number,
  scrollOrigin: Date,
  today: Date = new Date(),
): number {
  const pxPerDay = getPxPerDay(scale, viewportWidth, today);
  const todayPx = differenceInDays(startOfDay(today), startOfDay(scrollOrigin)) * pxPerDay;
  return todayPx - viewportWidth * 0.55;
}

// ─── Clamp scroll within bounds ─────────────────────────────────────

export function clampScrollLeft(
  scrollLeft: number,
  scale: TimeScale,
  viewportWidth: number,
  scrollOrigin: Date,
  today: Date = new Date(),
): number {
  const pxPerDay = getPxPerDay(scale, viewportWidth, today);
  const bounds = getScrollBounds(scale, today);
  const minScroll = differenceInDays(startOfDay(bounds.min), startOfDay(scrollOrigin)) * pxPerDay;
  const maxScroll =
    differenceInDays(startOfDay(bounds.max), startOfDay(scrollOrigin)) * pxPerDay - viewportWidth;
  return Math.max(minScroll, Math.min(maxScroll, scrollLeft));
}

// ─── Today visibility check ─────────────────────────────────────────

export function isTodayVisible(
  scrollLeft: number,
  viewportWidth: number,
  scrollOrigin: Date,
  pxPerDay: number,
  today: Date = new Date(),
): boolean {
  const todayPx = differenceInDays(startOfDay(today), startOfDay(scrollOrigin)) * pxPerDay;
  const screenX = todayPx - scrollLeft;
  return screenX >= 0 && screenX <= viewportWidth;
}

// ─── Header Tick Generation ─────────────────────────────────────────

export interface TickLabel {
  label: string;
  sublabel?: string;
  leftPx: number;
  widthPx?: number;
}

export function generateTicks(
  scale: TimeScale,
  scrollOrigin: Date,
  pxPerDay: number,
  rangeStart: Date,
  rangeEnd: Date,
): TickLabel[] {
  const cfg = SCALE_CONFIGS[scale];

  switch (cfg.tickUnit) {
    case 'day': {
      const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
      return days.map((day) => {
        const leftPx = differenceInDays(startOfDay(day), startOfDay(scrollOrigin)) * pxPerDay;
        const dayLabel =
          scale === 'today'
            ? format(day, 'EEE d', { locale: it })
            : format(day, 'd', { locale: it });
        return {
          label: dayLabel,
          sublabel: day.getDate() === 1 ? format(day, 'MMM yyyy', { locale: it }) : undefined,
          leftPx,
          widthPx: pxPerDay,
        };
      });
    }
    case 'month': {
      const months = eachMonthOfInterval({ start: rangeStart, end: rangeEnd });
      return months.map((month, i) => {
        const leftPx = differenceInDays(startOfDay(month), startOfDay(scrollOrigin)) * pxPerDay;
        const nextMonth = i < months.length - 1 ? months[i + 1] : addMonths(month, 1);
        const widthPx = differenceInDays(nextMonth, month) * pxPerDay;
        return {
          label: format(month, 'MMM', { locale: it }),
          sublabel: month.getMonth() === 0 ? format(month, 'yyyy') : undefined,
          leftPx,
          widthPx,
        };
      });
    }
    case 'quarter': {
      const quarters = eachQuarterOfInterval({ start: rangeStart, end: rangeEnd });
      return quarters.map((q, i) => {
        const leftPx = differenceInDays(startOfDay(q), startOfDay(scrollOrigin)) * pxPerDay;
        const nextQ = i < quarters.length - 1 ? quarters[i + 1] : addQuarters(q, 1);
        const widthPx = differenceInDays(nextQ, q) * pxPerDay;
        const qNum = Math.ceil((q.getMonth() + 1) / 3);
        return {
          label: `Q${qNum}`,
          sublabel: format(q, 'yyyy'),
          leftPx,
          widthPx,
        };
      });
    }
  }
}

// ─── Parse helpers (unchanged API) ──────────────────────────────────

export function parseDate(dateString: string | null): Date | null {
  if (!dateString) return null;
  try {
    const parsed = parseISO(dateString);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
