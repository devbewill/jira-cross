export function getBoardColor(boardKey: string): string {
  const colorMap: { [key: string]: string } = {
    CEF: "bg-fluo-cyan",
    AGR: "bg-fluo-magenta",
  };

  return colorMap[boardKey] || "bg-fluo-lime";
}

export function getStatusColor(
  statusCategory: "todo" | "in-progress" | "done",
): string {
  const colorMap = {
    todo: "bg-fluo-cyan border-black",
    "in-progress": "bg-fluo-magenta border-black",
    done: "bg-fluo-lime border-black",
  };

  return colorMap[statusCategory] || colorMap.todo;
}

export function getStatusTextColor(
  statusCategory: "todo" | "in-progress" | "done",
): string {
  // Use the parameter to avoid TS error, but return flat design black
  return statusCategory ? "text-black" : "text-black";
}

export function getCategoryBadgeColor(statusCategory: string): string {
  const colorMap: { [key: string]: string } = {
    todo: "bg-fluo-cyan text-black border-2 border-black",
    "in-progress": "bg-fluo-magenta text-black border-2 border-black",
    done: "bg-fluo-lime text-black border-2 border-black",
  };

  return (
    colorMap[statusCategory] ||
    "bg-fluo-cyan text-black border-2 border-black"
  );
}

