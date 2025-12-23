'use client';

import { useState, useEffect } from 'react';
import { tabLeaderService } from '@/infrastructure/services/tab-leader-service';

/**
 * Hook to check if current tab is the leader
 * 
 * Non-leader tabs should be blocked from editing to prevent data conflicts.
 * 
 * @example
 * ```tsx
 * function EditorContainer() {
 *   const { isLeader, tabId } = useTabLeader();
 *   
 *   if (!isLeader) {
 *     return <MultiTabBlocker />;
 *   }
 *   
 *   return <Editor />;
 * }
 * ```
 */
export function useTabLeader() {
    const [isLeader, setIsLeader] = useState(() =>
        tabLeaderService?.getIsLeader() ?? true
    );

    useEffect(() => {
        if (!tabLeaderService) return;

        return tabLeaderService.onLeadershipChange(setIsLeader);
    }, []);

    return {
        isLeader,
        tabId: tabLeaderService?.getTabId() ?? 'unknown'
    };
}
