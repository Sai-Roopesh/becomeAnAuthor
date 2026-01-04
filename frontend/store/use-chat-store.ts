/**
 * Chat Store
 * Manages chat UI state: active thread selection
 */

import { create } from 'zustand';

interface ChatStore {
    activeThreadId: string | null;
    setActiveThreadId: (id: string | null) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
    activeThreadId: null,
    setActiveThreadId: (id) => set({ activeThreadId: id }),
}));
