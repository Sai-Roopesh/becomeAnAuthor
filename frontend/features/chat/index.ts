// Public API for chat feature
import { withErrorBoundary } from "@/features/shared/components";

// Components
export { ChatThread } from "./components/chat-thread";
export { ChatMessage } from "./components/chat-message";

// Wrap ChatInterface with ErrorBoundary for resilient error handling
import { ChatInterface as ChatInterfaceBase } from "./components/chat-interface";
export const ChatInterface = withErrorBoundary(ChatInterfaceBase, {
  name: "Chat Interface",
  maxRetries: 3,
});

// Hooks
export { useChatRepository } from "./hooks/use-chat-repository";
