export function Header({
  onRefresh,
  isRefreshing,
  cacheHit,
}: {
  onRefresh: () => void;
  isRefreshing: boolean;
  cacheHit: boolean;
}) {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-linear-surface border-b border-linear-border flex-shrink-0">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-linear-text tracking-tight">
          Production <span className="text-linear-accent font-normal">Dashboard</span>
        </h1>
        {cacheHit && (
          <span className="text-xs bg-linear-surfaceActive text-linear-textMuted px-2 py-0.5 rounded-full border border-linear-border">
            Cached ✓
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex gap-2">
           {/* Decorative elements omitted for clean minimal ui */}
        </div>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3 py-1.5 bg-linear-surfaceHover border border-linear-border text-linear-text rounded-[4px] text-sm hover:bg-linear-surfaceActive hover:text-linear-text transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-linear-sm"
        >
          {isRefreshing ? (
            <>
              <div className="w-3 h-3 border-2 border-linear-accent border-t-transparent rounded-full animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              ⟲ Sync Jira
            </>
          )}
        </button>
      </div>
    </header>
  );
}
