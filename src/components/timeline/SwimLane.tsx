"use client";

import { useMemo } from "react";
import { Epic, BoardData, TimelinePosition } from "@/types";
import { EpicBlock, BLOCK_HEIGHT, BAR_HEIGHT, BLOCK_MARGIN_BASE, BLOCK_MARGIN_RELEASES } from "./EpicBlock";

interface SwimLaneProps {
  board:            BoardData;
  height:           number;
  dateToPosition:   (date: string | null) => number | null;
  onSelectEpic:     (epic: Epic) => void;
  selectedEpic:     Epic | null;
  showReleaseBars?: boolean;
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

/** Pure function used by TimelineContainer to pre-compute row heights
 *  so the label column can match the timeline rows exactly. */
export function computeSwimLaneHeight(
  epics: Epic[],
  dateToPosition: (date: string | null) => number | null,
  showReleaseBars = true,
): number {
  const positions = calculateEpicPositions(epics, dateToPosition);
  const maxLaneIndex = Math.max(
    0,
    ...Array.from(positions.values()).map((p) => p.laneIndex),
  );
  const margin = showReleaseBars ? BLOCK_MARGIN_RELEASES : BLOCK_MARGIN_BASE;
  return (maxLaneIndex + 1) * (BLOCK_HEIGHT + BAR_HEIGHT + margin) + margin;
}

export function SwimLane({
  board,
  height,
  dateToPosition,
  onSelectEpic,
  selectedEpic,
  showReleaseBars = true,
}: SwimLaneProps) {
  const positions = useMemo(
    () => calculateEpicPositions(board.epics, dateToPosition),
    [board.epics, dateToPosition],
  );

  return (
    <div
      className="relative border-b border-linear-border/30"
      style={{ minHeight: `${height}px` }}
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
            dateToPosition={dateToPosition}
            showReleaseBars={showReleaseBars}
          />
        );
      })}
    </div>
  );
}
