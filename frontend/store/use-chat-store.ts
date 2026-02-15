/**
 * Chat Store
 * Manages chat UI state: active thread selection
 */

import { create } from "zustand";

export type ChatThreadView = "active" | "archived" | "deleted";

interface ChatStore {
  activeThreadId: string | null;
  threadView: ChatThreadView;
  setActiveThreadId: (id: string | null) => void;
  setThreadView: (view: ChatThreadView) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  activeThreadId: null,
  threadView: "active",
  setActiveThreadId: (id) => set({ activeThreadId: id }),
  setThreadView: (threadView) => set({ threadView }),
}));
