"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";
import { CodexEntry, CodexCategory } from "@/domain/entities/types";

interface EntityEditorInfoCardProps {
  formData: Partial<CodexEntry>;
  hasTemplate: boolean;
  mentionCount: number;
  onNameChange: (name: string) => void;
  onCategoryChange: (category: CodexCategory) => void;
  onClearTemplate: () => void;
}

/**
 * Info card component showing entity thumbnail, name, category, and tags.
 * Extracted from entity-editor.tsx for better maintainability.
 */
export function EntityEditorInfoCard({
  formData,
  hasTemplate,
  mentionCount,
  onNameChange,
  onCategoryChange,
  onClearTemplate,
}: EntityEditorInfoCardProps) {
  return (
    <div className="px-6 pb-4">
      <div className="flex items-start gap-4">
        {/* Thumbnail */}
        <div className="h-16 w-16 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
          {formData.thumbnail ? (
            <img
              src={formData.thumbnail}
              alt={formData.name}
              className="h-full w-full object-cover rounded-lg"
            />
          ) : (
            <User className="h-8 w-8 text-muted-foreground" />
          )}
        </div>

        {/* Name and Category */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Select
                {...(formData.category && { value: formData.category })}
                onValueChange={(v) => onCategoryChange(v as CodexCategory)}
                disabled={hasTemplate}
              >
                <SelectTrigger className="w-select-sm h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="character">Character</SelectItem>
                  <SelectItem value="location">Location</SelectItem>
                  <SelectItem value="item">Item</SelectItem>
                  <SelectItem value="lore">Lore</SelectItem>
                  <SelectItem value="subplot">Subplot</SelectItem>
                </SelectContent>
              </Select>
              {hasTemplate && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={onClearTemplate}
                >
                  Clear Template
                </Button>
              )}
            </div>
            {hasTemplate && (
              <p className="text-xs text-muted-foreground">
                Category locked because entry uses a template. Clear template to
                change category.
              </p>
            )}
            <Input
              value={formData.name || ""}
              onChange={(e) => onNameChange(e.target.value)}
              className="text-2xl font-bold border-0 p-0 h-auto focus-visible:ring-0"
              placeholder="Entity Name"
            />
          </div>

          {/* Tags */}
          <div className="flex gap-2 flex-wrap">
            {formData.tags?.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Mention Count */}
          <div className="text-xs text-muted-foreground">
            {mentionCount} mentions
          </div>
        </div>
      </div>
    </div>
  );
}
