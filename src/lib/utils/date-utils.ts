import { differenceInDays, parseISO, startOfDay, isValid } from 'date-fns';

export function parseDate(dateString: string | null): Date | null {
  if (!dateString) return null;
  try {
    const parsed = parseISO(dateString);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function dateToPixels(
  date: Date | null,
  timelineStart: Date,
  pixelsPerDay: number
): number | null {
  if (!date) return null;
  const days = differenceInDays(startOfDay(date), startOfDay(timelineStart));
  return Math.max(0, days * pixelsPerDay);
}

export function calculateTimelineRange(
  epics: Array<{ startDate: string | null; dueDate: string | null }>,
  paddingDays: number = 30
) {
  const allDates = epics
    .flatMap((epic) => [epic.startDate, epic.dueDate])
    .map((d) => parseDate(d))
    .filter((d) => d !== null) as Date[];

  if (allDates.length === 0) {
    const today = new Date();
    return {
      start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
      end: new Date(today.getFullYear(), today.getMonth() + 3, 1),
    };
  }

  const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));

  return {
    start: new Date(minDate.getTime() - paddingDays * 24 * 60 * 60 * 1000),
    end: new Date(maxDate.getTime() + paddingDays * 24 * 60 * 60 * 1000),
  };
}

export function getMonthLabels(start: Date, end: Date): Array<{ month: string; left: number }> {
  const labels = [];
  const current = new Date(start.getFullYear(), start.getMonth(), 1);

  const pixelsPerDay = 2; // Default, should be passed from config

  while (current <= end) {
    const monthLabel = current.toLocaleDateString('it-IT', {
      month: 'short',
      year: '2-digit',
    });
    const left = differenceInDays(startOfDay(current), startOfDay(start)) * pixelsPerDay;

    labels.push({ month: monthLabel, left });

    current.setMonth(current.getMonth() + 1);
  }

  return labels;
}
