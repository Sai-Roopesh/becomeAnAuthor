"use client";

import { useState, useRef, useEffect } from "react";
import { useLiveQuery, invalidateQueries } from "@/hooks/use-live-query";
import { useChatRepository } from "@/features/chat/hooks/use-chat-repository";
import { useChat } from "@/hooks/use-chat";
import { ChatSettingsDialog, ChatSettings } from "./chat-settings-dialog";
import { useChatStore } from "@/store/use-chat-store";
import { useConfirmation } from "@/hooks/use-confirmation";
import { useAppServices } from "@/infrastructure/di/AppContext";

// Import child components
import { ChatHeader } from "./chat-header";
import { ChatControls } from "./chat-controls";
import { ChatMessageList } from "./chat-message-list";
import { ChatInput } from "./chat-input";

interface ChatThreadProps {
  threadId: string;
}

/**
 * Chat Thread - Main Coordinator Component
 * Orchestrates child components using the useChat hook for state management.
 * Series-first: fetches project to get seriesId for context selection.
 */
export function ChatThread({ threadId }: ChatThreadProps) {
  const chatRepo = useChatRepository();
  const { setActiveThreadId } = useChatStore();
  const { confirm: confirmDelete, ConfirmationDialog } = useConfirmation();
  const { projectRepository: projectRepo } = useAppServices();

  // UI state (not related to chat messages)
  const [selectedPromptId, setSelectedPromptId] = useState("general");
  const [showSettings, setShowSettings] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [settings, setSettings] = useState<ChatSettings>({
    model: "",
    temperature: 0.7,
    maxTokens: 2000,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
  });

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Data Queries
  const thread = useLiveQuery(() => chatRepo.get(threadId), [threadId]);

  // Fetch project to get seriesId for context assembly
  const project = useLiveQuery(
    () =>
      thread?.projectId
        ? projectRepo.get(thread.projectId)
        : Promise.resolve(undefined),
    [thread?.projectId, projectRepo],
  );

  // Use the new useChat hook for all chat state management
  const {
    messages,
    input,
    setInput,
    handleSubmit,
    append,
    isLoading,
    stop,
    reload,
    model,
    setModel,
    streamingContent,
    streamingMessageId,
    selectedContexts,
    setSelectedContexts,
  } = useChat({
    threadId,
    projectId: thread?.projectId,
    seriesId: project?.seriesId,
    initialModel: thread?.defaultModel,
    promptId: selectedPromptId,
    maxTokens: settings.maxTokens,
    temperature: settings.temperature,
  });

  // Sync settings model with useChat model
  useEffect(() => {
    if (model) {
      setSettings((prev) => ({ ...prev, model }));
    }
  }, [model]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Thread action handlers
  const handleNameChange = async (name: string) => {
    await chatRepo.updateThread(threadId, { name });
    invalidateQueries();
  };

  const handlePin = async () => {
    if (thread) {
      await chatRepo.updateThread(threadId, { pinned: !thread.pinned });
      invalidateQueries();
    }
  };

  const handleArchive = async () => {
    await chatRepo.updateThread(threadId, { archived: true });
    invalidateQueries();
    setActiveThreadId(null);
  };

  const handleDelete = async () => {
    const confirmed = await confirmDelete({
      title: "Delete Thread",
      description:
        "Are you sure you want to delete this chat thread? All messages will be permanently removed.",
      confirmText: "Delete",
      variant: "destructive",
    });

    if (confirmed) {
      await chatRepo.deleteThread(threadId);
      invalidateQueries();
      setActiveThreadId(null);
    }
  };

  const handleExport = () => {
    if (!messages || messages.length === 0) return;
    const markdown = messages
      .map((m) => `**${m.role === "user" ? "You" : "AI"}**: ${m.content}\n\n`)
      .join("");
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${thread?.name || "chat"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRegenerateFrom = async (timestamp: number) => {
    if (isLoading) return;

    // Delete messages from timestamp onwards
    const messagesToDelete = messages.filter((m) => m.timestamp >= timestamp);
    for (const m of messagesToDelete) {
      await chatRepo.deleteMessage(m.id);
    }
    invalidateQueries();

    // Find the last user message before the timestamp and resend
    const lastUserMessage = messages
      .filter((m) => m.timestamp < timestamp && m.role === "user")
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    if (lastUserMessage) {
      await append(lastUserMessage.content);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    append(suggestion);
  };

  const handleModelChange = (newModel: string) => {
    setModel(newModel);
    setSettings((prev) => ({ ...prev, model: newModel }));
  };

  if (!thread) return null;

  return (
    <div className="h-full flex flex-col">
      {/* Header Component */}
      <ChatHeader
        threadName={thread.name}
        isPinned={thread.pinned || false}
        onNameChange={handleNameChange}
        onPin={handlePin}
        onArchive={handleArchive}
        onExport={handleExport}
        onDelete={handleDelete}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Controls Component */}
      {project && (
        <ChatControls
          projectId={thread.projectId}
          seriesId={project.seriesId}
          selectedContexts={selectedContexts}
          onContextChange={setSelectedContexts}
          selectedPromptId={selectedPromptId}
          onPromptChange={setSelectedPromptId}
          selectedModel={model}
          onModelChange={handleModelChange}
          showControls={showControls}
          onToggleControls={() => setShowControls(!showControls)}
        />
      )}

      {/* Message List Component */}
      <ChatMessageList
        messages={messages}
        isLoading={isLoading}
        threadId={threadId}
        onRegenerateFrom={handleRegenerateFrom}
        messagesEndRef={messagesEndRef}
        streamingMessageId={streamingMessageId}
        streamingContent={streamingContent}
        onSuggestionClick={handleSuggestionClick}
      />

      {/* Input Component */}
      <ChatInput
        value={input}
        onChange={setInput}
        onSend={handleSubmit}
        disabled={isLoading}
        isGenerating={isLoading}
        onCancel={stop}
      />

      {/* Settings Dialog */}
      <ChatSettingsDialog
        open={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSettingsChange={setSettings}
      />

      <ConfirmationDialog />
    </div>
  );
}
