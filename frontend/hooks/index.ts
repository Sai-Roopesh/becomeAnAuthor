"use client";

/**
 * Hooks barrel file
 * Re-exports all hooks for convenient imports
 *
 * @example
 * import { useAI, useCodexRepository, useLiveQuery } from '@/hooks';
 */

// AI & Generation
export { useAI } from "./use-ai";
export type { UseAIOptions, GenerateOptions, StreamCallbacks } from "./use-ai";

// Collaboration
export { useCollaboration } from "./use-collaboration";

// Context & Assembly
export { useContextAssembly } from "./use-context-assembly";

// Dialogs
export { useConfirmation } from "./use-confirmation";
export { usePrompt } from "./use-prompt";
export {
  useDialogState,
  textReplaceReducer,
  tweakGenerateReducer,
  continueWritingReducer,
  textSelectionReducer,
} from "./use-dialog-state";
export type {
  TextReplaceState,
  TextReplaceAction,
  TweakGenerateState,
  TweakGenerateAction,
  ContinueWritingState,
  ContinueWritingAction,
  TextSelectionState,
  TextSelectionAction,
} from "./use-dialog-state";

// External Services
export { useGoogleAuth } from "@/features/google-drive/hooks/use-google-auth";
export { useGoogleDrive } from "@/features/google-drive/hooks/use-google-drive";
export { useModelDiscovery } from "./use-model-discovery";

// Import/Export
export { useDocumentExport } from "./use-document-export";
export { useImportExport } from "./use-import-export";

// Project & Node Management
export { useOpenProject } from "./use-open-project";

// Data Fetching
export { useLiveQuery, invalidateQueries } from "./use-live-query";
export { useMentions } from "./use-mentions";

// Utilities
export { useDebounce } from "./use-debounce";
export { useIsMobile } from "./use-mobile";
export { useQuickCapture } from "./use-quick-capture";

// Repository Hooks
export { useRepository } from "./use-repository";
export { useChatRepository } from "@/features/chat/hooks/use-chat-repository";
export { useCodexRepository } from "./use-codex-repository";
export { useCodexRelationTypeRepository } from "./use-codex-relation-type-repository";
export { useCodexTagRepository } from "./use-codex-tag-repository";
export { useCodexTemplateRepository } from "./use-codex-template-repository";
export { useNodeRepository } from "./use-node-repository";
export { useProjectRepository } from "./use-project-repository";
export { useSceneCodexLinkRepository } from "./use-scene-codex-link-repository";
export { useSeriesRepository } from "./use-series-repository";
export { useSnippetRepository } from "./use-snippet-repository";
