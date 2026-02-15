"use client";

import { useMemo, useState } from "react";
import { useLiveQuery, invalidateQueries } from "@/hooks/use-live-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  X,
  Link2,
  User,
  MapPin,
  Box,
  Book,
  FileText,
  Search,
} from "lucide-react";
import { toast } from "@/shared/utils/toast-service";
import { useCodexRepository } from "@/hooks/use-codex-repository";
import { useAppServices } from "@/infrastructure/di/AppContext";
import type { CodexCategory } from "@/domain/entities/types";

interface RelationsTabProps {
  entityId: string;
  seriesId: string; // Required - series-first architecture
}

const categoryIcons: Record<CodexCategory, React.ReactNode> = {
  character: <User className="h-4 w-4" />,
  location: <MapPin className="h-4 w-4" />,
  item: <Box className="h-4 w-4" />,
  lore: <Book className="h-4 w-4" />,
  subplot: <FileText className="h-4 w-4" />,
};

export function RelationsTab({ entityId, seriesId }: RelationsTabProps) {
  const codexRepo = useCodexRepository();
  const { codexRelationRepository: relationRepo } = useAppServices();
  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const relations = useLiveQuery(
    () => relationRepo.getByParent(seriesId, entityId),
    [seriesId, entityId, relationRepo],
  );

  // Fetch all entries once, filter client-side
  const allEntries = useLiveQuery(
    () => codexRepo.getBySeries(seriesId),
    [seriesId, codexRepo],
  );

  const relatedEntries = useMemo(() => {
    if (!relations || !allEntries) return [];
    const childIds = new Set(relations.map((r) => r.childId));
    return allEntries.filter((e) => childIds.has(e.id));
  }, [relations, allEntries]);

  // Available entries for picker (exclude self and already linked)
  const availableEntries = useMemo(() => {
    if (!allEntries) return [];
    const linkedIds = new Set(relations?.map((r) => r.childId) ?? []);
    return allEntries
      .filter((e) => e.id !== entityId && !linkedIds.has(e.id))
      .filter((e) => e.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [allEntries, relations, entityId, searchQuery]);

  const addRelation = async (childId: string, childName: string) => {
    await relationRepo.create(seriesId, {
      parentId: entityId,
      childId: childId,
    });
    invalidateQueries();
    toast.success(`Linked to ${childName}`);
    setShowPicker(false);
    setSearchQuery("");
  };

  const removeRelation = async (relationId: string) => {
    await relationRepo.delete(seriesId, relationId);
    invalidateQueries();
  };

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-medium">Relations/Connections</h3>
          <p className="text-sm text-muted-foreground">
            Link related codex entries. Nested entries will be included in AI
            context when this entry is mentioned.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowPicker(true)}>
          <Plus className="h-3 w-3 mr-1" /> Add Entry
        </Button>
      </div>

      {relatedEntries && relatedEntries.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            Linked entries
          </h4>
          {relatedEntries.map((entry) => {
            const relation = relations?.find((r) => r.childId === entry.id);
            return (
              <div
                key={entry.id}
                className="flex items-center gap-3 p-3 border rounded hover:bg-accent"
              >
                <div className="h-8 w-8 bg-muted rounded flex items-center justify-center flex-shrink-0">
                  {categoryIcons[entry.category] || (
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{entry.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {entry.category}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => relation && removeRelation(relation.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground text-center py-12 border rounded-lg">
          No relations yet. Link related entries to group them together.
        </div>
      )}

      {/* Entry Picker Dialog */}
      <Dialog open={showPicker} onOpenChange={setShowPicker}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Link Codex Entry</DialogTitle>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          <ScrollArea className="h-scroll">
            {availableEntries.length > 0 ? (
              <div className="space-y-1">
                {availableEntries.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => addRelation(entry.id, entry.name)}
                    className="w-full flex items-center gap-3 p-2 rounded hover:bg-accent text-left"
                  >
                    <div className="h-8 w-8 bg-muted rounded flex items-center justify-center flex-shrink-0">
                      {categoryIcons[entry.category] || (
                        <Link2 className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{entry.name}</div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {entry.category}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                {searchQuery
                  ? "No matching entries"
                  : "No available entries to link"}
              </p>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
