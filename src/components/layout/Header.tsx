"use client";

interface HeaderProps {
  onRefresh: () => Promise<void>;
  isRefreshing?: boolean;
  cacheHit?: boolean;
}

export function Header({
  onRefresh,
  isRefreshing = false,
  cacheHit = false,
}: HeaderProps) {
  return (
    <header className="bg-white border-b-2 border-black z-20 relative">
      <div className="max-w-full mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-3xl font-black text-black tracking-tight uppercase">
            Jira Cross-Board Timeline
          </h1>
          <p className="text-black font-bold text-sm uppercase tracking-wider mt-1">
            Interactive timeline view for{" "}
            <span className="bg-fluo-cyan px-1 border-2 border-black shadow-hard-sm">CEF</span> and{" "}
            <span className="bg-fluo-magenta px-1 border-2 border-black shadow-hard-sm">AGR</span> epics
          </p>
        </div>

        <div className="flex items-center gap-4">
          {cacheHit && (
            <div className="text-xs font-bold bg-fluo-lime text-black px-3 py-1 border-2 border-black shadow-hard-sm uppercase tracking-wider">
              Cached data
            </div>
          )}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="btn-fluo px-6 py-2 bg-fluo-yellow text-black font-black uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed hover:bg-fluo-lime transition-colors duration-100"
          >
            {isRefreshing ? "Refreshing..." : "⚡ Refresh"}
          </button>
        </div>
      </div>
    </header>
  );
}
