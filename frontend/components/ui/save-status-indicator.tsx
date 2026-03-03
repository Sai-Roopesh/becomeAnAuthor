"use client";

import { Check, AlertCircle, Loader2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SaveStatus } from "@/lib/core/editor-state-manager";

interface SaveStatusIndicatorProps {
  status: SaveStatus;
  className?: string;
}

export function SaveStatusIndicator({
  status,
  className,
}: SaveStatusIndicatorProps) {
  const getContent = (): {
    icon: React.ReactNode;
    text: string;
    color: string;
  } => {
    switch (status) {
      case "saved":
        return {
          icon: <Check className="h-3.5 w-3.5" />,
          text: "Saved",
          color: "text-green-600 dark:text-green-400",
        };
      case "saving":
        return {
          icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
          text: "Not saved",
          color: "text-blue-600 dark:text-blue-400",
        };
      case "unsaved":
        return {
          icon: <Circle className="h-3.5 w-3.5 fill-current" />,
          text: "Not saved",
          color: "text-orange-600 dark:text-orange-400",
        };
      case "error":
        return {
          icon: <AlertCircle className="h-3.5 w-3.5" />,
          text: "Not saved",
          color: "text-red-600 dark:text-red-400",
        };
      default: {
        // Exhaustive check for TypeScript
        const _exhaustive: never = status;
        void _exhaustive;
        return { icon: null, text: "Unknown", color: "text-gray-500" };
      }
    }
  };

  const content = getContent();

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs",
        content.color,
        className,
      )}
    >
      {content.icon}
      <span>{content.text}</span>
    </div>
  );
}
