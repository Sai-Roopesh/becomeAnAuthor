"use client";

import { useLiveQuery } from "@/hooks/use-live-query";
import { logger } from "@/shared/utils/logger";

const log = logger.scope("TemplateSelector");

import { useCodexTemplateRepository } from "@/hooks/use-codex-template-repository";
import type { CodexCategory, CodexTemplate } from "@/domain/entities/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { FileText, User, MapPin, Box, Book } from "lucide-react";

interface TemplateSelectorProps {
  category: CodexCategory;
  onSelectTemplate: (template: CodexTemplate) => void;
  onSkip: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Template Selector Dialog
 *
 * ✅ ARCHITECTURE COMPLIANCE:
 * - 'use client' directive for client component
 * - Uses repository hook (NOT db directly)
 * - Located in features/codex/components/
 * - Imports types from @/domain/entities/types
 */
export function TemplateSelector({
  category,
  onSelectTemplate,
  onSkip,
  open,
  onOpenChange,
}: TemplateSelectorProps) {
  const templateRepo = useCodexTemplateRepository();

  // ✅ Use repository hook + live query with client-side deduplication
  const templates = useLiveQuery(async () => {
    const results = await templateRepo.getByCategory(category);

    // Defense in depth: Deduplicate on client side
    const seen = new Map<string, CodexTemplate>();
    for (const template of results) {
      const key = `${template.name}|${template.category}`;
      const existing = seen.get(key);

      if (!existing || template.createdAt < existing.createdAt) {
        seen.set(key, template);
      }
    }

    const unique = Array.from(seen.values());

    // Warn if duplicates found (shouldn't happen with v8 schema)
    if (unique.length < results.length) {
      log.warn(
        `Found ${results.length - unique.length} duplicate templates in category ${category}`,
      );
    }

    return unique;
  }, [category]);

  if (!templates) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Choose Template</DialogTitle>
          <DialogDescription>
            Select a template to help structure your {category} entry.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 max-h-scroll overflow-y-auto">
          {templates.map((template) => (
            <Button
              key={template.id}
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                onSelectTemplate(template);
                onOpenChange(false);
              }}
            >
              {getIconForCategory(category)}
              <span className="ml-2">{template.name}</span>
              {template.isBuiltIn && (
                <span className="ml-auto text-xs text-muted-foreground">
                  Built-in
                </span>
              )}
            </Button>
          ))}
          {templates.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No templates available for this category.
            </p>
          )}
        </div>
        <div className="border-t pt-4">
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              onSkip();
              onOpenChange(false);
            }}
          >
            Skip Template (Create Blank)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getIconForCategory(category: CodexCategory) {
  const icons = {
    character: User,
    location: MapPin,
    item: Box,
    lore: Book,
    subplot: FileText,
  };
  const Icon = icons[category];
  return <Icon className="h-4 w-4" />;
}
