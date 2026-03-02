/**
 * Collaboration Hook
 *
 * Manages Yjs document lifecycle, SQLite persistence, and P2P sync via WebRTC.
 * Per CODING_GUIDELINES.md: Layer 2 - Custom Hook
 */

import { useState, useEffect, useRef, useCallback } from "react";
import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";
import { collaborationRepository } from "@/infrastructure/repositories/TauriCollaborationRepository";
import type {
  CollaborationStatus,
  CollaborationPeer,
} from "@/domain/entities/types";
import { logger } from "@/shared/utils/logger";
import { COLLABORATION } from "@/lib/config/constants";

const log = logger.scope("Collaboration");

const SAVE_DEBOUNCE_MS = 1500;

interface UseCollaborationOptions {
  sceneId: string;
  projectId: string;
  userName?: string;
  userColor?: string;
  enabled?: boolean;
  enableP2P?: boolean;
  /** Join someone else's room instead of creating own */
  customRoomId?: string | undefined;
}

interface UseCollaborationReturn {
  ydoc: Y.Doc | null;
  status: CollaborationStatus;
  peers: CollaborationPeer[];
  syncProgress: number;
  error: string | null;
  roomId: string;
  /** Whether currently joined to an external room */
  isJoinedRoom: boolean;
}

/**
 * Generate a random color for cursor
 */
function getRandomColor(): string {
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEAA7",
    "#DDA0DD",
    "#98D8C8",
    "#F7DC6F",
  ];
  return colors[Math.floor(Math.random() * colors.length)] ?? "#888888";
}

/**
 * Hook for managing Yjs collaboration state with optional P2P sync
 */
