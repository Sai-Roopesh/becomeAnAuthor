"use client";

import { cn } from "@/lib/utils";

interface DecorativeGridProps {
  className?: string;
  dotSize?: "sm" | "md" | "lg";
  opacity?: number;
}

const SIZE_MAP = { sm: "16px", md: "24px", lg: "32px" } as const;

/**
 * Decorative grid background pattern.
 * Replaces duplicated radial-gradient patterns across the codebase.
 */
export function DecorativeGrid({
  className,
  dotSize = "sm",
  opacity = 30,
}: DecorativeGridProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-[-1] pointer-events-none",
        "bg-[radial-gradient(var(--color-muted-foreground)_1px,transparent_1px)]",
        className,
      )}
      style={{
        backgroundSize: `${SIZE_MAP[dotSize]} ${SIZE_MAP[dotSize]}`,
        opacity: opacity / 100,
      }}
    />
  );
}
