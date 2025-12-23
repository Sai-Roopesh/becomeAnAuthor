/**
 * Collaboration Hook
 * 
 * Manages Yjs document lifecycle, local persistence, and P2P sync via WebRTC.
 * Per CODING_GUIDELINES.md: Layer 2 - Custom Hook
 */

import { useState, useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { WebrtcProvider } from 'y-webrtc';
import { collaborationRepository } from '@/infrastructure/repositories/TauriCollaborationRepository';
import type { CollaborationStatus, CollaborationPeer } from '@/domain/entities/types';
import { logger } from '@/shared/utils/logger';

const log = logger.scope('Collaboration');

// Public signaling servers (for development, replace with self-hosted for production)
const SIGNALING_SERVERS = [
    'wss://signaling.yjs.dev',
    'wss://y-webrtc-signaling-eu.herokuapp.com',
    'wss://y-webrtc-signaling-us.herokuapp.com',
];

interface UseCollaborationOptions {
    sceneId: string;
    projectId: string;
    userName?: string;
    userColor?: string;
    enabled?: boolean;
    enableP2P?: boolean; // Enable WebRTC P2P sync
}

interface UseCollaborationReturn {
    ydoc: Y.Doc | null;
    status: CollaborationStatus;
    peers: CollaborationPeer[];
    syncProgress: number;
    error: string | null;
    roomId: string;
}

/**
 * Generate a random color for cursor
 */
function getRandomColor(): string {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
        '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
    ];
    return colors[Math.floor(Math.random() * colors.length)] ?? '#888888';
}

/**
 * Hook for managing Yjs collaboration state with optional P2P sync
 */
export function useCollaboration({
    sceneId,
    projectId,
    userName = 'Anonymous',
    userColor,
    enabled = true,
    enableP2P = false
}: UseCollaborationOptions): UseCollaborationReturn {
    const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
    const [status, setStatus] = useState<CollaborationStatus>('disconnected');
    const [peers, setPeers] = useState<CollaborationPeer[]>([]);
    const [syncProgress, setSyncProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const persistenceRef = useRef<IndexeddbPersistence | null>(null);
    const webrtcProviderRef = useRef<WebrtcProvider | null>(null);
    const ydocRef = useRef<Y.Doc | null>(null);
    const roomId = `becomeauthor-${projectId}-${sceneId}`;

    // Initialize Yjs document
    useEffect(() => {
        if (!enabled || !sceneId || !projectId) {
            return;
        }

        let saveInterval: NodeJS.Timeout | undefined;
        const color = userColor || getRandomColor();

        const initYjs = async () => {
            try {
                setStatus('connecting');
                setSyncProgress(0);

                // Create new Yjs document
                const doc = new Y.Doc();
                ydocRef.current = doc;

                // Set up IndexedDB persistence for offline support
                const dbName = `collab-${projectId}-${sceneId}`;
                const persistence = new IndexeddbPersistence(dbName, doc);
                persistenceRef.current = persistence;

                // Track IndexedDB sync progress
                persistence.on('synced', () => {
                    log.debug('IndexedDB synced', { sceneId });
                    setSyncProgress(50);
                    if (!enableP2P) {
                        setStatus('synced');
                        setSyncProgress(100);
                    }
                });

                // Load any existing state from Tauri backend
                const savedState = await collaborationRepository.loadYjsState(sceneId, projectId);
                if (savedState?.update && savedState.update.length > 0) {
                    Y.applyUpdate(doc, savedState.update);
                    log.debug('Applied saved Yjs state', { sceneId });
                }

                // Set up WebRTC P2P sync if enabled
                if (enableP2P) {
                    const provider = new WebrtcProvider(roomId, doc, {
                        signaling: SIGNALING_SERVERS,
                    });
                    webrtcProviderRef.current = provider;

                    // Set up awareness (user presence)
                    provider.awareness.setLocalStateField('user', {
                        name: userName,
                        color: color,
                    });

                    // Track connection status
                    provider.on('synced', ({ synced }: { synced: boolean }) => {
                        if (synced) {
                            setStatus('synced');
                            setSyncProgress(100);
                            log.debug('WebRTC synced', { roomId });
                        }
                    });

                    provider.on('peers', ({ added, removed }: { added: string[], removed: string[] }) => {
                        log.debug('Peers changed', { added, removed });
                    });

                    // Track peers via awareness
                    provider.awareness.on('change', () => {
                        const states = provider.awareness.getStates() as Map<number, { user?: { name: string; color: string } }>;
                        const peerList: CollaborationPeer[] = [];

                        states.forEach((state, clientId) => {
                            if (state.user && clientId !== doc.clientID) {
                                peerList.push({
                                    id: String(clientId),
                                    name: state.user.name || 'Anonymous',
                                    color: state.user.color || '#888888',
                                    lastSeen: Date.now(),
                                });
                            }
                        });

                        setPeers(peerList);
                    });

                    setStatus('syncing');
                }

                // Save state periodically to Tauri backend
                saveInterval = setInterval(() => {
                    if (ydocRef.current) {
                        const update = Y.encodeStateAsUpdate(ydocRef.current);
                        collaborationRepository.saveYjsState(sceneId, projectId, update).catch(err => {
                            log.error('Auto-save failed', err);
                        });
                    }
                }, 30000); // Save every 30 seconds

                setYdoc(doc);
                setError(null);
            } catch (err) {
                log.error('Failed to initialize Yjs', err);
                setError(err instanceof Error ? err.message : 'Failed to initialize collaboration');
                setStatus('disconnected');
                return undefined;
            }
        };

        initYjs();

        return () => {
            if (saveInterval) {
                clearInterval(saveInterval);
            }

            // Final save before cleanup
            if (ydocRef.current) {
                const update = Y.encodeStateAsUpdate(ydocRef.current);
                collaborationRepository.saveYjsState(sceneId, projectId, update).catch(() => { });
            }

            // Cleanup WebRTC provider
            if (webrtcProviderRef.current) {
                webrtcProviderRef.current.destroy();
                webrtcProviderRef.current = null;
            }

            // Cleanup IndexedDB persistence
            if (persistenceRef.current) {
                persistenceRef.current.destroy();
                persistenceRef.current = null;
            }

            // Cleanup Yjs document
            if (ydocRef.current) {
                ydocRef.current.destroy();
                ydocRef.current = null;
            }
        };
    }, [sceneId, projectId, enabled, enableP2P, userName, userColor, roomId]);

    return {
        ydoc,
        status,
        peers,
        syncProgress,
        error,
        roomId
    };
}
