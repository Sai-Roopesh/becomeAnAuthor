"use client";

import { useState, useRef, useEffect } from "react";
import { logger } from "@/shared/utils/logger";

const log = logger.scope("ChatThread");
import { useLiveQuery } from "@/hooks/use-live-query";
import { useChatRepository } from "@/features/chat/hooks/use-chat-repository";
import { useAI } from "@/hooks/use-ai";
import { useContextAssembly } from "@/hooks/use-context-assembly";
import { ChatSettingsDialog, ChatSettings } from "./chat-settings-dialog";
import { useChatStore } from "@/store/use-chat-store";
import { type ContextItem } from "@/features/shared/components";
import type { ChatContext } from "@/domain/entities/types";
import { toast } from "@/shared/utils/toast-service";
import { useConfirmation } from "@/hooks/use-confirmation";
import { storage } from "@/core/storage/safe-storage";
import { useAppServices } from "@/infrastructure/di/AppContext";
import { getPromptTemplate } from "@/shared/prompts/templates";
import { buildRollingMemory } from "@/features/chat/utils/chat-memory";
import type { AIModelMessage } from "@/lib/ai/client";

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
 * Orchestrates child components and manages state
 * Series-first: fetches project to get seriesId for context selection
 * Uses streaming AI responses via useAI hook
 */
