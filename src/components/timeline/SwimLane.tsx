"use client";

import { useMemo } from "react";
import { Epic, BoardData, TimelinePosition } from "@/types";
import { EpicBlock } from "./EpicBlock";

interface SwimLaneProps {
  board: BoardData;
  dateToPosition: (date: string | null) => number | null;
  onSelectEpic: (epic: Epic) => void;
  selectedEpic: Epic | null;
}

function calculateEpicPositions(
  epics: Epic[],
  dateToPosition: (date: string | null) => number | null,
): Map<string, TimelinePosition> {
  const positions = new Map<string, TimelinePosition>();
  const lanes: Array<{ endX: number }> = [];

  const sortedEpics = [...epics].sort((a, b) => {
    const aStart = dateToPosition(a.startDate) ?? 0;
    const bStart = dateToPosition(b.startDate) ?? 0;
    return aStart - bStart;
  });

  sortedEpics.forEach((epic) => {
    const startPos = dateToPosition(epic.startDate) ?? 0;
    const endPos = dateToPosition(epic.dueDate) ?? startPos + 100;
    const width = Math.max(endPos - startPos, 40);

    let assignedLane = 0;
    for (let i = 0; i < lanes.length; i++) {
      if (lanes[i].endX <= startPos - 12) {
        assignedLane = i;
        break;
      }
      assignedLane = i + 1;
    }

    while (lanes.length <= assignedLane) {
      lanes.push({ endX: 0 });
    }

    lanes[assignedLane].endX = endPos;
    positions.set(epic.key, {
      left: startPos,
      width,
      laneIndex: assignedLane,
    });
  });

  return positions;
}

export function SwimLane({
  board,
  dateToPosition,
  onSelectEpic,
  selectedEpic,
}: SwimLaneProps) {
  const positions = useMemo(
    () => calculateEpicPositions(board.epics, dateToPosition),
    [board.epics, dateToPosition],
  );

  const maxLaneIndex = Math.max(
    0,
    ...Array.from(positions.values()).map((p) => p.laneIndex),
  );
  // block height is 48, block margin is 12 -> 60 total per lane
  const swimlaneHeight = (maxLaneIndex + 1) * 60 + 24;

  return (
    <div className="flex gap-0 h-full border-b border-linear-border/30 group">
      {/* Board Label — sticky so it stays visible on horizontal scroll */}
      <div className="w-56 flex-shrink-0 bg-linear-bg border-r border-linear-border/50 flex flex-col justify-center px-4 py-4 sticky left-0 z-[100] group-hover:bg-linear-surfaceHover/10 transition-colors">
        <span className="text-linear-text text-sm font-medium tracking-tight break-words mb-1">
          {board.name || board.key}
        </span>
        <span className="text-[10px] text-linear-textMuted font-mono">
          {board.epics.length} {board.epics.length === 1 ? 'epic' : 'epics'}
        </span>
      </div>

      {/* Timeline Container */}
      <div
        className="relative flex-1 bg-transparent group-hover:bg-linear-surfaceHover/5 transition-colors duration-200"
        style={{ minHeight: `${swimlaneHeight}px` }}
      >
        {board.epics.map((epic) => {
          const pos = positions.get(epic.key);
          if (!pos) return null;

          return (
            <EpicBlock
              key={epic.key}
              epic={epic}
              left={pos.left}
              width={pos.width}
              laneIndex={pos.laneIndex}
              onClick={onSelectEpic}
              selected={selectedEpic?.key === epic.key}
            />
          );
        })}
      </div>
    </div>
  );
}
