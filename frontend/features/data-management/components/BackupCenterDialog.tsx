"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BackupCenterPanel } from "./BackupCenterPanel";
import type { BackupImportResult } from "@/core/tauri/commands";

interface GoogleAuthState {
  isAuthenticated: boolean;
  user?: { name?: string; email?: string } | null;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

export interface BackupCenterDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  googleAuth?: GoogleAuthState;
  renderGoogleAuthWidget?: (props: { onAuthComplete: () => void }) => ReactNode;
  renderDriveBackupBrowser?: (props: {
    onRestore: (result: BackupImportResult) => Promise<void>;
  }) => ReactNode;
}

export function BackupCenterDialog({
  open: controlledOpen,
  onOpenChange,
  trigger,
  googleAuth,
  renderGoogleAuthWidget,
  renderDriveBackupBrowser,
}: BackupCenterDialogProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const setOpen = (value: boolean) => {
    if (onOpenChange) onOpenChange(value);
    else setInternalOpen(value);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger !== undefined ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Database className="w-4 h-4 mr-2" />
            Backup Center
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="max-w-3xl h-[90dvh] sm:h-[85dvh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Backup Center</DialogTitle>
          <DialogDescription>
            Manage local and cloud backups from one place, and restore with a
            single workflow.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          <BackupCenterPanel
            onCompleted={() => setOpen(false)}
            googleAuth={googleAuth}
            renderGoogleAuthWidget={renderGoogleAuthWidget}
            renderDriveBackupBrowser={renderDriveBackupBrowser}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
