'use client';

import { Button } from '@/components/ui/button';
import { ContextSelector, ContextItem } from '../context-selector';
import { PromptSelector } from '../prompt-selector';
import { ModelSelector } from '@/components/ai/model-selector';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ChatControlsProps {
    projectId: string;
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
 */
export function ChatControls({
    projectId,
    selectedContexts,
    onContextChange,
    selectedPromptId,
    onPromptChange,
    selectedModel,
    onModelChange,
    showControls,
    onToggleControls,
}: ChatControlsProps) {
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
                    {showControls ? (
                        <ChevronUp className="h-4 w-4" />
                    ) : (
                        <ChevronDown className="h-4 w-4" />
                    )}
                </Button>
            </div>

            {showControls && (
                <div className="p-4 pt-0 space-y-4 border-t">
                    {/* Context Selection */}
                    <div>
                        <label className="text-sm font-medium mb-2 block">
                            Context
                        </label>
                        <ContextSelector
                            projectId={projectId}
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
                        <label className="text-sm font-medium mb-2 block">
                            AI Model
                        </label>
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
