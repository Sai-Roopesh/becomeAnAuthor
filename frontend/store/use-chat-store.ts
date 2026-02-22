/**
 * Chat Store
 * Manages chat UI state per project.
 */

import { create } from "zustand";

export type ChatThreadView = "active" | "archived" | "deleted";

interface ChatStore {
  activeThreadIds: Record<string, string | null>;
  threadViews: Record<string, ChatThreadView>;
  getActiveThreadId: (projectId: string) => string | null;
  getThreadView: (projectId: string) => ChatThreadView;
  setActiveThreadId: (projectId: string, id: string | null) => void;
  setThreadView: (projectId: string, view: ChatThreadView) => void;
  clearProjectState: (projectId: string) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  activeThreadIds: {},
  threadViews: {},
  getActiveThreadId: (projectId) => get().activeThreadIds[projectId] ?? null,
  getThreadView: (projectId) => get().threadViews[projectId] ?? "active",
  setActiveThreadId: (projectId, id) =>
    set((state) => ({
      activeThreadIds: { ...state.activeThreadIds, [projectId]: id },
    })),
  setThreadView: (projectId, view) =>
    set((state) => ({
      threadViews: { ...state.threadViews, [projectId]: view },
    })),
  clearProjectState: (projectId) =>
    set((state) => {
      const nextActiveThreadIds = { ...state.activeThreadIds };
      const nextThreadViews = { ...state.threadViews };
      delete nextActiveThreadIds[projectId];
      delete nextThreadViews[projectId];

      return {
        activeThreadIds: nextActiveThreadIds,
        threadViews: nextThreadViews,
      };
    }),
}));
