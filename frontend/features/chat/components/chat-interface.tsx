"use client";
import { useEffect, useState } from "react";
import { logger } from "@/shared/utils/logger";

const log = logger.scope("ChatInterface");
import { useLiveQuery, invalidateQueries } from "@/hooks/use-live-query";
import { useChatRepository } from "@/features/chat/hooks/use-chat-repository";
import { Button } from "@/components/ui/button";
import { Sparkles, Menu } from "lucide-react";
import { useChatStore } from "@/store/use-chat-store";
import { ChatThread } from "./chat-thread";
import { toast } from "@/shared/utils/toast-service";
import { useConfirmation } from "@/hooks/use-confirmation";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { DecorativeGrid } from "@/components/ui/decorative-grid";
import { SettingsDialog } from "@/features/settings/components/SettingsDialog";
import { useHasAIConnection } from "@/hooks/use-has-ai-connection";
import { ChatSidebar } from "./chat-sidebar";

interface ChatInterfaceProps {
  projectId: string;
}

export function ChatInterface({ projectId }: ChatInterfaceProps) {
  const chatRepo = useChatRepository();
  const activeThreadId = useChatStore((state) =>
    state.getActiveThreadId(projectId),
  );
  const threadView = useChatStore((state) => state.getThreadView(projectId));
  const setActiveThreadId = useChatStore((state) => state.setActiveThreadId);
  const setThreadView = useChatStore((state) => state.setThreadView);
  const { confirm, ConfirmationDialog } = useConfirmation();
  const isMobile = useIsMobile();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const hasAIConnection = useHasAIConnection();

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

  useEffect(() => {
    if (!activeThreadId) return;
    if (!activeThreads || !archivedThreads || !deletedThreads) return;

    const existsInProject =
      activeThreads.some((thread) => thread.id === activeThreadId) ||
      archivedThreads.some((thread) => thread.id === activeThreadId) ||
      deletedThreads.some((thread) => thread.id === activeThreadId);

    if (!existsInProject) {
      setActiveThreadId(projectId, null);
    }
  }, [
    activeThreadId,
    activeThreads,
    archivedThreads,
    deletedThreads,
    projectId,
    setActiveThreadId,
  ]);

  const createNewThread = async () => {
    if (!hasAIConnection) {
      toast.info("Set up an AI connection before starting a new chat.");
      setSettingsOpen(true);
      return;
    }

    const newThread = await chatRepo.createThread({
      projectId,
      name: "New Chat",
    });
    invalidateQueries("chat");
    setThreadView(projectId, "active");
    setActiveThreadId(projectId, newThread.id);
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
        if (activeThreadId === threadId) setActiveThreadId(projectId, null);
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
          setActiveThreadId(projectId, null);
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
        setActiveThreadId(projectId, null);
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
      setThreadView(projectId, "active");
      setActiveThreadId(projectId, threadId);
      invalidateQueries("chat");
      toast.success("Chat restored");
    } catch (error) {
      log.error("Failed to restore chat:", error);
      toast.error("Failed to restore chat");
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-background/95 backdrop-blur-sm relative">
      {/* Mobile Header - Visible only on mobile */}
      <div className="flex items-center p-2 border-b border-border/50 bg-background/80 backdrop-blur-md z-30 md:hidden">
        <Sheet open={isSidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open chat sidebar">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[90vw] max-w-mobile-sheet">
            <ChatSidebar
              projectId={projectId}
              activeThreadId={activeThreadId}
              threadView={threadView}
              setThreadView={setThreadView}
              setActiveThreadId={setActiveThreadId}
              createNewThread={createNewThread}
              hasAIConnection={hasAIConnection}
              threads={threads ?? []}
              onArchiveThread={handleArchiveThread}
              onRestoreThread={handleRestoreThread}
              onDeleteThread={handleDeleteThread}
              onCloseMobileSidebar={() => setSidebarOpen(false)}
            />
          </SheetContent>
        </Sheet>
        <span className="ml-2 font-medium">AI Chat</span>
      </div>

      {/* Desktop Sidebar - Visible only on desktop */}
      <div className="hidden md:flex w-56 border-r border-border/50 flex-col bg-background/50 backdrop-blur-md">
        <ChatSidebar
          projectId={projectId}
          activeThreadId={activeThreadId}
          threadView={threadView}
          setThreadView={setThreadView}
          setActiveThreadId={setActiveThreadId}
          createNewThread={createNewThread}
          hasAIConnection={hasAIConnection}
          threads={threads ?? []}
          onArchiveThread={handleArchiveThread}
          onRestoreThread={handleRestoreThread}
          onDeleteThread={handleDeleteThread}
        />
      </div>

      {/* Chat Thread View */}
      <div className="flex-1 flex flex-col min-w-0 bg-background/30 relative h-full overflow-hidden">
        {/* Subtle background texture */}
        <DecorativeGrid />

        {activeThreadId ? (
          <ChatThread threadId={activeThreadId} projectId={projectId} />
        ) : (
          <div className="h-full">
            {!hasAIConnection && (
              <div className="mx-6 mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                <p>
                  No AI connection configured. Add a provider before starting
                  chat.
                </p>
                <Button
                  className="mt-3"
                  size="sm"
                  onClick={() => setSettingsOpen(true)}
                >
                  Set Up AI Connection
                </Button>
              </div>
            )}
            <EmptyState
              variant="hero"
              icon={<Sparkles className="h-10 w-10" />}
              title="AI Assistant"
              description="Select a chat from the sidebar or start a new conversation to brainstorm, outline, or write with AI."
              action={{
                label: hasAIConnection
                  ? "Start New Chat"
                  : "Set Up AI Connection",
                onClick: hasAIConnection
                  ? createNewThread
                  : () => setSettingsOpen(true),
                variant: hasAIConnection ? "outline" : "default",
              }}
            />
          </div>
        )}
      </div>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        hideTrigger
      />
      <ConfirmationDialog />
    </div>
  );
}
