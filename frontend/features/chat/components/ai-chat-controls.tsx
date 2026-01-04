"use client";

import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon } from "lucide-react";
import {
  ContextSelector,
  type ContextItem,
} from "@/features/shared/components";
import { PromptSelector } from "./prompt-selector";
import { ModelSelector } from "@/features/ai";

interface AIChatControlsProps {
  projectId: string;
  seriesId: string; // Required - series-first architecture
  selectedContexts: ContextItem[];
  onContextsChange: (contexts: ContextItem[]) => void;
  selectedPromptId: string;
  onPromptChange: (promptId: string) => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  onOpenSettings: () => void;
}

/**
 * Controls panel for AI Chat - context, prompt, and model selection.
 * Extracted from AIChat for better maintainability.
 * Series-first: requires seriesId for context selection
 */
export function AIChatControls({
  projectId,
  seriesId,
  selectedContexts,
  onContextsChange,
  selectedPromptId,
  onPromptChange,
  selectedModel,
  onModelChange,
  onOpenSettings,
}: AIChatControlsProps) {
  return (
    <div className="p-4 space-y-3 border-b">
      {/* Context Selector */}
      <ContextSelector
        projectId={projectId}
        seriesId={seriesId}
        selectedContexts={selectedContexts}
        onContextsChange={onContextsChange}
      />

      {/* Prompt and Model Row */}
      <div className="flex gap-2">
        <div className="flex-1">
          <PromptSelector
            value={selectedPromptId}
            onValueChange={onPromptChange}
          />
        </div>
        <div className="flex-1">
          <ModelSelector value={selectedModel} onValueChange={onModelChange} />
        </div>
        <Button variant="outline" size="sm" onClick={onOpenSettings}>
          <SettingsIcon className="h-4 w-4 mr-2" />
          Tweak
        </Button>
      </div>
    </div>
  );
}
