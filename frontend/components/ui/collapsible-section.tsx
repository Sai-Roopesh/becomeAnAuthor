"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronDown, Plus } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface CollapsibleSectionProps {
  /** Section title */
  title: string;
  /** Icon to display before title */
  icon?: React.ReactNode;
  /** Number of items (shown as badge) */
  count?: number;
  /** Whether section starts expanded */
  defaultOpen?: boolean;
  /** Callback when + button is clicked */
  onAdd?: () => void;
  /** Add button tooltip text */
  addTooltip?: string;
  /** Section content */
  children: React.ReactNode;
  /** Additional class names */
  className?: string;
}

/**
 * CollapsibleSection - Collapsible section for left sidebar
 *
 * Used for:
 * - Research section (Phase 6)
 * - Ideas section (Phase 1)
 * - Any future collapsible sections in sidebar
 *
 * Features:
 * - Smooth expand/collapse animation
 * - Optional item count badge
 * - Optional add button
 * - Touch-friendly (44px trigger height)
 *
 * @example
 * <CollapsibleSection
 *   title="Research"
 *   icon={<BookOpen className="h-4 w-4" />}
 *   count={5}
 *   onAdd={() => openAddResearchDialog()}
 *   addTooltip="Add research item"
 * >
 *   <ResearchList items={items} />
 * </CollapsibleSection>
 */
export function CollapsibleSection({
  title,
  icon,
  count,
  defaultOpen = false,
  onAdd,
  addTooltip,
  children,
  className,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn("border-b border-border/30 last:border-b-0", className)}
    >
      {/* Header */}
      <div className="flex items-center px-2 py-1 bg-muted/20 hover:bg-muted/30 transition-colors">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 justify-start gap-2 h-9 px-2 hover:bg-transparent"
          >
            {/* Chevron */}
            <span className="text-muted-foreground">
              {isOpen ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </span>

            {/* Icon */}
            {icon && <span className="text-muted-foreground">{icon}</span>}

            {/* Title */}
            <span className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
              {title}
            </span>

            {/* Count badge */}
            {count !== undefined && count > 0 && (
              <span className="ml-auto text-2xs text-muted-foreground/70 bg-muted px-1.5 py-0.5 rounded-full">
                {count}
              </span>
            )}
          </Button>
        </CollapsibleTrigger>

        {/* Add button */}
        {onAdd && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title={addTooltip}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Content */}
      <CollapsibleContent className="animate-in slide-in-from-top-2 duration-200">
        <div className="py-1">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * CollapsibleSectionItem - Individual item within a collapsible section
 */
interface CollapsibleSectionItemProps {
  /** Item icon */
  icon?: React.ReactNode;
  /** Item label */
  label: string;
  /** Click handler */
  onClick?: () => void;
  /** Whether item is selected/active */
  active?: boolean;
  /** Additional class names */
  className?: string;
}

export function CollapsibleSectionItem({
  icon,
  label,
  onClick,
  active,
  className,
}: CollapsibleSectionItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-4 py-1.5 text-sm",
        "hover:bg-accent/50 transition-colors text-left",
        active && "bg-accent font-medium",
        className,
      )}
    >
      {icon && (
        <span className="text-muted-foreground flex-shrink-0">{icon}</span>
      )}
      <span className="truncate">{label}</span>
    </button>
  );
}
