"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { tagSchema, type TagFormData } from "@/shared/schemas/forms";
import { logger } from "@/shared/utils/logger";

const log = logger.scope("TagManager");
import { useLiveQuery, invalidateQueries } from "@/hooks/use-live-query";
import { useCodexTagRepository } from "@/hooks/use-codex-tag-repository";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { toast } from "@/shared/utils/toast-service";
import { getRandomTagColor } from "@/shared/constants/colors";

interface TagManagerProps {
  seriesId: string;
  entryId: string;
}

/**
 * Tag Manager Component
 *
 * ✅ ARCHITECTURE COMPLIANCE:
 * - Repository hook usage (NOT db directly)
 * - Toast service abstraction
 * - Feature component location
 * - 'use client' directive
 * - react-hook-form + zod validation
 */
export function TagManager({ seriesId, entryId }: TagManagerProps) {
  const tagRepo = useCodexTagRepository();
  const [isAdding, setIsAdding] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isValid },
  } = useForm<TagFormData>({
    resolver: zodResolver(tagSchema),
    mode: "onChange",
  });

  // ✅ Repository hooks + live queries
  const allTags = useLiveQuery(
    () => tagRepo.getByProject(seriesId),
    [seriesId],
  );

  const entryTags = useLiveQuery(
    () => tagRepo.getTagsByEntry(entryId),
    [entryId],
  );

  const handleCreateTag = async (data: TagFormData) => {
    setIsAdding(true);
    try {
      const newTag = await tagRepo.create({
        projectId: seriesId,
        name: data.name,
        color: getRandomTagColor(),
      });

      await tagRepo.addTagToEntry(entryId, newTag.id);
      invalidateQueries();
      reset();
      toast.success("Tag created and added");
    } catch (error) {
      log.error("Failed to create tag:", error);
      toast.error("Failed to create tag");
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddExistingTag = async (tagId: string) => {
    try {
      await tagRepo.addTagToEntry(entryId, tagId);
      invalidateQueries();
      toast.success("Tag added");
    } catch (error) {
      log.error("Failed to add tag:", error);
      toast.error("Failed to add tag");
    }
  };

  const handleRemoveTag = async (tagId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await tagRepo.removeTagFromEntry(entryId, tagId);
      invalidateQueries();
      toast.success("Tag removed");
    } catch (error) {
      log.error("Failed to remove tag:", error);
      toast.error("Failed to remove tag");
    }
  };

  const availableTags =
    allTags?.filter((t) => !entryTags?.some((et) => et.id === t.id)) || [];

  return (
    <div className="space-y-4">
      {/* Current Tags */}
      <div>
        <h4 className="text-sm font-medium mb-2">Tags</h4>
        <div className="flex flex-wrap gap-2">
          {entryTags && entryTags.length > 0 ? (
            entryTags.map((tag) => (
              <Badge
                key={tag.id}
                variant="secondary"
                style={{
                  backgroundColor: tag.color + "20",
                  borderColor: tag.color,
                  color: tag.color,
                }}
                className="border"
              >
                {tag.name}
                <X
                  className="h-3 w-3 ml-1 cursor-pointer hover:opacity-70"
                  onClick={(e) => handleRemoveTag(tag.id, e)}
                />
              </Badge>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No tags yet</p>
          )}
        </div>
      </div>

      {/* Add New Tag */}
      <div>
        <h4 className="text-sm font-medium mb-2">Add New Tag</h4>
        <form onSubmit={handleSubmit(handleCreateTag)} className="flex gap-2">
          <Input
            placeholder="Tag name..."
            {...register("name")}
            disabled={isAdding}
          />
          <Button type="submit" size="icon" disabled={!isValid || isAdding}>
            <Plus className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {/* Existing Tags */}
      {availableTags.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Or add existing tag:</h4>
          <div className="flex flex-wrap gap-1">
            {availableTags.map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                className="cursor-pointer hover:bg-accent"
                onClick={() => handleAddExistingTag(tag.id)}
                style={{ borderColor: tag.color + "40" }}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
