"use client";

/**
 * IdeasSection
 *
 * Collapsible section in left sidebar for project-wide ideas.
 * Uses CollapsibleSection from Phase 0 and QuickCaptureModal.
 *
 * Features:
 * - Quick capture via ⌘+I
 * - Category badges
 * - Click to expand/edit
 */

import { useState } from "react";
import { useIdeas } from "../hooks/use-ideas";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import {
  QuickCaptureModal,
  useQuickCapture,
} from "@/components/ui/quick-capture-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Lightbulb, MoreHorizontal, Trash2, Archive } from "lucide-react";
import {
  IDEA_CATEGORY_COLORS,
  IDEA_CATEGORY_LABELS,
  NAVIGATION_CONSTANTS,
} from "@/lib/config/constants";
import type { Idea } from "@/domain/entities/types";

interface IdeasSectionProps {
  projectId: string;
  defaultOpen?: boolean;
}

export function IdeasSection({
  projectId,
  defaultOpen = true,
}: IdeasSectionProps) {
  const { ideas, isLoading, createIdea, deleteIdea, archiveIdea } = useIdeas({
    projectId,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Setup keyboard shortcut (⌘+I)
  const quickCapture = useQuickCapture("i");

  // Use either keyboard shortcut or button click
  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      quickCapture.close();
    }
  };

  const handleSubmit = async (value: string) => {
    await createIdea(value, "other");
  };

  // Sync modal state with keyboard shortcut
  const modalOpen = isModalOpen || quickCapture.isOpen;

  // Suggestions for quick capture
  const suggestions = [
    "Plot twist",
    "Character moment",
    "World detail",
    "Dialogue idea",
  ];

  return (
    <>
      <CollapsibleSection
        title="Ideas"
        count={ideas.length}
        defaultOpen={defaultOpen}
        onAdd={handleOpenModal}
        addTooltip="Quick capture (⌘I)"
      >
        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading ideas...
          </div>
        ) : ideas.length === 0 ? (
          <div className="p-4 text-center">
            <Lightbulb className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No ideas yet</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-xs"
              onClick={handleOpenModal}
            >
              Capture your first idea (⌘I)
            </Button>
          </div>
        ) : (
          <div className="space-y-1 p-1">
            {ideas
              .slice(0, NAVIGATION_CONSTANTS.IDEAS_DISPLAY_LIMIT)
              .map((idea) => (
                <IdeaItem
                  key={idea.id}
                  idea={idea}
                  onDelete={deleteIdea}
                  onArchive={archiveIdea}
                />
              ))}
            {ideas.length > NAVIGATION_CONSTANTS.IDEAS_DISPLAY_LIMIT && (
              <p className="text-xs text-muted-foreground text-center py-2">
                +{ideas.length - NAVIGATION_CONSTANTS.IDEAS_DISPLAY_LIMIT} more
                ideas
              </p>
            )}
          </div>
        )}
      </CollapsibleSection>

      {/* Quick Capture Modal */}
      <QuickCaptureModal
        open={modalOpen}
        onOpenChange={handleCloseModal}
        onSubmit={handleSubmit}
        placeholder="What's your idea?"
        title="Quick Capture"
        suggestions={suggestions}
      />
    </>
  );
}

interface IdeaItemProps {
  idea: Idea;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
}

function IdeaItem({ idea, onDelete, onArchive }: IdeaItemProps) {
  return (
    <div className="group flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors">
      {/* Category badge */}
      <Badge
        variant="outline"
        className={cn(
          "text-2xs px-1.5 py-0 h-5 shrink-0 mt-0.5",
          IDEA_CATEGORY_COLORS[idea.category],
        )}
      >
        {IDEA_CATEGORY_LABELS[idea.category]}
      </Badge>

      {/* Content */}
      <p className="flex-1 text-sm line-clamp-2 text-foreground/90">
        {idea.content}
      </p>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onArchive(idea.id)}>
            <Archive className="h-4 w-4 mr-2" />
            Archive
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onDelete(idea.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
