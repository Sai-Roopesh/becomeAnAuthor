"use client";

import { MessageSquare, Plus, Search, Archive, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ChatThread } from "@/domain/entities/types";

interface ChatSidebarProps {
  projectId: string;
  hasAIConnection: boolean;
  activeThreadId: string | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  threadView: "active" | "archived" | "deleted";
  setThreadView: (projectId: string, view: "active" | "archived" | "deleted") => void;
  setActiveThreadId: (projectId: string, id: string | null) => void;
  isMobile: boolean;
  setSidebarOpen: (open: boolean) => void;
  onCreateThread: () => Promise<void>;
  onArchiveThread: (threadId: string) => Promise<void>;
  onRestoreThread: (threadId: string) => Promise<void>;
  onDeleteThread: (threadId: string) => Promise<void>;
  threads: ChatThread[];
}

export function ChatSidebar({
  projectId,
  hasAIConnection,
  activeThreadId,
  searchQuery,
  setSearchQuery,
  threadView,
  setThreadView,
  setActiveThreadId,
  isMobile,
  setSidebarOpen,
  onCreateThread,
  onArchiveThread,
  onRestoreThread,
  onDeleteThread,
  threads,
}: ChatSidebarProps) {
  const filteredThreads = threads?.filter((t) =>
    (t.name || "Untitled").toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const renderThreadActions = (threadId: string, compact = false) => (
    <>
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
            void onArchiveThread(threadId);
          }}
          title="Archive chat"
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
            void onRestoreThread(threadId);
          }}
          title="Restore chat"
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
          void onDeleteThread(threadId);
        }}
        title={
          threadView === "deleted" ? "Delete permanently" : "Move to Deleted"
        }
      >
        {!compact && <Trash2 className="h-3.5 w-3.5" />}
        {compact && (threadView === "deleted" ? "Delete" : "Move to Deleted")}
      </Button>
    </>
  );

  const tabButtonClass = (view: "active" | "archived" | "deleted") =>
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
          onClick={onCreateThread}
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
            className={tabButtonClass("active")}
            onClick={() => setThreadView(projectId, "active")}
          >
            Active
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={tabButtonClass("archived")}
            onClick={() => setThreadView(projectId, "archived")}
          >
            Archived
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={tabButtonClass("deleted")}
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

      <ScrollArea className="flex-1 p-3">
        <div className="space-y-2">
          {filteredThreads?.map((thread) => (
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
                if (isMobile) setSidebarOpen(false);
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
                {isMobile && (
                  <div className="mt-1 flex items-center gap-1">
                    {renderThreadActions(thread.id, true)}
                  </div>
                )}
              </div>

              {/* Responsive actions container: Use w-auto and ml-auto */}
              <div className="ml-auto w-auto hidden shrink-0 items-center justify-end gap-1 md:flex">
                {renderThreadActions(thread.id)}
              </div>
            </div>
          ))}

          {filteredThreads?.length === 0 && (
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
