"use client";

import { useLiveQuery, invalidateQueries } from "@/hooks/use-live-query";
import { useCodexRepository } from "@/hooks/use-codex-repository";
import { useCodexTemplateRepository } from "@/hooks/use-codex-template-repository";
import {
  CodexEntry,
  CodexCategory,
  CodexTemplate,
} from "@/domain/entities/types";
import { Button } from "@/components/ui/button";
import {
  Plus,
  User,
  MapPin,
  Book,
  Box,
  FileText,
  MoreVertical,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { useState, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Input } from "@/components/ui/input";
import { EntityEditor } from "./entity-editor";
import { TemplateSelector } from "./template-selector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/shared/utils/toast-service";
import { useConfirmation } from "@/hooks/use-confirmation";

interface CodexListProps {
  seriesId: string;
  selectedEntityId?: string | null;
  onSelectedEntityIdChange?: (id: string | null) => void;
}

const ITEM_HEIGHT = 60; // Height of each codex entry row

export function CodexList({
  seriesId,
  selectedEntityId: controlledSelectedEntityId,
  onSelectedEntityIdChange,
}: CodexListProps) {
  const codexRepo = useCodexRepository();
  const templateRepo = useCodexTemplateRepository();
  const [search, setSearch] = useState("");
  const [internalSelectedEntityId, setInternalSelectedEntityId] = useState<string | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [pendingCategory, setPendingCategory] =
    useState<CodexCategory>("character");
  const parentRef = useRef<HTMLDivElement>(null);
  const selectedEntityId =
    controlledSelectedEntityId !== undefined
      ? controlledSelectedEntityId
      : internalSelectedEntityId;
  const setSelectedEntityId = (id: string | null) => {
    if (onSelectedEntityIdChange) {
      onSelectedEntityIdChange(id);
      return;
    }
    setInternalSelectedEntityId(id);
  };

  const entries = useLiveQuery(
    () => codexRepo.getBySeries(seriesId),
    [seriesId],
  );

  const filteredEntries =
    entries?.filter(
      (e) =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())),
    ) || [];

  // Virtualization for large lists
  const virtualizer = useVirtualizer({
    count: filteredEntries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5,
  });

  const createEntry = async (category: CodexCategory) => {
    setPendingCategory(category);
    setShowTemplateSelector(true);
  };

  const handleTemplateSelected = async (template: CodexTemplate) => {
    const newEntry = await templateRepo.get(template.id).then((t) => {
      if (!t) throw new Error("Template not found");
      return codexRepo.create(seriesId, {
        name: "New " + t.category.charAt(0).toUpperCase() + t.category.slice(1),
        category: t.category,
        templateId: t.id,
        customFields: {},
      });
    });
    invalidateQueries();
    setSelectedEntityId(newEntry.id);
  };

  const handleSkipTemplate = async () => {
    const newEntry = await codexRepo.create(seriesId, {
      name: "New Entity",
      category: pendingCategory,
    });
    invalidateQueries();
    setSelectedEntityId(newEntry.id);
  };

  const { confirm, ConfirmationDialog } = useConfirmation();

  const handleDeleteClick = async (entry: CodexEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await confirm({
      title: "Delete Entity",
      description:
        "Are you sure you want to delete this entity? This action cannot be undone.",
      confirmText: "Delete",
      variant: "destructive",
    });

    if (confirmed) {
      try {
        await codexRepo.delete(seriesId, entry.id, entry.category);
        invalidateQueries();
        toast.success("Entity deleted");
        if (selectedEntityId === entry.id) {
          setSelectedEntityId(null);
        }
      } catch {
        toast.error("Failed to delete entity");
      }
    }
  };

  if (selectedEntityId) {
    return (
      <EntityEditor
        entityId={selectedEntityId}
        seriesId={seriesId}
        onBack={() => setSelectedEntityId(null)}
      />
    );
  }

  if (!entries) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">Codex</h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                New Entry
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Choose Category</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => createEntry("character")}>
                <User className="h-4 w-4 mr-2" />
                Character
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => createEntry("location")}>
                <MapPin className="h-4 w-4 mr-2" />
                Location
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => createEntry("item")}>
                <Box className="h-4 w-4 mr-2" />
                Item
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => createEntry("lore")}>
                <Book className="h-4 w-4 mr-2" />
                Lore
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => createEntry("subplot")}>
                <FileText className="h-4 w-4 mr-2" />
                Subplot
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Virtualized List */}
      <div ref={parentRef} className="flex-1 overflow-y-auto p-2">
        {filteredEntries.length > 0 ? (
          <div
            style={{
              height: virtualizer.getTotalSize(),
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const entry = filteredEntries[virtualRow.index];
              if (!entry) return null;
              return (
                <div
                  key={entry.id}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div
                    className="p-3 border rounded hover:bg-accent cursor-pointer flex items-center gap-3 group mx-1"
                    style={{ height: ITEM_HEIGHT - 8 }}
                    onClick={() => setSelectedEntityId(entry.id)}
                  >
                    <div className="h-8 w-8 bg-muted rounded flex items-center justify-center">
                      {getIcon(entry.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {entry.name}
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {entry.category}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => handleDeleteClick(entry, e)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-muted-foreground text-sm py-8">
            No entries found.
          </div>
        )}
      </div>

      <TemplateSelector
        category={pendingCategory}
        onSelectTemplate={handleTemplateSelected}
        onSkip={handleSkipTemplate}
        open={showTemplateSelector}
        onOpenChange={setShowTemplateSelector}
      />

      <ConfirmationDialog />
    </div>
  );
}

function getIcon(category: CodexCategory) {
  switch (category) {
    case "character":
      return <User className="h-4 w-4" />;
    case "location":
      return <MapPin className="h-4 w-4" />;
    case "item":
      return <Box className="h-4 w-4" />;
    case "lore":
      return <Book className="h-4 w-4" />;
    case "subplot":
      return <FileText className="h-4 w-4" />;
  }
}