export function ChatThread({ threadId }: ChatThreadProps) {
  const chatRepo = useChatRepository();
  const { setActiveThreadId } = useChatStore();
  const { confirm: confirmDelete, ConfirmationDialog } = useConfirmation();
  const { projectRepository: projectRepo } = useAppServices();

  // State
  const [message, setMessage] = useState("");
  const [selectedContexts, setSelectedContexts] = useState<ContextItem[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState("general");
  const [selectedModel, setSelectedModel] = useState("");
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

  // Streaming state
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null,
  );

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);

  // Data Queries
  const thread = useLiveQuery(() => chatRepo.get(threadId), [threadId]);
  const messages = useLiveQuery(
    () => chatRepo.getMessagesByThread(threadId),
    [threadId],
  );

  // Fetch project to get seriesId for context assembly
  const project = useLiveQuery(
    () =>
      thread?.projectId
        ? projectRepo.get(thread.projectId)
        : Promise.resolve(undefined),
    [thread?.projectId, projectRepo],
  );

  // Use unified AI hook for streaming
  const { generateStream, isGenerating, cancel, setModel } = useAI({
    persistModel: true,
    operationName: "Chat",
  });

  // Use context assembly hook
  const { assembleContextPack } = useContextAssembly(
    thread?.projectId || "",
    project?.seriesId,
  );

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load saved model
  useEffect(() => {
    if (thread) {
      const savedModel =
        thread.defaultModel || storage.getItem<string>("last_used_model", "");
      if (savedModel) {
        setSelectedModel(savedModel);
        setModel(savedModel);
        setSettings((prev) => ({ ...prev, model: savedModel }));
      }
    }
  }, [thread, setModel]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Handlers
  const handleSend = async (directMessage?: string) => {
    if (thread?.deletedAt) return;
    const messageToSend = directMessage || message;
    if (!messageToSend.trim() || isGenerating) return;

    const effectiveModel = selectedModel || settings.model;
    if (!effectiveModel) {
      toast.error("Please select a model to start chatting.");
      return;
    }

    // Build context from selections
    const context: ChatContext = {};
    selectedContexts.forEach((item) => {
      if (item.type === "novel") context.novelText = "full";
      if (item.type === "outline") context.novelText = "outline";
      if (item.type === "act" && item.id) {
        if (!context.acts) context.acts = [];
        context.acts.push(item.id);
      }
      if (item.type === "chapter" && item.id) {
        if (!context.chapters) context.chapters = [];
        context.chapters.push(item.id);
      }
      if (item.type === "scene" && item.id) {
        if (!context.scenes) context.scenes = [];
        context.scenes.push(item.id);
      }
      if (item.type === "codex" && item.id) {
        if (!context.codexEntries) context.codexEntries = [];
        context.codexEntries.push(item.id);
      }
    });

    // Check for existing last message to reuse (e.g. during regeneration)
    const allMessages = await chatRepo.getMessagesByThread(threadId);
    const lastMessage = allMessages[allMessages.length - 1];

    let userMessageId = crypto.randomUUID();
    let shouldCreateMessage = true;

    if (
      lastMessage &&
      lastMessage.role === "user" &&
      lastMessage.content === messageToSend.trim()
    ) {
      userMessageId = lastMessage.id;
      shouldCreateMessage = false;
      // Update existing message timestamp to now so it stays as "latest"
      await chatRepo.updateMessage(userMessageId, {
        ...(Object.keys(context).length > 0 ? { context } : {}),
        timestamp: Date.now(),
      });
    }

    const userMessage = {
      id: userMessageId,
      threadId,
      role: "user" as const,
      content: messageToSend.trim(),
      ...(Object.keys(context).length > 0 && { context }),
      timestamp: Date.now(),
    };

    setMessage("");
    if (shouldCreateMessage) {
      await chatRepo.createMessage(userMessage);
    }

    let aiMessageId: string | null = null;
    try {
      const priorMessages = await chatRepo.getMessagesByThread(threadId);
      const history = priorMessages.filter(
        (m) =>
          m.role !== "assistant" ||
          (m.role === "assistant" && m.content.trim().length > 0),
      );
      const conversationHistory = history.filter(
        (m) => m.timestamp < userMessage.timestamp,
      );

      const contextPack = await assembleContextPack(selectedContexts, {
        query: messageToSend.trim(),
        model: effectiveModel,
      });
      const template = getPromptTemplate(selectedPromptId);

      const modelMessages: AIModelMessage[] = [
        {
          role: "system",
          content:
            template?.systemPrompt || "You are a creative writing assistant.",
        },
      ];

      if (contextPack.serialized) {
        modelMessages.push({
          role: "system",
          content: [
            "Use the evidence blocks below as authoritative project context.",
            "Do not contradict facts from evidence blocks.",
            "If evidence is insufficient, ask a clarifying question before inventing details.",
            "",
            contextPack.serialized,
          ].join("\n"),
        });
      }

      const rollingMemory = buildRollingMemory(conversationHistory);
      if (rollingMemory.summaryMessage) {
        modelMessages.push(rollingMemory.summaryMessage);
      }
      modelMessages.push(...rollingMemory.recentMessages);
      modelMessages.push({ role: "user", content: messageToSend.trim() });

      if (contextPack.warningMessage) {
        toast.warning(contextPack.warningMessage);
      }

      // Create AI message placeholder for streaming
      aiMessageId = crypto.randomUUID();
      const aiMessage = {
        id: aiMessageId,
        threadId,
        role: "assistant" as const,
        content: "",
        model: effectiveModel,
        timestamp: Date.now(),
      };
      await chatRepo.createMessage(aiMessage);
      setStreamingMessageId(aiMessageId);
      setStreamingContent("");
      const streamMessageId = aiMessageId;

      // Stream the response
      let fullText = "";
      await generateStream(
        {
          model: effectiveModel,
          messages: modelMessages,
          maxTokens: settings.maxTokens,
          temperature: settings.temperature,
          topP: settings.topP,
          frequencyPenalty: settings.frequencyPenalty,
          presencePenalty: settings.presencePenalty,
        },
        {
          onChunk: (chunk) => {
            if (isMountedRef.current) {
              fullText += chunk;
              setStreamingContent(fullText);
            }
          },
          onComplete: async (completedText) => {
            if (isMountedRef.current) {
              await chatRepo.updateMessage(streamMessageId, {
                content: completedText,
              });
              setStreamingMessageId(null);
              setStreamingContent("");

              await chatRepo.updateThread(threadId, {
                updatedAt: Date.now(),
                defaultModel: effectiveModel,
              });
            }
          },
          onError: async (error) => {
            if (isMountedRef.current) {
              await chatRepo.updateMessage(streamMessageId, {
                content: `Error: ${error.message}`,
              });
              setStreamingMessageId(null);
              setStreamingContent("");
            }
          },
        },
      );
    } catch (error) {
      log.error("Chat error:", error);
      if (aiMessageId) {
        await chatRepo.updateMessage(aiMessageId, {
          content: `Error: ${error instanceof Error ? error.message : "Failed to generate response"}`,
        });
      }
      if (isMountedRef.current) {
        setStreamingMessageId(null);
        setStreamingContent("");
      }
      toast.error(
        error instanceof Error ? error.message : "Failed to generate response",
      );
    }
  };

  const handleRegenerateFrom = async (timestamp: number) => {
    if (!messages || isGenerating) return;

    const allMessages = await chatRepo.getMessagesByThread(threadId);
    const messagesToDelete = allMessages.filter(
      (m) => m.timestamp >= timestamp,
    );
    await Promise.all(
      messagesToDelete.map((m) => chatRepo.deleteMessage(m.id)),
    );

    const lastUserMessage = allMessages
      .filter((m) => m.timestamp < timestamp && m.role === "user")
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    if (lastUserMessage) {
      await handleSend(lastUserMessage.content);
    }
  };

  const handleNameChange = async (name: string) => {
    await chatRepo.updateThread(threadId, { name });
  };

  const handlePin = async () => {
    if (thread) {
      await chatRepo.updateThread(threadId, { pinned: !thread.pinned });
    }
  };

  const handleArchive = async () => {
    if (!thread) return;
    await chatRepo.updateThread(threadId, { archived: !thread.archived });
    setActiveThreadId(null);
  };

  const handleDelete = async () => {
    const confirmed = await confirmDelete({
      title: "Move Thread to Deleted",
      description:
        "This thread will move to Deleted and can be restored for 30 days.",
      confirmText: "Move to Deleted",
      variant: "destructive",
    });

    if (confirmed) {
      await chatRepo.deleteThread(threadId);
      setActiveThreadId(null);
    }
  };

  const handleExport = () => {
    if (!messages) return;
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

  const handleSuggestionClick = (suggestion: string) => {
    setMessage(suggestion);
    // Send on next tick after state update
    queueMicrotask(() => {
      handleSend(suggestion);
    });
  };

  if (!thread) {
    return (
      <div className="h-full flex items-center justify-center text-center text-muted-foreground p-6">
        <div>
          <p className="text-base font-medium text-foreground">
            Chat not available
          </p>
          <p className="text-sm mt-1">
            This thread may have been moved, deleted, or restored in another
            view.
          </p>
        </div>
      </div>
    );
  }

  const isDeleted = Boolean(thread.deletedAt);

  return (
    <div className="h-full flex flex-col">
      {/* Header Component */}
      <ChatHeader
        threadName={thread.name}
        isPinned={thread.pinned || false}
        isArchived={thread.archived}
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
          selectedModel={selectedModel}
          onModelChange={(model) => {
            setSelectedModel(model);
            setModel(model);
            setSettings((prev) => ({ ...prev, model }));
          }}
          showControls={showControls}
          onToggleControls={() => setShowControls(!showControls)}
        />
      )}

      {/* Message List Component */}
      <ChatMessageList
        messages={messages}
        isLoading={isGenerating}
        threadId={threadId}
        onRegenerateFrom={handleRegenerateFrom}
        messagesEndRef={messagesEndRef}
        streamingMessageId={streamingMessageId}
        streamingContent={streamingContent}
        onSuggestionClick={handleSuggestionClick}
      />

      {/* Input Component */}
      <ChatInput
        value={message}
        onChange={setMessage}
        onSend={() => handleSend()}
        disabled={isGenerating || isDeleted}
        isGenerating={isGenerating}
        onCancel={cancel}
      />

      {isDeleted && (
        <div className="border-t p-3 text-xs text-muted-foreground bg-muted/20">
          This thread is in Deleted. Restore it from the sidebar to continue.
        </div>
      )}

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
