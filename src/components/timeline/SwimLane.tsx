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

  // Sort epics by start date, then by duration
  const sortedEpics = [...epics].sort((a, b) => {
    const aStart = dateToPosition(a.startDate) ?? 0;
    const bStart = dateToPosition(b.startDate) ?? 0;
    return aStart - bStart;
  });

  sortedEpics.forEach((epic) => {
    const startPos = dateToPosition(epic.startDate) ?? 0;
    const endPos = dateToPosition(epic.dueDate) ?? startPos + 100;
    const width = Math.max(endPos - startPos, 40);

    // Find the first lane where this epic doesn't overlap
    // Added 12px margin between epics in the same lane roughly mapped to timeline width
    let assignedLane = 0;
    for (let i = 0; i < lanes.length; i++) {
      if (lanes[i].endX <= startPos - 12) {
        assignedLane = i;
        break;
      }
      assignedLane = i + 1;
    }

    // Extend lanes array if needed
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
  // block height is 64, block margin is 16 -> 80 total per lane
  const swimlaneHeight = (maxLaneIndex + 1) * 80 + 32;

  const boardColor = board.key === "CEF" ? "bg-fluo-cyan" : "bg-fluo-magenta";

  return (
    <div className="flex gap-0 h-full border-b-2 border-black">
      {/* Board Label */}
      <div
        className={`w-56 flex-shrink-0 ${boardColor} border-r-2 border-black flex items-center px-6 py-4 font-bold text-lg uppercase tracking-wider relative overflow-hidden`}
      >
        <div className="absolute inset-0 bg-white opacity-0 transition-opacity hover:opacity-10 pointer-events-none" />
        <div className="flex flex-col z-10 w-full relative">
          <span className="text-black text-2xl drop-shadow-sm font-black tracking-widest break-words leading-tight">
            {board.name || board.key}
          </span>
          <span className="text-sm text-black font-bold mt-1 bg-white inline-block px-2 py-0.5 border-2 border-black shadow-hard-sm self-start">
            {board.key}
          </span>
        </div>
      </div>

      {/* Timeline Container */}
      <div
        className="relative flex-1 bg-white hover:bg-gray-50 transition-colors duration-200"
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
