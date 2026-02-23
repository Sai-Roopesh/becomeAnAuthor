"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  CodexCategory,
  CodexEntry,
  SceneCodexLinkRole,
} from "@/domain/entities/types";
import { useLiveQuery } from "@/hooks/use-live-query";
import { useAppServices } from "@/infrastructure/di/AppContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Check, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORY_OPTIONS: Array<{ value: CodexCategory | "all"; label: string }> =
  [
    { value: "all", label: "All" },
    { value: "character", label: "Characters" },
    { value: "location", label: "Locations" },
    { value: "subplot", label: "Plot Threads" },
    { value: "item", label: "Items" },
    { value: "lore", label: "Lore" },
  ];

const ROLE_OPTIONS: Array<{ value: SceneCodexLinkRole; label: string }> = [
  { value: "appears", label: "Appears" },
  { value: "mentioned", label: "Mentioned" },
  { value: "pov", label: "POV Character" },
  { value: "location", label: "Setting" },
  { value: "plot", label: "Plot Thread" },
];

export interface CodexLinkSelection {
  entry: CodexEntry;
  role: SceneCodexLinkRole;
  displayText: string;
}

interface CodexLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seriesId: string;
  selectedText: string;
  onConfirm: (selection: CodexLinkSelection) => Promise<void> | void;
}

export function CodexLinkDialog({
  open,
  onOpenChange,
  seriesId,
  selectedText,
  onConfirm,
}: CodexLinkDialogProps) {
  const { codexRepository: codexRepo } = useAppServices();
  const entries = useLiveQuery(
    () => codexRepo.getBySeries(seriesId),
    [seriesId, codexRepo],
    { keys: "codex" },
  );

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CodexCategory | "all">("all");
  const [selectedCodexId, setSelectedCodexId] = useState<string>("");
  const [role, setRole] = useState<SceneCodexLinkRole>("mentioned");
  const [displayText, setDisplayText] = useState("");
  const [isLinking, setIsLinking] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setCategory("all");
    setRole("mentioned");
    setDisplayText(selectedText.trim());
  }, [open, selectedText]);

  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    const query = search.trim().toLowerCase();
    return entries
      .filter((entry) => category === "all" || entry.category === category)
      .filter((entry) => {
        if (!query) return true;
        return (
          entry.name.toLowerCase().includes(query) ||
          entry.aliases.some((alias) => alias.toLowerCase().includes(query))
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [category, entries, search]);

  useEffect(() => {
    if (filteredEntries.length === 0) {
      setSelectedCodexId("");
      return;
    }

    const found = filteredEntries.some((entry) => entry.id === selectedCodexId);
    if (!found) {
      setSelectedCodexId(filteredEntries[0]?.id ?? "");
    }
  }, [filteredEntries, selectedCodexId]);

  const selectedEntry = useMemo(
    () => filteredEntries.find((entry) => entry.id === selectedCodexId) ?? null,
    [filteredEntries, selectedCodexId],
  );

  const handleConfirm = async () => {
    if (!selectedEntry || isLinking) return;

    const resolvedDisplayText = displayText.trim() || selectedEntry.name;

    setIsLinking(true);
    try {
      await onConfirm({
        entry: selectedEntry,
        role,
        displayText: resolvedDisplayText,
      });
      onOpenChange(false);
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-dialog-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Link Text to Codex
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            {selectedText.trim()
              ? `Selected text: "${selectedText.trim()}"`
              : "No text selected. The linked entry name will be inserted at the cursor."}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={category}
                onValueChange={(value) =>
                  setCategory(value as CodexCategory | "all")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={role}
                onValueChange={(value) => setRole(value as SceneCodexLinkRole)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="codex-link-search">Find codex entry</Label>
            <Input
              id="codex-link-search"
              placeholder="Search by name or alias..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <ScrollArea className="h-scroll rounded-md border">
            <div className="p-2 space-y-1">
              {filteredEntries.length === 0 ? (
                <p className="px-2 py-3 text-sm text-muted-foreground">
                  No matching codex entries.
                </p>
              ) : (
                filteredEntries.map((entry) => {
                  const selected = entry.id === selectedCodexId;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setSelectedCodexId(entry.id)}
                      className={cn(
                        "w-full rounded-md border px-3 py-2 text-left transition-colors",
                        selected
                          ? "border-primary bg-primary/10"
                          : "hover:bg-muted border-transparent",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{entry.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {entry.category}
                          </p>
                        </div>
                        {selected ? (
                          <Check className="h-4 w-4 text-primary" />
                        ) : null}
                      </div>
                      {entry.aliases.length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {entry.aliases.slice(0, 4).map((alias) => (
                            <Badge
                              key={`${entry.id}-${alias}`}
                              variant="secondary"
                            >
                              {alias}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>

          <div className="space-y-2">
            <Label htmlFor="codex-display-text">Display text</Label>
            <Input
              id="codex-display-text"
              placeholder={selectedEntry?.name ?? "Linked text"}
              value={displayText}
              onChange={(event) => setDisplayText(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Use plain prose by default. Add "@" manually only if you want it
              visible.
            </p>
          </div>
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLinking}
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleConfirm()}
            disabled={!selectedEntry || isLinking}
          >
            {isLinking ? "Linking..." : "Link to Codex"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
