"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Search,
  Trash2,
  MessageSquare,
  Archive,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatThread } from "@/domain/entities/types";

interface ChatSidebarProps {
  projectId: string;
  activeThreadId: string | null;
  threadView: "active" | "archived" | "deleted";
  setThreadView: (projectId: string, view: "active" | "archived" | "deleted") => void;
  setActiveThreadId: (projectId: string, threadId: string | null) => void;
  createNewThread: () => void;
  hasAIConnection: boolean;
  threads: ChatThread[];
  onArchiveThread: (threadId: string) => void;
  onRestoreThread: (threadId: string) => void;
  onDeleteThread: (threadId: string) => void;
  onCloseMobileSidebar?: () => void;
}

interface ThreadActionsProps {
  threadId: string;
  threadView: "active" | "archived" | "deleted";
  compact?: boolean;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
}

function ThreadActions({
  threadId,
  threadView,
  compact = false,
  onArchive,
  onRestore,
  onDelete,
}: ThreadActionsProps) {
  return (
    <div className={cn("flex items-center gap-1", !compact && "justify-end")}>
      {threadView === "active" && (
        <Button
          variant="ghost"
          size={compact ? "sm" : "icon"}
          className={cn(
            compact
              ? "h-6 px-2 text-[11px] text-foreground/90 hover:bg-muted hover:text-foreground"
              : "h-7 w-7 text-foreground/90 hover:bg-muted hover:text-foreground",
          )}
          onClick={(e) => {
            e.stopPropagation();
            onArchive(threadId);
          }}
          title="Archive chat"
          aria-label="Archive chat"
        >
          {!compact && <Archive className="h-3.5 w-3.5" />}
          {compact && "Archive"}
        </Button>
      )}
      {(threadView === "archived" || threadView === "deleted") && (
        <Button
          variant="ghost"
          size={compact ? "sm" : "icon"}
          className={cn(
            compact
              ? "h-6 px-2 text-[11px] text-foreground/90 hover:bg-muted hover:text-foreground"
              : "h-7 w-7 text-foreground/90 hover:bg-muted hover:text-foreground",
          )}
          onClick={(e) => {
            e.stopPropagation();
            onRestore(threadId);
          }}
          title="Restore chat"
          aria-label="Restore chat"
        >
          {!compact && <RotateCcw className="h-3.5 w-3.5" />}
          {compact && "Restore"}
        </Button>
      )}
      <Button
        variant="ghost"
        size={compact ? "sm" : "icon"}
        className={cn(
          compact
            ? "h-6 px-2 text-[11px] text-foreground/90 hover:bg-destructive/10 hover:text-destructive"
            : "h-7 w-7 text-foreground/90 hover:bg-destructive/10 hover:text-destructive",
        )}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(threadId);
        }}
        title={
          threadView === "deleted" ? "Delete permanently" : "Move to Deleted"
        }
        aria-label={
          threadView === "deleted" ? "Delete permanently" : "Move to Deleted"
        }
      >
        {!compact && <Trash2 className="h-3.5 w-3.5" />}
        {compact && (threadView === "deleted" ? "Delete" : "Move to Deleted")}
      </Button>
    </div>
  );
}

export function ChatSidebar({
  projectId,
  activeThreadId,
  threadView,
  setThreadView,
  setActiveThreadId,
  createNewThread,
  hasAIConnection,
  threads,
  onArchiveThread,
  onRestoreThread,
  onDeleteThread,
  onCloseMobileSidebar,
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredThreads = threads.filter((t) =>
    (t.name || "Untitled").toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getTabButtonClass = (view: "active" | "archived" | "deleted") =>
    cn(
      "h-8 w-full min-w-0 px-2 text-xs",
      threadView === view
        ? "bg-background border shadow-sm text-foreground"
        : "text-muted-foreground",
    );

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border/50 space-y-4">
        <Button
          onClick={createNewThread}
          className="w-full shadow-sm bg-primary/90 hover:bg-primary transition-all"
          size="default"
          disabled={!hasAIConnection}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
        {!hasAIConnection && (
          <p className="text-xs text-muted-foreground">
            Connect an AI provider in Settings to start new conversations.
          </p>
        )}
        <div className="relative group">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-muted/50 border-transparent focus:bg-background transition-all"
          />
        </div>
        <div className="grid grid-cols-3 items-center gap-1 p-1 rounded-lg bg-muted/40 border overflow-hidden">
          <Button
            variant="ghost"
            size="sm"
            className={getTabButtonClass("active")}
            onClick={() => setThreadView(projectId, "active")}
          >
            Active
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={getTabButtonClass("archived")}
            onClick={() => setThreadView(projectId, "archived")}
          >
            Archived
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={getTabButtonClass("deleted")}
            onClick={() => setThreadView(projectId, "deleted")}
          >
            Deleted
          </Button>
        </div>
        {threadView === "deleted" && (
          <p className="text-xs text-muted-foreground">
            Deleted chats are retained for 30 days.
          </p>
        )}
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-2 p-3">
          {filteredThreads.map((thread) => (
            <div
              key={thread.id}
              className={cn(
                "group flex items-center gap-3 w-full p-3 rounded-xl border transition-all duration-200 cursor-pointer",
                activeThreadId === thread.id
                  ? "bg-primary/5 border-primary/20 shadow-sm"
                  : "bg-transparent border-transparent hover:bg-card hover:border-border/50 hover:shadow-sm",
                threadView === "deleted" &&
                  "cursor-default hover:bg-transparent hover:border-transparent hover:shadow-none",
              )}
              onClick={() => {
                if (threadView === "deleted") return;
                setActiveThreadId(projectId, thread.id);
                onCloseMobileSidebar?.();
              }}
            >
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                  activeThreadId === thread.id
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground group-hover:bg-primary/5 group-hover:text-primary",
                )}
              >
                <MessageSquare className="h-4 w-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div
                  className={cn(
                    "font-heading font-medium text-sm truncate transition-colors",
                    activeThreadId === thread.id
                      ? "text-primary"
                      : "text-foreground",
                  )}
                >
                  {thread.name || "Untitled"}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>{new Date(thread.updatedAt).toLocaleDateString()}</span>
                </div>
                {/* Mobile actions */}
                <div className="mt-1 md:hidden">
                  <ThreadActions
                    threadId={thread.id}
                    threadView={threadView}
                    compact={true}
                    onArchive={onArchiveThread}
                    onRestore={onRestoreThread}
                    onDelete={onDeleteThread}
                  />
                </div>
              </div>

              {/* Desktop actions */}
              <div className="hidden md:block ml-2 shrink-0">
                <ThreadActions
                  threadId={thread.id}
                  threadView={threadView}
                  compact={false}
                  onArchive={onArchiveThread}
                  onRestore={onRestoreThread}
                  onDelete={onDeleteThread}
                />
              </div>
            </div>
          ))}

          {filteredThreads.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">
                {threadView === "active"
                  ? "No active chats"
                  : threadView === "archived"
                    ? "No archived chats"
                    : "No deleted chats"}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
