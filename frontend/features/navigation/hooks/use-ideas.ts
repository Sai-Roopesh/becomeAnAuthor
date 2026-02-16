"use client";

/**
 * useIdeas Hook
 *
 * Manages ideas with optional scene scoping and CRUD operations.
 * Follows the existing hook patterns in the codebase.
 */

import { useState, useEffect, useCallback } from "react";
import { useAppServices } from "@/infrastructure/di/AppContext";
import type { Idea, IdeaCategory } from "@/domain/entities/types";

interface UseIdeasOptions {
  projectId: string;
  sceneId?: string;
}

interface UseIdeasReturn {
  ideas: Idea[];
  archivedIdeas: Idea[];
  isLoading: boolean;
  error: string | null;
  createIdea: (
    content: string,
    category?: IdeaCategory,
    tags?: string[],
  ) => Promise<Idea | null>;
  updateIdea: (idea: Idea) => Promise<void>;
  deleteIdea: (ideaId: string) => Promise<void>;
  archiveIdea: (ideaId: string) => Promise<void>;
  restoreIdea: (ideaId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useIdeas({
  projectId,
  sceneId,
}: UseIdeasOptions): UseIdeasReturn {
  const { ideaRepository } = useAppServices();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch ideas
  const fetchIdeas = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const allIdeas = await ideaRepository.list(projectId);
      const scopedIdeas =
        sceneId !== undefined
          ? allIdeas.filter((idea) => idea.sceneId === sceneId)
          : allIdeas;
      // Sort by createdAt descending (newest first)
      setIdeas(scopedIdeas.sort((a, b) => b.createdAt - a.createdAt));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ideas");
    } finally {
      setIsLoading(false);
    }
  }, [ideaRepository, projectId, sceneId]);

  // Load ideas on mount
  useEffect(() => {
    if (projectId) {
      fetchIdeas();
    }
  }, [projectId, fetchIdeas]);

  // Create new idea
  const createIdea = useCallback(
    async (
      content: string,
      category: IdeaCategory = "other",
      tags: string[] = [],
    ): Promise<Idea | null> => {
      if (!content.trim()) return null;

      try {
        const created = await ideaRepository.create({
          projectId,
          content: content.trim(),
          ...(sceneId ? { sceneId } : {}),
          category,
          tags,
          archived: false,
        });
        setIdeas((prev) => [created, ...prev]);
        return created;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create idea");
        return null;
      }
    },
    [projectId, sceneId, ideaRepository],
  );

  // Update idea
  const updateIdea = useCallback(
    async (idea: Idea): Promise<void> => {
      try {
        await ideaRepository.update(idea);
        setIdeas((prev) => prev.map((i) => (i.id === idea.id ? idea : i)));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update idea");
      }
    },
    [ideaRepository],
  );

  // Delete idea
  const deleteIdea = useCallback(
    async (ideaId: string): Promise<void> => {
      try {
        await ideaRepository.delete(ideaId);
        setIdeas((prev) => prev.filter((i) => i.id !== ideaId));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete idea");
      }
    },
    [ideaRepository],
  );

  // Archive idea
  const archiveIdea = useCallback(
    async (ideaId: string): Promise<void> => {
      const idea = ideas.find((i) => i.id === ideaId);
      if (idea) {
        await updateIdea({ ...idea, archived: true });
      }
    },
    [ideas, updateIdea],
  );

  const restoreIdea = useCallback(
    async (ideaId: string): Promise<void> => {
      const idea = ideas.find((i) => i.id === ideaId);
      if (idea) {
        await updateIdea({ ...idea, archived: false });
      }
    },
    [ideas, updateIdea],
  );

  return {
    ideas: ideas.filter((i) => !i.archived),
    archivedIdeas: ideas.filter((i) => i.archived),
    isLoading,
    error,
    createIdea,
    updateIdea,
    deleteIdea,
    archiveIdea,
    restoreIdea,
    refetch: fetchIdeas,
  };
}
