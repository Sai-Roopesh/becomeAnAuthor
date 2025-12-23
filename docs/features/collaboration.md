# P2P Collaboration Feature

Real-time collaborative editing using Yjs CRDTs and WebRTC.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    TiptapEditor                              │
│  ┌─────────────────┐  ┌──────────────────┐                  │
│  │ Collaboration   │  │ CollaborationPanel│                  │
│  │ Extension       │  │ (UI)              │                  │
│  └────────┬────────┘  └────────┬─────────┘                  │
│           │                    │                             │
│           ▼                    ▼                             │
│  ┌────────────────────────────────────────┐                 │
│  │         useCollaboration Hook          │                 │
│  │  - Yjs Document lifecycle              │                 │
│  │  - WebRTC provider                     │                 │
│  │  - Peer awareness                      │                 │
│  └────────────────┬───────────────────────┘                 │
│                   │                                          │
│      ┌───────────┴───────────┐                              │
│      ▼                       ▼                              │
│ ┌──────────────┐    ┌────────────────────┐                  │
│ │ y-indexeddb  │    │ y-webrtc           │                  │
│ │ (local)      │    │ (P2P sync)         │                  │
│ └──────────────┘    └────────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

## Files

| Layer | File | Purpose |
|-------|------|---------|
| Types | `domain/entities/types.ts` | `CollaborationRoom`, `YjsStateSnapshot`, `CollaborationPeer`, `CollaborationStatus` |
| Interface | `domain/repositories/ICollaborationRepository.ts` | Yjs state persistence contract |
| Repository | `infrastructure/repositories/TauriCollaborationRepository.ts` | Tauri command wrapper |
| Hook | `hooks/use-collaboration.ts` | Yjs + WebRTC lifecycle management |
| UI | `features/collaboration/components/CollaborationPanel.tsx` | Status, peers, room sharing |
| Rust | `backend/src/commands/collaboration.rs` | `save_yjs_state`, `load_yjs_state`, `has_yjs_state`, `delete_yjs_state` |

## Usage

### Enable P2P Sync in Editor
The `TiptapEditor` automatically calls `useCollaboration`:

```tsx
const { ydoc, status, peers, roomId } = useCollaboration({
    sceneId,
    projectId,
    enableP2P: true,  // Set to true to enable WebRTC
});
```

### How It Works
1. Each scene creates a Yjs document
2. Local persistence via `y-indexeddb`
3. Backend persistence via Tauri commands (`.yjs` files)
4. P2P sync via `y-webrtc` with public signaling servers

### Signaling Servers
Default (development):
- `wss://signaling.yjs.dev`
- `wss://y-webrtc-signaling-eu.herokuapp.com`
- `wss://y-webrtc-signaling-us.herokuapp.com`

For production, self-host a signaling server.

## Dependencies
- `yjs` - CRDT library
- `@tiptap/extension-collaboration` - Tiptap integration
- `y-indexeddb` - Local offline persistence
- `y-webrtc` - WebRTC P2P provider

## User Flow
1. Open scene in editor
2. Click collaboration icon in toolbar
3. Toggle "Enable P2P Sync"
4. Share Room ID with collaborators
5. Collaborators open same scene with P2P enabled
6. Edits sync in real-time
