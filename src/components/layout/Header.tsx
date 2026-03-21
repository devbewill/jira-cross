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
    <header className="flex items-center justify-between px-6 py-4 bg-linear-surface border-b-2 border-linear-text flex-shrink-0">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-black tracking-tighter text-linear-text uppercase">
          Production{" "}
          <span className="text-linear-accent">Dashboard</span>
        </h1>
        {cacheHit && (
          <span className="text-[10px] font-black uppercase tracking-widest bg-linear-surfaceActive text-linear-textMuted px-2 py-0.5 rounded-[2px] border border-linear-border">
            Cached ✓
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 bg-linear-text text-linear-bg rounded-[3px] text-xs font-black uppercase tracking-widest hover:bg-linear-textMuted transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-linear-sm hover:shadow-linear-hover"
        >
          {isRefreshing ? (
            <>
              <div className="w-3 h-3 border-2 border-linear-bg border-t-transparent rounded-full animate-spin" />
              Syncing…
            </>
          ) : (
            <>⟲ Sync Jira</>
          )}
        </button>
      </div>
    </header>
  );
}
