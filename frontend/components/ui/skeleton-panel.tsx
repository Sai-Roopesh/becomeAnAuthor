"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

// SkeletonPanel — full panel skeleton with header + 3-4 rows of varying width
interface SkeletonPanelProps {
  className?: string;
}

function SkeletonPanel({ className }: SkeletonPanelProps) {
  return (
    <div
      data-slot="skeleton-panel"
      className={cn("flex flex-col gap-4 p-4", className)}
    >
      {/* Header placeholder */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-5 rounded-full shrink-0" />
        <Skeleton className="h-5 w-2/5" />
      </div>

      {/* Body rows of varying width */}
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </div>
  );
}

// SkeletonList — n skeleton rows for list views
interface SkeletonListProps {
  rows?: number;
  className?: string;
}

function SkeletonList({ rows = 5, className }: SkeletonListProps) {
  // Widths cycle to give a natural, varied look
  const widths = ["w-full", "w-5/6", "w-4/5", "w-3/4", "w-11/12"];

  return (
    <div
      data-slot="skeleton-list"
      className={cn("flex flex-col gap-2 p-2", className)}
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-2 py-1.5">
          <Skeleton className="h-4 w-4 shrink-0 rounded" />
          <Skeleton className={cn("h-4", widths[i % widths.length])} />
        </div>
      ))}
    </div>
  );
}

// SkeletonText — n lines of skeleton text (paragraph-style)
interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  const widths = ["w-full", "w-11/12", "w-5/6", "w-4/5", "w-3/4"];

  return (
    <div
      data-slot="skeleton-text"
      className={cn("flex flex-col gap-2", className)}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            // Last line is always shorter to look like a real paragraph end
            i === lines - 1 ? "w-3/5" : widths[i % widths.length],
          )}
        />
      ))}
    </div>
  );
}

export { SkeletonPanel, SkeletonList, SkeletonText };
