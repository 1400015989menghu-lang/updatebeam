"use client";

import { cn } from "@/lib/utils";

interface ConfidenceBadgeProps {
  confidence: number;
  className?: string;
}

export function ConfidenceBadge({ confidence, className }: ConfidenceBadgeProps) {
  const getConfidenceColor = (score: number) => {
    if (score >= 90) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    if (score >= 70) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 90) return "High";
    if (score >= 70) return "Medium";
    return "Low";
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="w-24 bg-gray-200 rounded-full h-2 dark:bg-gray-700">
        <div
          className={cn(
            "h-2 rounded-full transition-all",
            getConfidenceColor(confidence)
          )}
          style={{ width: `${confidence}%` }}
        />
      </div>
      <span className={cn("text-xs font-medium px-2 py-0.5 rounded", getConfidenceColor(confidence))}>
        {confidence}% {getConfidenceLabel(confidence)}
      </span>
    </div>
  );
}
