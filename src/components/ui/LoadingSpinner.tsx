interface LoadingSpinnerProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingSpinner({
  message = "Loading...",
  size = "md",
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <div className="relative">
        <div className={`${sizeClasses[size]} border-4 border-black border-t-fluo-magenta animate-spin absolute -top-1 -left-1`} />
        <div className={`${sizeClasses[size]} bg-fluo-cyan border-2 border-black`} />
      </div>
      {message && (
        <p className="text-black bg-white px-3 py-1 border-2 border-black text-xs font-black uppercase tracking-widest shadow-hard-sm">
          {message}
        </p>
      )}
    </div>
  );
}
