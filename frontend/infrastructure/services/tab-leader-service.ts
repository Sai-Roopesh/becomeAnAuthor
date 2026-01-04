'use client';

/**
 * Tab Leader Service
 * 
 * Implements leader election for multi-tab coordination using BroadcastChannel API.
 * Only the "leader" tab can write to the database, other tabs are blocked.
 * 
 * This prevents the critical issue of multiple tabs overwriting each other's changes.
 */

import { logger } from '@/shared/utils/logger';
import { TIMEOUTS, INFRASTRUCTURE } from '@/lib/config/constants';

const log = logger.scope('TabLeaderService');

export class TabLeaderService {
    private channel: BroadcastChannel;
    private tabId: string;
    private isLeader: boolean = false;
    private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    private readonly HEARTBEAT_MS = TIMEOUTS.TAB_HEARTBEAT_MS;
    private readonly LEADER_TIMEOUT_MS = TIMEOUTS.TAB_LEADER_TIMEOUT_MS;
    private lastLeaderHeartbeat: number = 0;

    private listeners: Set<(isLeader: boolean) => void> = new Set();

    constructor() {
        this.tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.channel = new BroadcastChannel('become_an_author_tabs');
        this.setupListeners();
        this.attemptLeadership();
    }

    private setupListeners(): void {
        this.channel.onmessage = (event) => {
            const { type, tabId, timestamp } = event.data;

            switch (type) {
                case 'LEADER_HEARTBEAT':
                    if (tabId !== this.tabId) {
                        this.lastLeaderHeartbeat = timestamp;
                        if (this.isLeader) {
                            // Another tab claimed leadership first, step down
                            this.stepDown();
                        }
                    }
                    break;

                case 'LEADER_CLAIM':
                    if (tabId !== this.tabId && this.isLeader) {
                        // Compare tab IDs to determine winner (lowest wins - deterministic)
                        if (tabId < this.tabId) {
                            this.stepDown();
                        }
                    }
                    break;

                case 'REQUEST_LEADER':
                    if (this.isLeader) {
                        this.sendHeartbeat();
                    }
                    break;
            }
        };
    }

    private attemptLeadership(): void {
        // Request current leader
        this.channel.postMessage({ type: 'REQUEST_LEADER', tabId: this.tabId });

        // Wait for response, then claim if no leader
        setTimeout(() => {
            if (Date.now() - this.lastLeaderHeartbeat > this.LEADER_TIMEOUT_MS) {
                this.claimLeadership();
            }
        }, INFRASTRUCTURE.TAB_ELECTION_DELAY_MS);
    }

    private claimLeadership(): void {
        this.isLeader = true;
        this.channel.postMessage({
            type: 'LEADER_CLAIM',
            tabId: this.tabId,
            timestamp: Date.now()
        });
        this.startHeartbeat();
        this.notifyListeners();
        log.debug(`This tab (${this.tabId}) is now the leader`);
    }

    private stepDown(): void {
        this.isLeader = false;
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        this.notifyListeners();
        log.debug(`This tab (${this.tabId}) stepped down from leader`);
    }

    private startHeartbeat(): void {
        this.sendHeartbeat();
        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat();
        }, this.HEARTBEAT_MS);
    }

    private sendHeartbeat(): void {
        this.channel.postMessage({
            type: 'LEADER_HEARTBEAT',
            tabId: this.tabId,
            timestamp: Date.now()
        });
    }

    private notifyListeners(): void {
        this.listeners.forEach(fn => fn(this.isLeader));
    }

    // Public API

    /**
     * Subscribe to leadership changes
     * @returns Unsubscribe function
     */
    onLeadershipChange(callback: (isLeader: boolean) => void): () => void {
        this.listeners.add(callback);
        callback(this.isLeader); // Immediate call with current state
        return () => this.listeners.delete(callback);
    }

    /**
     * Check if current tab is the leader
     */
    getIsLeader(): boolean {
        return this.isLeader;
    }

    /**
     * Get unique identifier for this tab
     */
    getTabId(): string {
        return this.tabId;
    }

    /**
     * Cleanup on app unmount
     */
    destroy(): void {
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        this.channel.close();
    }
}

// Singleton instance - only create if in browser
export const tabLeaderService = typeof window !== 'undefined'
    ? new TabLeaderService()
    : null;
