import { differenceInDays, addDays, format } from "date-fns";

interface TimelineHeaderProps {
  timelineStart: Date;
  timelineEnd: Date;
  pixelsPerDay: number;
}

export function TimelineHeader({
  timelineStart,
  timelineEnd,
  pixelsPerDay,
}: TimelineHeaderProps) {
  const totalDays = differenceInDays(timelineEnd, timelineStart) + 1;
  const days = Array.from({ length: totalDays }, (_, i) =>
    addDays(timelineStart, i),
  );

  // Determine label interval based on zoom level to prevent overlapping
  const labelInterval = pixelsPerDay < 20 ? 7 : pixelsPerDay < 40 ? 3 : 1;

  // Determine grid line intensity based on zoom level
  const getGridStyle = (day: Date, index: number) => {
    const isStartOfWeek = day.getDay() === 1; // Monday
    const isStartOfMonth = day.getDate() === 1;
    const isStartOfQuarter = isStartOfMonth && day.getMonth() % 3 === 0;

    if (pixelsPerDay >= 30) {
      // Weeks view: show week lines
      return isStartOfWeek ? "border-linear-border" : "border-linear-border/20";
    } else if (pixelsPerDay >= 18) {
      // Months view: show week and month lines
      if (isStartOfMonth) return "border-linear-border";
      if (isStartOfWeek) return "border-linear-border/50";
      return "border-linear-border/20";
    } else {
      // Quarters view: show month and quarter lines, hide week lines
      if (isStartOfQuarter) return "border-linear-border";
      if (isStartOfMonth) return "border-linear-border/50";
      return "border-linear-border/5"; // Very faint lines for other days
    }
  };

  // Determine if label should be shown
  const shouldShowLabel = (day: Date, index: number) => {
    const isStartOfWeek = day.getDay() === 1; // Monday
    const isStartOfMonth = day.getDate() === 1;
    const isStartOfQuarter = isStartOfMonth && day.getMonth() % 3 === 0;

    if (pixelsPerDay < 10) {
      // Quarters view: only show labels for quarters
      return isStartOfQuarter;
    } else if (pixelsPerDay < 20) {
      // Quarters/Months view: show labels for months
      return isStartOfMonth;
    } else {
      // Weeks/Months view: show labels based on interval
      return index % labelInterval === 0;
    }
  };

  return (
    <div className="flex h-10 border-b border-linear-border relative bg-linear-surface">
      {days.map((day, i) => {
        const showLabel = shouldShowLabel(day, i);

        return (
          <div
            key={i}
            className={`border-r h-full relative flex items-end pb-1 ${getGridStyle(
              day,
              i,
            )}`}
            style={{ width: `${pixelsPerDay}px` }}
          >
            {showLabel && (
              <span className="absolute left-1 bottom-1 text-[10px] font-medium text-linear-textMuted select-none whitespace-nowrap">
                {format(day, "MMM d")}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
