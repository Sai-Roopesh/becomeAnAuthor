"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2, Save } from "lucide-react";
import { cn } from "@/lib/utils";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface EntityEditorHeaderProps {
  onBack: () => void;
  onSave: () => void;
  onDelete: () => void;
  saveStatus: SaveStatus;
}

/**
 * Header component for EntityEditor with navigation and action buttons.
 * Extracted from entity-editor.tsx for better maintainability.
 */
export function EntityEditorHeader({
  onBack,
  onSave,
  onDelete,
  saveStatus,
}: EntityEditorHeaderProps) {
  const statusLabel =
    saveStatus === "saving"
      ? "Saving..."
      : saveStatus === "saved"
        ? "Saved"
        : saveStatus === "error"
          ? "Save failed"
          : "Autosave on";

  return (
    <div className="p-4 flex items-center justify-between">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "text-xs",
            saveStatus === "error"
              ? "text-destructive"
              : "text-muted-foreground",
          )}
        >
          {statusLabel}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onSave}
          title="Save now (auto-saves after 1s idle)"
        >
          <Save className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          title="Delete entity"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
