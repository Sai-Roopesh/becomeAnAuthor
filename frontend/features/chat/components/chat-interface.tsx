"use client";
import { useState } from "react";
import { logger } from "@/shared/utils/logger";

const log = logger.scope("ChatInterface");
import { useLiveQuery, invalidateQueries } from "@/hooks/use-live-query";
import { useChatRepository } from "@/features/chat/hooks/use-chat-repository";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Search,
  Trash2,
  MessageSquare,
  Sparkles,
  Menu,
  Archive,
  RotateCcw,
} from "lucide-react";
import { useChatStore } from "@/store/use-chat-store";
import { ChatThread } from "./chat-thread";
import { toast } from "@/shared/utils/toast-service";
import { useConfirmation } from "@/hooks/use-confirmation";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { DecorativeGrid } from "@/components/ui/decorative-grid";
import { getEnabledConnections } from "@/lib/ai";

interface ChatInterfaceProps {
  projectId: string;
}

export function ChatInterface({ projectId }: ChatInterfaceProps) {
  const chatRepo = useChatRepository();
  const [searchQuery, setSearchQuery] = useState("");
  const { activeThreadId, setActiveThreadId, threadView, setThreadView } =
    useChatStore();
  const { confirm, ConfirmationDialog } = useConfirmation();
  const isMobile = useIsMobile();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const hasAIConnection = getEnabledConnections().length > 0;

  const activeThreads = useLiveQuery(
    () => chatRepo.getActiveThreads(projectId),
    [projectId],
    { keys: "chat" },
  );
  const archivedThreads = useLiveQuery(
    () => chatRepo.getArchivedThreads(projectId),
    [projectId],
    { keys: "chat" },
  );
  const deletedThreads = useLiveQuery(
    () => chatRepo.getDeletedThreads(projectId),
    [projectId],
    { keys: "chat" },
  );

  const threadsByView = {
    active: activeThreads ?? [],
    archived: archivedThreads ?? [],
    deleted: deletedThreads ?? [],
  };
  const threads = threadsByView[threadView];

  const createNewThread = async () => {
    const newThread = await chatRepo.createThread({
      projectId,
      name: "New Chat",
    });
    invalidateQueries("chat");
    setThreadView("active");
    setActiveThreadId(newThread.id);
    if (isMobile) setSidebarOpen(false);
  };

  const handleDeleteThread = async (threadId: string) => {
    if (threadView === "deleted") {
      const purgeConfirmed = await confirm({
        title: "Permanently Delete Chat",
        description:
          "This permanently removes this chat and all messages. This cannot be undone.",
        confirmText: "Delete Permanently",
        variant: "destructive",
      });

      if (!purgeConfirmed) return;
      try {
        await chatRepo.purgeThread(threadId);
        if (activeThreadId === threadId) setActiveThreadId(null);
        invalidateQueries("chat");
        toast.success("Chat permanently deleted");
      } catch (error) {
        log.error("Failed to purge chat:", error);
        toast.error("Failed to permanently delete chat");
      }
      return;
    }

    const confirmed = await confirm({
      title: "Move Chat to Deleted",
      description:
        "This chat will move to Deleted and can be restored for 30 days.",
      confirmText: "Move to Deleted",
      variant: "destructive",
    });

    if (confirmed) {
      try {
        await chatRepo.deleteThread(threadId);

        if (activeThreadId === threadId) {
          setActiveThreadId(null);
        }
        invalidateQueries("chat");
        toast.success("Chat moved to Deleted");
      } catch (error) {
        log.error("Failed to delete chat:", error);
        const message =
          error instanceof Error ? error.message : "Unknown error";
        toast.error(`Failed to delete chat: ${message}`);
      }
    }
  };

  const handleArchiveThread = async (threadId: string) => {
    try {
      await chatRepo.updateThread(threadId, { archived: true });
      if (activeThreadId === threadId) {
        setActiveThreadId(null);
      }
      invalidateQueries("chat");
      toast.success("Chat moved to Archived");
    } catch (error) {
      log.error("Failed to archive chat:", error);
      toast.error("Failed to archive chat");
    }
  };

  const handleRestoreThread = async (threadId: string) => {
    try {
      await chatRepo.restoreThread(threadId);
      setThreadView("active");
      setActiveThreadId(threadId);
      invalidateQueries("chat");
      toast.success("Chat restored");
    } catch (error) {
      log.error("Failed to restore chat:", error);
      toast.error("Failed to restore chat");
    }
  };

  const filteredThreads = threads?.filter((t) =>
    (t.name || "Untitled").toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const tabButtonClass = (view: "active" | "archived" | "deleted") =>
    cn(
      "flex-1 h-8 text-xs",
      threadView === view
        ? "bg-background border shadow-sm text-foreground"
        : "text-muted-foreground",
    );

  const SidebarContent = (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border/50 space-y-4">
        <Button
          onClick={createNewThread}
          className="w-full shadow-sm bg-primary/90 hover:bg-primary transition-all"
          size="default"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
        <div className="relative group">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-muted/50 border-transparent focus:bg-background transition-all"
          />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/40 border">
          <Button
            variant="ghost"
            size="sm"
            className={tabButtonClass("active")}
            onClick={() => setThreadView("active")}
          >
            Active
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={tabButtonClass("archived")}
            onClick={() => setThreadView("archived")}
          >
            Archived
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={tabButtonClass("deleted")}
            onClick={() => setThreadView("deleted")}
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
                setActiveThreadId(thread.id);
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
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                {threadView === "active" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 hover:bg-muted"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleArchiveThread(thread.id);
                    }}
                    title="Archive chat"
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </Button>
                )}
                {(threadView === "archived" || threadView === "deleted") && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 hover:bg-muted"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleRestoreThread(thread.id);
                    }}
                    title="Restore chat"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive -mr-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleDeleteThread(thread.id);
                  }}
                  title={
                    threadView === "deleted"
                      ? "Delete permanently"
                      : "Move to Deleted"
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
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

  return (
    <div className="h-full flex flex-col md:flex-row bg-background/95 backdrop-blur-sm relative">
      {/* Mobile Header */}
      {isMobile && (
        <div className="flex items-center p-2 border-b border-border/50 bg-background/80 backdrop-blur-md z-30 md:hidden">
          <Sheet open={isSidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[85vw] sm:w-popover">
              {SidebarContent}
            </SheetContent>
          </Sheet>
          <span className="ml-2 font-medium">AI Chat</span>
        </div>
      )}

      {/* Desktop Sidebar */}
      {!isMobile && (
        <div className="w-56 border-r border-border/50 flex flex-col bg-background/50 backdrop-blur-md">
          {SidebarContent}
        </div>
      )}

      {/* Chat Thread View */}
      <div className="flex-1 flex flex-col min-w-0 bg-background/30 relative h-full overflow-hidden">
        {/* Subtle background texture */}
        <DecorativeGrid />

        {activeThreadId ? (
          <ChatThread threadId={activeThreadId} />
        ) : (
          <div className="h-full">
            {!hasAIConnection && (
              <div className="mx-6 mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                No AI connection configured. Open Settings and add an AI
                provider before starting chat.
              </div>
            )}
            <EmptyState
              variant="hero"
              icon={<Sparkles className="h-10 w-10" />}
              title="AI Assistant"
              description="Select a chat from the sidebar or start a new conversation to brainstorm, outline, or write with AI."
              action={{
                label: "Start New Chat",
                onClick: createNewThread,
                variant: "outline",
              }}
            />
          </div>
        )}
      </div>

      <ConfirmationDialog />
    </div>
  );
}
