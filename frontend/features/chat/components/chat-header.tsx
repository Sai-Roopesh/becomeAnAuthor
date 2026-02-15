"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Pin,
  Archive,
  Download,
  Trash2,
  Settings as SettingsIcon,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatHeaderProps {
  threadName: string;
  isPinned: boolean;
  isArchived?: boolean;
  onNameChange: (name: string) => void;
  onPin: () => void;
  onArchive: () => void;
  onExport: () => void;
  onDelete: () => void;
  onOpenSettings: () => void;
}

/**
 * Chat Header Component
 * Displays thread name with inline editing and action menu
 */
export function ChatHeader({
  threadName,
  isPinned,
  isArchived = false,
  onNameChange,
  onPin,
  onArchive,
  onExport,
  onDelete,
  onOpenSettings,
}: ChatHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(threadName);

  const handleSaveName = () => {
    onNameChange(name);
    setIsEditing(false);
  };

  return (
    <div className="sticky top-0 z-20 border-b border-border/50 p-4 flex items-center gap-3 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
        <MessageSquare className="h-4 w-4" />
      </div>

      {isEditing ? (
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleSaveName}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSaveName();
            if (e.key === "Escape") {
              setName(threadName);
              setIsEditing(false);
            }
          }}
          className="flex-1 h-8 font-heading font-semibold"
          autoFocus
        />
      ) : (
        <h2
          className="flex-1 font-heading font-semibold text-lg cursor-pointer hover:text-primary transition-colors truncate"
          onClick={() => setIsEditing(true)}
          title="Click to rename"
        >
          {threadName}
        </h2>
      )}

      {/* Actions Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-muted"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={onPin}>
            <Pin className={cn("h-4 w-4 mr-2", isPinned && "fill-current")} />
            {isPinned ? "Unpin Chat" : "Pin Chat"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onArchive}>
            <Archive className="h-4 w-4 mr-2" />
            {isArchived ? "Restore Chat" : "Archive Chat"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExport}>
            <Download className="h-4 w-4 mr-2" />
            Export to Markdown
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onOpenSettings}>
            <SettingsIcon className="h-4 w-4 mr-2" />
            Chat Settings
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onDelete}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Chat
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
