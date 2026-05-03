"use client";

import { useState } from "react";

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismiss) {
      onDismiss();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="bg-red-500/10 border-b border-red-500 px-6 py-3 flex items-center justify-between text-sm">
      <div className="flex items-center gap-3">
        <span className="text-red-500">⚠️</span>
        <span className="text-red-500 font-medium">Error:</span>
        <span className="text-foreground">{message}</span>
      </div>
      <button
        onClick={handleDismiss}
        className="text-foreground hover:text-foreground p-1 transition-colors"
      >
        ✕
      </button>
    </div>
  );
}
