"use client";

import { Button } from "@/components/ui/button";
import {
  ContextSelector,
  type ContextItem,
} from "@/features/shared/components";
import { PromptSelector } from "./prompt-selector";
import { ModelSelector } from "@/features/ai";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ChatControlsProps {
  projectId: string;
  seriesId: string; // Required - series-first architecture
  selectedContexts: ContextItem[];
  onContextChange: (contexts: ContextItem[]) => void;
  selectedPromptId: string;
  onPromptChange: (promptId: string) => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  showControls: boolean;
  onToggleControls: () => void;
}

/**
 * Chat Controls Component
 * Handles context selection, prompt selection, and model configuration
 * Series-first: requires seriesId for context selection
 */
export function ChatControls({
  projectId,
  seriesId,
  selectedContexts,
  onContextChange,
  selectedPromptId,
  onPromptChange,
  selectedModel,
  onModelChange,
  showControls,
  onToggleControls,
}: ChatControlsProps) {
  const modelConfigured = Boolean(selectedModel.trim());

  return (
    <div className="border-b">
      <div className="p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleControls}
          className="w-full justify-between"
        >
          <span>Chat Configuration</span>
          {!modelConfigured && (
            <span className="mr-2 text-2xs font-medium text-destructive">
              Setup required
            </span>
          )}
          {showControls ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {showControls && (
        <div className="p-4 pt-0 space-y-4 border-t">
          {!modelConfigured && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
              Select an AI model to enable sending messages.
            </p>
          )}
          {/* Context Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Context</label>
            <ContextSelector
              projectId={projectId}
              seriesId={seriesId}
              selectedContexts={selectedContexts}
              onContextsChange={onContextChange}
            />
          </div>

          {/* Prompt Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Prompt Template
            </label>
            <PromptSelector
              value={selectedPromptId}
              onValueChange={onPromptChange}
            />
          </div>

          {/* Model Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">AI Model</label>
            <ModelSelector
              value={selectedModel}
              onValueChange={onModelChange}
            />
          </div>
        </div>
      )}
    </div>
  );
}
