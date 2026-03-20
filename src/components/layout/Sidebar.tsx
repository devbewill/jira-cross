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
      <aside className="w-80 bg-linear-surface border-l border-linear-border flex flex-col items-center justify-center p-8 text-center text-linear-textMuted z-20 transition-all duration-300">
        <div className="text-sm font-medium tracking-wide">
          Select an epic to view details
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-80 bg-linear-surface border-l border-linear-border flex flex-col h-full overflow-hidden z-20 relative transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-linear-border flex-shrink-0 bg-linear-surfaceHover">
        <h2 className="font-medium text-lg text-linear-text tracking-tight w-full truncate">
          {epic.key}
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-linear-textMuted hover:text-linear-text transition-colors duration-150 p-1 rounded hover:bg-linear-surfaceActive"
          >
            ✕
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-7 custom-scrollbar">
        {/* Summary */}
        <div>
          <h3 className="text-xs uppercase font-medium text-linear-textMuted tracking-wider mb-2">
            Summary
          </h3>
          <p className="text-sm text-linear-text leading-relaxed">
            {epic.summary}
          </p>
        </div>

        {/* Status */}
        <div className="flex justify-between items-center">
          <h3 className="text-xs uppercase font-medium text-linear-textMuted tracking-wider">
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
          <h3 className="text-xs uppercase font-medium text-linear-textMuted tracking-wider">
            Project
          </h3>
          <span className="text-xs text-linear-text font-medium bg-linear-surfaceActive px-2 py-0.5 rounded border border-linear-border">
            {epic.boardKey}
          </span>
        </div>

        {/* Dates */}
        {(epic.startDate || epic.dueDate) && (
          <div className="space-y-3 pt-2">
            <h3 className="text-xs uppercase font-medium text-linear-textMuted tracking-wider">
              Timeline
            </h3>
            <div className="text-sm space-y-2">
              {epic.startDate && (
                <div className="flex justify-between text-linear-text">
                  <span className="text-linear-textMuted">Start date</span>
                  <span>{epic.startDate}</span>
                </div>
              )}
              {epic.dueDate && (
                <div className="flex justify-between text-linear-text">
                  <span className="text-linear-textMuted">Due date</span>
                  <span>{epic.dueDate}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Story Points */}
        {epic.storyPoints !== null && (
          <div className="flex justify-between items-center">
            <h3 className="text-xs uppercase font-medium text-linear-textMuted tracking-wider">
              Story Points
            </h3>
            <span className="text-sm text-linear-text font-medium bg-linear-accent/20 border border-linear-accent/50 px-2.5 py-0.5 rounded-full">
              {epic.storyPoints}
            </span>
          </div>
        )}

        {/* Assignee */}
        {epic.assignee && (
          <div>
            <h3 className="text-xs uppercase font-medium text-linear-textMuted tracking-wider mb-3">
              Assignee
            </h3>
            <div className="flex items-center gap-3">
              {epic.assignee.avatarUrl ? (
                <img
                  src={epic.assignee.avatarUrl}
                  alt={epic.assignee.displayName}
                  className="w-7 h-7 rounded-full border border-linear-border"
                />
              ) : (
                <div className="w-7 h-7 rounded-full border border-linear-border bg-linear-surfaceActive" />
              )}
              <p className="text-sm font-medium text-linear-text">
                {epic.assignee.displayName}
              </p>
            </div>
          </div>
        )}

        {/* Link */}
        <div className="pt-6 mt-auto">
          <a
            href={epic.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-full px-4 py-2 bg-linear-surfaceActive text-linear-text font-medium text-sm rounded-[4px] border border-linear-border hover:bg-linear-surfaceHover transition-colors shadow-linear-sm"
          >
            Open in Jira ↗
          </a>
        </div>
      </div>
    </aside>
  );
}
