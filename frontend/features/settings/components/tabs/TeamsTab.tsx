"use client";

/**
 * Teams Tab
 *
 * Team collaboration settings and P2P sync information.
 */
export function TeamsTab() {
  return (
    <div className="p-6 bg-background flex-1 overflow-y-auto min-h-0">
      <h3 className="text-lg font-semibold mb-2">Team Collaboration</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Work together on your stories with other writers using P2P
        collaboration.
      </p>

      <div className="space-y-6">
        {/* Feature Status */}
        <div className="p-4 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="font-medium">P2P Sync Ready</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Yjs-based CRDT synchronization is enabled. Open the same scene in
            multiple windows or share the Room ID with collaborators to edit
            together in real-time.
          </p>
        </div>

        {/* How to Use */}
        <div className="space-y-2">
          <h4 className="font-medium">How to Collaborate</h4>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li>Open a scene in the editor</li>
            <li>Click the collaboration icon in the toolbar</li>
            <li>Enable P2P Sync</li>
            <li>Share the Room ID with your collaborators</li>
            <li>Collaborators paste the Room ID to join</li>
          </ol>
        </div>

        {/* Privacy Note */}
        <div className="p-3 border rounded-lg bg-yellow-500/10 border-yellow-500/30">
          <p className="text-sm text-muted-foreground">
            <strong>Privacy:</strong> P2P sync connects you directly to
            collaborators. No central server stores your content—it stays
            between connected peers.
          </p>
        </div>
      </div>
    </div>
  );
}
