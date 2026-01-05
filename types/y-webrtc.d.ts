/**
 * Type declarations for y-webrtc
 *
 * y-webrtc doesn't ship with TypeScript declarations,
 * so we provide minimal typings for the WebrtcProvider class.
 */

declare module "y-webrtc" {
  import * as Y from "yjs";
  import { Awareness } from "y-protocols/awareness";

  export interface WebrtcProviderOptions {
    signaling?: string[];
    password?: string;
    awareness?: Awareness;
    maxConns?: number;
    filterBcConns?: boolean;
    peerOpts?: object;
  }

  export class WebrtcProvider {
    constructor(roomName: string, doc: Y.Doc, options?: WebrtcProviderOptions);

    awareness: Awareness;
    roomName: string;
    doc: Y.Doc;

    on(event: "synced", callback: (data: { synced: boolean }) => void): void;
    on(event: "status", callback: (data: { connected: boolean }) => void): void;
    on(
      event: "peers",
      callback: (data: { added: string[]; removed: string[] }) => void,
    ): void;
    on(event: string, callback: (...args: unknown[]) => void): void;

    off(event: string, callback: (...args: unknown[]) => void): void;

    destroy(): void;
    connect(): void;
    disconnect(): void;
  }
}
