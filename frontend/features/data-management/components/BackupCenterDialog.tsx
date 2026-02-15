"use client";

import { useState } from "react";
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

interface BackupCenterDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function BackupCenterDialog({
  open: controlledOpen,
  onOpenChange,
  trigger,
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

      <DialogContent className="max-w-3xl h-[85dvh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Backup Center</DialogTitle>
          <DialogDescription>
            Manage local and cloud backups from one place, and restore with a
            single workflow.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          <BackupCenterPanel onCompleted={() => setOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
