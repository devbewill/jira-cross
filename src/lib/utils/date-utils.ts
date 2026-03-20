import { differenceInDays, parseISO, startOfDay, isValid } from "date-fns";

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
  pixelsPerDay: number,
): number | null {
  if (!date) return null;
  const days = differenceInDays(startOfDay(date), startOfDay(timelineStart));
  return Math.max(0, days * pixelsPerDay);
}

export function calculateTimelineRange(pixelsPerDay: number = 18) {
  // Timeline is always centered on today's date
  const today = startOfDay(new Date());

  // Calculate total days to show based on zoom level
  // Default: show 90 days (3 months) at default zoom
  const totalDays = Math.ceil(90 * (18 / pixelsPerDay));

  // Calculate start and end dates centered on today
  // Today should be at 20% of the visible timeline
  const startDate = new Date(
    today.getTime() - totalDays * 0.2 * 24 * 60 * 60 * 1000,
  );
  const endDate = new Date(
    today.getTime() + totalDays * 0.8 * 24 * 60 * 60 * 1000,
  );

  return {
    start: startDate,
    end: endDate,
    totalDays,
  };
}

export function getMonthLabels(
  start: Date,
  end: Date,
): Array<{ month: string; left: number }> {
  const labels = [];
  const current = new Date(start.getFullYear(), start.getMonth(), 1);

  const pixelsPerDay = 2; // Default, should be passed from config

  while (current <= end) {
    const monthLabel = current.toLocaleDateString("it-IT", {
      month: "short",
      year: "2-digit",
    });
    const left =
      differenceInDays(startOfDay(current), startOfDay(start)) * pixelsPerDay;

    labels.push({ month: monthLabel, left });

    current.setMonth(current.getMonth() + 1);
  }

  return labels;
}
