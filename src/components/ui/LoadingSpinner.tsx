interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({
  message = "Loading...",
  fullScreen = false,
}: LoadingSpinnerProps) {
  const content = (
    <div className="flex flex-col items-center justify-center p-8 bg-linear-surface rounded-[8px] border border-linear-border shadow-popover">
      <div className="w-6 h-6 border-2 border-linear-accent border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-sm font-medium text-linear-text">{message}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-linear-bg z-50">
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-full h-full min-h-[200px]">
      {content}
    </div>
  );
}
