interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div className="bg-fluo-red text-white border-b-2 border-black p-4 flex items-start justify-between">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-white mt-0.5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-black text-white uppercase tracking-widest drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]">
            {message}
          </p>
        </div>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-white hover:text-black flex-shrink-0 ml-3 text-xl font-black drop-shadow-[1px_1px_0px_rgba(0,0,0,1)] hover:drop-shadow-none transition-all"
        >
          ✕
        </button>
      )}
    </div>
  );
}