export function useCollaboration({
  sceneId,
  projectId,
  userName = "Anonymous",
  userColor,
  enabled = true,
  enableP2P = false,
  customRoomId,
}: UseCollaborationOptions): UseCollaborationReturn {
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  const [status, setStatus] = useState<CollaborationStatus>("disconnected");
  const [peers, setPeers] = useState<CollaborationPeer[]>([]);
  const [syncProgress, setSyncProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const webrtcProviderRef = useRef<WebrtcProvider | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isReconnectingRef = useRef(false);
  const saveDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Use custom room ID if provided (joining someone's room), otherwise create own
  const ownRoomId = `becomeauthor-${projectId}-${sceneId}`;
  const roomId = customRoomId || ownRoomId;
  const isJoinedRoom = !!customRoomId && customRoomId !== ownRoomId;

  const colorRef = useRef(userColor || getRandomColor());

  const flushSave = useCallback(async () => {
    if (!ydocRef.current) {
      return;
    }

    try {
      const update = Y.encodeStateAsUpdate(ydocRef.current);
      await collaborationRepository.saveYjsState(sceneId, projectId, update);
      log.debug("Saved Yjs state", { sceneId });
    } catch (saveError) {
      log.error("Failed to persist Yjs state", saveError);
    }
  }, [projectId, sceneId]);

  const scheduleSave = useCallback(() => {
    if (saveDebounceRef.current) {
      clearTimeout(saveDebounceRef.current);
    }

    saveDebounceRef.current = setTimeout(() => {
      void flushSave();
      saveDebounceRef.current = null;
    }, SAVE_DEBOUNCE_MS);
  }, [flushSave]);

  /**
   * Initialize WebRTC provider with reconnection support
   */
  const initWebRTC = useCallback(
    (doc: Y.Doc) => {
      if (!enableP2P) return null;

      try {
        const provider = new WebrtcProvider(roomId, doc, {
          signaling: [...COLLABORATION.SIGNALING_SERVERS],
        });

        // Set up awareness (user presence)
        provider.awareness.setLocalStateField("user", {
          name: userName,
          color: colorRef.current,
        });

        // Track connection status with reconnection logic
        provider.on("synced", ({ synced }: { synced: boolean }) => {
          if (synced) {
            setStatus("synced");
            setSyncProgress(100);
            reconnectAttemptsRef.current = 0; // Reset on successful sync
            isReconnectingRef.current = false;
            log.debug("WebRTC synced", { roomId });
          }
        });

        // Monitor for disconnection and trigger reconnect
        provider.on("status", ({ connected }: { connected: boolean }) => {
          if (!connected && !isReconnectingRef.current) {
            log.warn("WebRTC disconnected, attempting reconnect...", {
              roomId,
            });
            setStatus("connecting");

            // Attempt reconnection
            if (
              reconnectAttemptsRef.current <
              COLLABORATION.MAX_RECONNECT_ATTEMPTS
            ) {
              isReconnectingRef.current = true;
              const delay =
                COLLABORATION.BASE_RECONNECT_DELAY_MS *
                (reconnectAttemptsRef.current + 1);

              reconnectTimeoutRef.current = setTimeout(() => {
                reconnectAttemptsRef.current++;
                log.debug(
                  `Reconnection attempt ${reconnectAttemptsRef.current}/${COLLABORATION.MAX_RECONNECT_ATTEMPTS}`,
                  { roomId },
                );

                // Destroy old provider and create new one
                provider.destroy();
                const newProvider = initWebRTC(doc);
                if (newProvider) {
                  webrtcProviderRef.current = newProvider;
                }
              }, delay);
            } else {
              setError("Connection lost. Please refresh to reconnect.");
              setStatus("disconnected");
              isReconnectingRef.current = false;
            }
          }
        });

        provider.on(
          "peers",
          ({ added, removed }: { added: string[]; removed: string[] }) => {
            log.debug("Peers changed", { added, removed });
          },
        );

        // Track peers via awareness
        provider.awareness.on("change", () => {
          const states = provider.awareness.getStates() as Map<
            number,
            { user?: { name: string; color: string } }
          >;
          const peerList: CollaborationPeer[] = [];

          states.forEach((state, clientId) => {
            if (state.user && clientId !== doc.clientID) {
              peerList.push({
                id: String(clientId),
                name: state.user.name || "Anonymous",
                color: state.user.color || "#888888",
                lastSeen: Date.now(),
              });
            }
          });

          setPeers(peerList);
        });

        setStatus("syncing");
        return provider;
      } catch (err) {
        log.error("Failed to initialize WebRTC provider", err);
        return null;
      }
    },
    [enableP2P, roomId, userName],
  );

  // Initialize Yjs document
  useEffect(() => {
    if (!enabled || !sceneId || !projectId) {
      return;
    }

    const initYjs = async () => {
      try {
        setStatus("connecting");
        setSyncProgress(0);

        // Create new Yjs document
        const doc = new Y.Doc();
        ydocRef.current = doc;

        // Load any existing state from Tauri backend
        const savedState = await collaborationRepository.loadYjsState(
          sceneId,
          projectId,
        );
        if (savedState?.update && savedState.update.length > 0) {
          Y.applyUpdate(doc, savedState.update);
          log.debug("Applied saved Yjs state", { sceneId });
        }

        // Track document changes and persist to SQLite with debounce.
        const onDocUpdate = () => {
          scheduleSave();
        };
        doc.on("update", onDocUpdate);

        // Set up WebRTC P2P sync if enabled
        if (enableP2P) {
          const provider = initWebRTC(doc);
          if (provider) {
            webrtcProviderRef.current = provider;
          }
        } else {
          setStatus("synced");
          setSyncProgress(100);
        }

        const flushOnBlur = () => {
          void flushSave();
        };
        const flushOnVisibility = () => {
          if (document.visibilityState === "hidden") {
            void flushSave();
          }
        };
        const flushOnBeforeUnload = () => {
          void flushSave();
        };

        window.addEventListener("blur", flushOnBlur);
        window.addEventListener("beforeunload", flushOnBeforeUnload);
        document.addEventListener("visibilitychange", flushOnVisibility);

        setYdoc(doc);
        setError(null);

        return () => {
          doc.off("update", onDocUpdate);
          window.removeEventListener("blur", flushOnBlur);
          window.removeEventListener("beforeunload", flushOnBeforeUnload);
          document.removeEventListener("visibilitychange", flushOnVisibility);
        };
      } catch (err) {
        log.error("Failed to initialize Yjs", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to initialize collaboration",
        );
        setStatus("disconnected");
        return undefined;
      }
    };

    let cancelled = false;
    let cleanupListeners: (() => void) | undefined;
    void initYjs().then((cleanup) => {
      if (cancelled) {
        cleanup?.();
        return;
      }
      cleanupListeners = cleanup;
    });

    return () => {
      cancelled = true;
      // Clear reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (saveDebounceRef.current) {
        clearTimeout(saveDebounceRef.current);
        saveDebounceRef.current = null;
      }

      // Final save before cleanup
      void flushSave();

      // Cleanup listeners
      cleanupListeners?.();

      // Cleanup WebRTC provider
      if (webrtcProviderRef.current) {
        webrtcProviderRef.current.destroy();
        webrtcProviderRef.current = null;
      }

      // Cleanup Yjs document
      if (ydocRef.current) {
        ydocRef.current.destroy();
        ydocRef.current = null;
      }

      // Reset reconnection state
      reconnectAttemptsRef.current = 0;
      isReconnectingRef.current = false;
    };
  }, [
    sceneId,
    projectId,
    enabled,
    enableP2P,
    initWebRTC,
    scheduleSave,
    flushSave,
  ]);

  return {
    ydoc,
    status,
    peers,
    syncProgress,
    error,
    roomId,
    isJoinedRoom,
  };
}
