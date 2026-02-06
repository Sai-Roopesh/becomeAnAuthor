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
    system:
      "You are a creative writing assistant helping authors craft their stories.",
    persistModel: true,
    operationName: "Chat",
  });

  // Use context assembly hook
  const { assembleContext } = useContextAssembly(thread?.projectId || "");

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

    const userMessage = {
      id: crypto.randomUUID(),
      threadId,
      role: "user" as const,
      content: messageToSend.trim(),
      ...(Object.keys(context).length > 0 && { context }),
      timestamp: Date.now(),
    };

    setMessage("");
    await chatRepo.createMessage(userMessage);

    // Create AI message placeholder for streaming
    const aiMessageId = crypto.randomUUID();
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

    try {
      // Build context text
      const contextText = await assembleContext(selectedContexts);
      const template = getPromptTemplate(selectedPromptId);

      // Build system prompt with context
      let systemPrompt =
        template?.systemPrompt || "You are a creative writing assistant.";
      if (contextText) {
        systemPrompt += `

=== CONTEXT ===
${contextText}`;
      }

      // Stream the response
      let fullText = "";
      await generateStream(
        {
          prompt: messageToSend.trim(),
          context: systemPrompt,
          maxTokens: settings.maxTokens,
          temperature: settings.temperature,
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
              await chatRepo.updateMessage(aiMessageId, {
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
              await chatRepo.updateMessage(aiMessageId, {
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
      if (isMountedRef.current) {
        await chatRepo.updateMessage(aiMessageId, {
          content: `Error: ${error instanceof Error ? error.message : "Failed to generate response"}`,
        });
        setStreamingMessageId(null);
        setStreamingContent("");
      }
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
    await chatRepo.updateThread(threadId, { archived: true });
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
        disabled={isGenerating}
        isGenerating={isGenerating}
        onCancel={cancel}
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
