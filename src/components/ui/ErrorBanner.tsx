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
    <div className="bg-linear-danger/10 border-b border-linear-danger px-6 py-3 flex items-center justify-between text-sm">
      <div className="flex items-center gap-3">
        <span className="text-linear-danger">⚠️</span>
        <span className="text-linear-danger font-medium">Error:</span>
        <span className="text-linear-text">{message}</span>
      </div>
      <button
        onClick={handleDismiss}
        className="text-linear-text hover:text-linear-text p-1 transition-colors"
      >
        ✕
      </button>
    </div>
  );
}
