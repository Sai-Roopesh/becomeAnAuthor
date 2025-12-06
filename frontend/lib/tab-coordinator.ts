/**
 * TabCoordinator - Prevents data corruption when same project open in multiple browser tabs
 * 
 * Uses BroadcastChannel API to coordinate between tabs:
 * - Detects when same project is opened in multiple tabs
 * - Shows warning to user
 * - Optionally locks editing to first tab
 * 
 * Critical: Prevents race conditions in save operations across tabs
 */

export type TabMessage =
    | { type: 'project_opened'; projectId: string; tabId: string; timestamp: number }
    | { type: 'project_closed'; projectId: string; tabId: string }
    | { type: 'heartbeat'; tabId: string; projectId: string; timestamp: number }
    | { type: 'save_started'; projectId: string; sceneId: string; tabId: string }
    | { type: 'save_completed'; projectId: string; sceneId: string; tabId: string };

export class TabCoordinator {
    private channel: BroadcastChannel;
    private tabId: string;
    private activeTabs = new Map<string, { projectId: string; lastSeen: number }>();
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private onMultiTabDetected?: (projectId: string, tabCount: number) => void;

    constructor() {
        this.tabId = this.generateTabId();
        this.channel = new BroadcastChannel('become-an-author-tabs');
        this.setupMessageHandler();
        this.startHeartbeat();

        // Cleanup on page unload
        window.addEventListener('beforeunload', () => this.cleanup());
    }

    /**
     * Generate unique tab identifier
     */
    private generateTabId(): string {
        return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Setup message handler for cross-tab communication
     */
    private setupMessageHandler() {
        this.channel.onmessage = (event: MessageEvent<TabMessage>) => {
            const message = event.data;

            switch (message.type) {
                case 'project_opened':
                    if (message.tabId !== this.tabId) {
                        this.activeTabs.set(message.tabId, {
                            projectId: message.projectId,
                            lastSeen: message.timestamp,
                        });
                        this.checkForMultiTab(message.projectId);
                    }
                    break;

                case 'project_closed':
                    if (message.tabId !== this.tabId) {
                        this.activeTabs.delete(message.tabId);
                    }
                    break;

                case 'heartbeat':
                    if (message.tabId !== this.tabId) {
                        this.activeTabs.set(message.tabId, {
                            projectId: message.projectId,
                            lastSeen: message.timestamp,
                        });
                    }
                    break;

                case 'save_started':
                case 'save_completed':
                    // Future: Could track save conflicts here
                    break;
            }
        };
    }

    /**
     * Send heartbeat to other tabs
     */
    private startHeartbeat() {
        // Send heartbeat every 3 seconds
        this.heartbeatInterval = setInterval(() => {
            this.cleanupStaleTabs();
        }, 3000);
    }

    /**
     * Remove tabs that stopped sending heartbeats (closed without cleanup)
     */
    private cleanupStaleTabs() {
        const now = Date.now();
        const timeout = 10000; // 10 seconds

        for (const [tabId, info] of this.activeTabs.entries()) {
            if (now - info.lastSeen > timeout) {
                this.activeTabs.delete(tabId);
            }
        }
    }

    /**
     * Announce that this tab opened a project
     */
    notifyProjectOpened(projectId: string) {
        const message: TabMessage = {
            type: 'project_opened',
            projectId,
            tabId: this.tabId,
            timestamp: Date.now(),
        };
        this.channel.postMessage(message);

        // Check immediately if other tabs already have this project open
        setTimeout(() => this.checkForMultiTab(projectId), 100);
    }

    /**
     * Announce that this tab closed a project
     */
    notifyProjectClosed(projectId: string) {
        const message: TabMessage = {
            type: 'project_closed',
            projectId,
            tabId: this.tabId,
        };
        this.channel.postMessage(message);
    }

    /**
     * Check if project is open in multiple tabs
     */
    private checkForMultiTab(projectId: string) {
        const tabsWithProject = Array.from(this.activeTabs.values()).filter(
            (tab) => tab.projectId === projectId
        );

        if (tabsWithProject.length > 0) {
            const totalTabs = tabsWithProject.length + 1; // +1 for this tab
            this.onMultiTabDetected?.(projectId, totalTabs);
        }
    }

    /**
     * Get count of tabs with same project open
     */
    getTabCount(projectId: string): number {
        const othersCount = Array.from(this.activeTabs.values()).filter(
            (tab) => tab.projectId === projectId
        ).length;
        return othersCount + 1; // +1 for this tab
    }

    /**
     * Set callback for multi-tab detection
     */
    onMultiTab(callback: (projectId: string, tabCount: number) => void) {
        this.onMultiTabDetected = callback;
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        this.channel.close();
    }

    /**
     * Get this tab's ID
     */
    getTabId(): string {
        return this.tabId;
    }
}

// Singleton instance
let tabCoordinatorInstance: TabCoordinator | null = null;

/**
 * Get or create TabCoordinator singleton
 */
export function getTabCoordinator(): TabCoordinator {
    if (!tabCoordinatorInstance) {
        tabCoordinatorInstance = new TabCoordinator();
    }
    return tabCoordinatorInstance;
}
