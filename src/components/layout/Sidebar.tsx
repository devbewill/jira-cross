"use client";
import { Epic } from "@/types";
import { Badge } from "../ui/Badge";

interface SidebarProps {
  epic: Epic | null;
  onClose?: () => void;
}

export function Sidebar({ epic, onClose }: SidebarProps) {
  if (!epic) {
    return (
      <aside className="w-80 bg-white border-2 border-black flex flex-col items-center justify-center p-8 text-center bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIi8+CjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNjY2MiLz4KPC9zdmc+')] z-20 shadow-hard">
        <div className="bg-white border-2 border-black px-4 py-2 shadow-hard font-bold text-black uppercase tracking-wider text-sm transform -rotate-2 hover:rotate-0 transition-transform">
          ⚡ Select an epic
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-80 bg-white border-2 border-black flex flex-col h-full overflow-hidden z-20 relative shadow-hard">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b-2 border-black flex-shrink-0 bg-fluo-yellow">
        <h2 className="font-black text-xl text-black uppercase tracking-widest leading-tight w-full drop-shadow-[2px_2px_0px_rgba(255,255,255,1)]">
          {epic.key}
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-black hover:text-white hover:bg-black transition-colors duration-100 text-2xl font-black w-8 h-8 flex items-center justify-center border-2 border-transparent hover:border-black rounded-sm"
          >
            ✕
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Summary */}
        <div className="bg-white p-4 border-2 border-black shadow-hard-sm">
          <h3 className="font-black text-black mb-2 text-xs uppercase tracking-widest bg-fluo-cyan inline-block px-1 border border-black">
            Summary
          </h3>
          <p className="text-sm text-black font-medium leading-relaxed">
            {epic.summary}
          </p>
        </div>

        {/* Status */}
        <div>
          <h3 className="font-black text-black mb-2 text-xs uppercase tracking-widest">
            Status
          </h3>
          <Badge
            label={epic.status}
            variant="status"
            statusCategory={epic.statusCategory}
          />
        </div>

        {/* Board */}
        <div>
          <h3 className="font-black text-black mb-2 text-xs uppercase tracking-widest">
            Board
          </h3>
          <p className="text-sm text-black font-black uppercase tracking-wider bg-fluo-magenta inline-block px-2 py-1 border-2 border-black shadow-hard-sm">
            {epic.boardKey}
          </p>
        </div>

        {/* Dates */}
        {(epic.startDate || epic.dueDate) && (
          <div className="border-2 border-black p-4 shadow-hard-sm">
            <h3 className="font-black text-black mb-3 text-xs uppercase tracking-widest border-b-2 border-black pb-1">
              Timeline
            </h3>
            <div className="text-sm text-black space-y-3 font-medium">
              {epic.startDate && (
                <div className="flex justify-between items-center bg-gray-100 px-2 py-1 border border-black">
                  <span className="font-bold">Start:</span>{" "}
                  <span>{epic.startDate}</span>
                </div>
              )}
              {epic.dueDate && (
                <div className="flex justify-between items-center bg-gray-100 px-2 py-1 border border-black">
                  <span className="font-bold">Due:</span>{" "}
                  <span>{epic.dueDate}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Story Points */}
        {epic.storyPoints !== null && (
          <div>
            <h3 className="font-black text-black mb-2 text-xs uppercase tracking-widest">
              Story Points
            </h3>
            <span className="text-xl text-black font-black bg-fluo-lime border-2 border-black px-3 py-1 shadow-hard-sm inline-block">
              {epic.storyPoints}
            </span>
          </div>
        )}

        {/* Assignee */}
        {epic.assignee && (
          <div>
            <h3 className="font-black text-black mb-3 text-xs uppercase tracking-widest">
              Assignee
            </h3>
            <div className="flex items-center gap-3 bg-white border-2 border-black p-2 shadow-hard-sm">
              {epic.assignee.avatarUrl ? (
                <img
                  src={epic.assignee.avatarUrl}
                  alt={epic.assignee.displayName}
                  className="w-10 h-10 rounded-sm border-2 border-black"
                />
              ) : (
                <div className="w-10 h-10 rounded-sm border-2 border-black bg-fluo-cyan" />
              )}
              <p className="text-sm font-bold text-black uppercase tracking-wider">
                {epic.assignee.displayName}
              </p>
            </div>
          </div>
        )}

        {/* Progress */}
        {epic.childIssueCount > 0 && (
          <div>
            <h3 className="font-black text-black mb-2 text-xs uppercase tracking-widest">
              Progress
            </h3>
            <div className="text-xs font-bold text-black uppercase mb-1">
              <span className="bg-fluo-lime px-1 border border-black mr-1">
                {epic.completedChildCount}
              </span>{" "}
              of {epic.childIssueCount} completed
            </div>
            <div className="bg-white h-4 w-full border-2 border-black relative overflow-hidden shadow-hard-sm">
              <div
                className="bg-fluo-lime h-full transition-all border-r-2 border-black"
                style={{
                  width: `${(epic.completedChildCount / epic.childIssueCount) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Link */}
        <div className="pt-4 mt-auto">
          <a
            href={epic.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block w-full text-center px-4 py-3 bg-fluo-cyan text-black font-black uppercase tracking-widest border-2 border-black shadow-hard hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-100"
          >
            Open in Jira →
          </a>
        </div>
      </div>
    </aside>
  );
}
