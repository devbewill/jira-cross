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
      <aside className="w-80 bg-linear-surface border-l-2 border-linear-border flex flex-col items-center justify-center p-8 text-center z-20 transition-all duration-300">
        <div className="text-xs font-black uppercase tracking-widest text-linear-textDim">
          Select an epic
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-80 bg-linear-surface border-l-2 border-linear-text flex flex-col h-full overflow-hidden z-20 relative transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b-2 border-linear-border flex-shrink-0 bg-linear-surfaceHover">
        <h2 className="font-black text-base tracking-tighter text-linear-text uppercase w-full truncate">
          {epic.key}
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-linear-textMuted hover:text-linear-text transition-colors duration-100 p-1 font-black text-lg leading-none"
          >
            ✕
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {/* Summary */}
        <div>
          <h3 className="text-[9px] font-black uppercase tracking-widest text-linear-textDim mb-2">
            Summary
          </h3>
          <p className="text-sm font-bold text-linear-text leading-snug tracking-tight">
            {epic.summary}
          </p>
        </div>

        {/* Status */}
        <div className="flex justify-between items-center">
          <h3 className="text-[9px] font-black uppercase tracking-widest text-linear-textDim">
            Status
          </h3>
          <Badge
            label={epic.status}
            variant="status"
            statusCategory={epic.statusCategory}
          />
        </div>

        {/* Board */}
        <div className="flex justify-between items-center">
          <h3 className="text-[9px] font-black uppercase tracking-widest text-linear-textDim">
            Project
          </h3>
          <span className="text-[10px] font-black uppercase tracking-widest text-linear-text bg-linear-surfaceActive px-2 py-0.5 rounded-[2px] border border-linear-border">
            {epic.boardKey}
          </span>
        </div>

        {/* Dates */}
        {(epic.startDate || epic.dueDate) && (
          <div className="space-y-3">
            <h3 className="text-[9px] font-black uppercase tracking-widest text-linear-textDim">
              Timeline
            </h3>
            <div className="text-sm space-y-2">
              {epic.startDate && (
                <div className="flex justify-between">
                  <span className="text-linear-textMuted font-bold text-xs">Start</span>
                  <span className="font-black text-xs">{epic.startDate}</span>
                </div>
              )}
              {epic.dueDate && (
                <div className="flex justify-between">
                  <span className="text-linear-textMuted font-bold text-xs">Due</span>
                  <span className="font-black text-xs">{epic.dueDate}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Story Points */}
        {epic.storyPoints !== null && (
          <div className="flex justify-between items-center">
            <h3 className="text-[9px] font-black uppercase tracking-widest text-linear-textDim">
              Estimate
            </h3>
            <span className="text-xs font-black bg-linear-todo text-linear-text px-2.5 py-0.5 rounded-[2px]">
              {epic.storyPoints} pts
            </span>
          </div>
        )}

        {/* Assignee */}
        {epic.assignee && (
          <div>
            <h3 className="text-[9px] font-black uppercase tracking-widest text-linear-textDim mb-3">
              Assignee
            </h3>
            <div className="flex items-center gap-3">
              {epic.assignee.avatarUrl ? (
                <img
                  src={epic.assignee.avatarUrl}
                  alt={epic.assignee.displayName}
                  className="w-7 h-7 rounded-full border-2 border-linear-border"
                />
              ) : (
                <div className="w-7 h-7 rounded-full border-2 border-linear-border bg-linear-surfaceActive" />
              )}
              <p className="text-sm font-black tracking-tight text-linear-text">
                {epic.assignee.displayName}
              </p>
            </div>
          </div>
        )}

        {/* Link */}
        <div className="pt-4 mt-auto border-t-2 border-linear-border">
          <a
            href={epic.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-full px-4 py-2.5 bg-linear-text text-linear-bg font-black text-xs uppercase tracking-widest rounded-[3px] hover:bg-linear-textMuted transition-colors shadow-linear-sm hover:shadow-linear-hover"
          >
            Open in Jira ↗
          </a>
        </div>
      </div>
    </aside>
  );
}
