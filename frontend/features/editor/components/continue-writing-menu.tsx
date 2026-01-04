'use client';

import { useEffect, memo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Sparkles, Wand2, BookOpen, Settings2, Brain } from 'lucide-react';
import { TweakGenerateDialog, GenerateOptions } from './tweak-generate-dialog';
import { ModelSelector } from '@/components/model-selector';
import { storage } from '@/core/storage/safe-storage';
import {
    useDialogState,
    continueWritingReducer,
    initialContinueWritingState
} from '@/hooks/use-dialog-state';

type GenerationMode = 'scene-beat' | 'continue-writing' | 'codex-progression';

interface ContinueWritingMenuProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onGenerate: (options: GenerateOptions & { mode: GenerationMode }) => void;
    projectId: string;
    seriesId: string;  // Required - series-first architecture
    isGenerating?: boolean;
    onCancel?: () => void;
    position?: { x: number; y: number } | null; // NEW: cursor position
}

export const ContinueWritingMenu = memo(function ContinueWritingMenu({ open, onOpenChange, onGenerate, projectId, seriesId, isGenerating, onCancel, position }: ContinueWritingMenuProps) {
    // Replace 4 useState calls with single useReducer
    const [state, dispatch] = useDialogState(
        initialContinueWritingState,
        continueWritingReducer
    );

    useEffect(() => {
        // Load default model from AI connections with safe parsing
        interface AIConnection {
            enabled: boolean;
            models?: string[];
        }
        const connections = storage.getItem<AIConnection[]>('ai_connections', []);
        const allModels = connections
            .filter((c) => c.enabled)
            .flatMap((c) => c.models || []);

        if (allModels.length > 0 && !state.model && allModels[0]) {
            dispatch({ type: 'SET_MODEL', payload: allModels[0] });
        } else if (!state.model && allModels.length === 0) {
            // No AI connections configured - try last used
            const lastUsed = storage.getItem<string>('last_used_model', '');
            if (lastUsed) {
                dispatch({ type: 'SET_MODEL', payload: lastUsed });
            }
        }

    }, [state.model, dispatch]);

    const handleModeSelect = (mode: GenerationMode) => {
        dispatch({ type: 'SET_MODE', payload: mode });
    };

    const handleQuickGenerate = () => {
        onGenerate({
            wordCount: parseInt(state.wordCount),
            instructions: getModeInstructions(state.selectedMode),
            context: {},
            model: state.model || storage.getItem<string>('last_used_model', 'openai/gpt-3.5-turbo'),
            mode: state.selectedMode,
            reasoning: state.reasoning, // NEW: Pass reasoning toggle
        });
        // Keep popover open so user can see loading state and cancel if needed
    };

    const handleTweakAndGenerate = () => {
        dispatch({ type: 'OPEN_TWEAK_DIALOG' });
        // Keep menu open until user explicitly closes or generation completes
    };

    const getModeInstructions = (mode: GenerationMode): string => {
        switch (mode) {
            case 'scene-beat':
                return 'Generate a pivotal scene beat - a key moment where something important changes, driving the narrative forward.';
            case 'continue-writing':
                return 'Continue the story naturally from the current context.';
            case 'codex-progression':
                return 'Analyze recent events and suggest updates for Codex entries.';
            default:
                return '';
        }
    };

    return (
        <>
            <Popover open={open} onOpenChange={onOpenChange}>
                <PopoverTrigger asChild>
                    {/* Invisible anchor positioned at cursor */}
                    <div
                        style={position ? {
                            position: 'fixed',
                            left: position.x,
                            top: position.y,
                            width: 1,
                            height: 1,
                            pointerEvents: 'none',
                        } : undefined}
                    />
                </PopoverTrigger>
                <PopoverContent className="w-80" align="start" sideOffset={4}>
                    <div className="space-y-3">
                        <div>
                            <h4 className="font-medium text-sm mb-3">AI</h4>

                            {/* Scene Beat */}
                            <button
                                onClick={() => handleModeSelect('scene-beat')}
                                className={`w-full p-3 rounded-md transition-colors text-left ${state.selectedMode === 'scene-beat' ? 'bg-accent' : 'hover:bg-accent'
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <Wand2 className="h-5 w-5 mt-0.5" />
                                    <div>
                                        <div className="font-medium text-sm">SCENE BEAT</div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            A pivotal moment where something important changes, driving the narrative forward.
                                        </div>
                                    </div>
                                </div>
                            </button>

                            {/* Continue Writing */}
                            <button
                                onClick={() => handleModeSelect('continue-writing')}
                                className={`w-full p-3 rounded-md transition-colors text-left ${state.selectedMode === 'continue-writing' ? 'bg-accent' : 'hover:bg-accent'
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <Sparkles className="h-5 w-5 mt-0.5" />
                                    <div>
                                        <div className="font-medium text-sm">CONTINUE WRITING</div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            Creates a new scene beat to continue writing.
                                        </div>
                                    </div>
                                </div>
                            </button>
                        </div>

                        <div className="pt-2 border-t">
                            <h4 className="font-medium text-sm mb-3">Codex</h4>

                            {/* Codex Progression */}
                            <button
                                onClick={() => handleModeSelect('codex-progression')}
                                className={`w-full p-3 rounded-md transition-colors text-left ${state.selectedMode === 'codex-progression' ? 'bg-accent' : 'hover:bg-accent'
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <BookOpen className="h-5 w-5 mt-0.5" />
                                    <div>
                                        <div className="font-medium text-sm">CODEX PROGRESSION</div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            Add additional information about the world, characters, or events to track your story arcs.
                                        </div>
                                    </div>
                                </div>
                            </button>
                        </div>

                        <div className="pt-2 border-t text-xs text-muted-foreground">
                            <p className="mb-2">
                                {state.selectedMode === 'scene-beat' ? 'Generate a scene beat.' :
                                    state.selectedMode === 'continue-writing' ? 'Continue the story.' :
                                        'Analyze story progression.'}
                            </p>
                            <div className="flex gap-2 mb-2">
                                <Button
                                    variant={state.wordCount === '200' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => dispatch({ type: 'SET_WORD_COUNT', payload: '200' })}
                                >
                                    200
                                </Button>
                                <Button
                                    variant={state.wordCount === '400' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => dispatch({ type: 'SET_WORD_COUNT', payload: '400' })}
                                >
                                    400
                                </Button>
                                <Button
                                    variant={state.wordCount === '600' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => dispatch({ type: 'SET_WORD_COUNT', payload: '600' })}
                                >
                                    600
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleTweakAndGenerate}
                                >
                                    <Settings2 className="h-3 w-3 mr-1" />
                                    Tweak...
                                </Button>
                            </div>

                            <div className="mb-3">
                                <ModelSelector
                                    value={state.model}
                                    onValueChange={(value) => dispatch({ type: 'SET_MODEL', payload: value })}
                                    className="h-8 text-xs"
                                />
                            </div>

                            {/* Reasoning Toggle */}
                            <div className="flex items-center justify-between mb-3 px-1">
                                <div className="flex items-center gap-2">
                                    <Brain className="h-4 w-4 text-muted-foreground" />
                                    <Label htmlFor="reasoning-toggle" className="text-xs">
                                        Deep Thinking
                                    </Label>
                                </div>
                                <Switch
                                    id="reasoning-toggle"
                                    checked={state.reasoning === 'enabled'}
                                    onCheckedChange={(checked) =>
                                        dispatch({ type: 'SET_REASONING', payload: checked ? 'enabled' : 'disabled' })
                                    }
                                />
                            </div>
                            <p className="text-xs text-muted-foreground mb-3 px-1">
                                {state.reasoning === 'enabled'
                                    ? 'Better quality, slower generation'
                                    : 'Faster generation, simpler reasoning'}
                            </p>

                            <div className="flex gap-2">
                                {!isGenerating ? (
                                    <>
                                        <Button size="sm" onClick={handleQuickGenerate} className="flex-1">
                                            <Sparkles className="h-3 w-3 mr-1" />
                                            Generate
                                        </Button>
                                        <Button variant="ghost" size="sm">
                                            Clear Beat
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={onCancel}
                                        className="flex-1"
                                    >
                                        Cancel Generation
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>

            {state.showTweakDialog && (
                <TweakGenerateDialog
                    open={state.showTweakDialog}
                    onOpenChange={(open) => dispatch({ type: open ? 'OPEN_TWEAK_DIALOG' : 'CLOSE_TWEAK_DIALOG' })}
                    onGenerate={(options) => onGenerate({ ...options, mode: state.selectedMode })}
                    defaultWordCount={parseInt(state.wordCount)}
                    mode={state.selectedMode}
                    projectId={projectId}
                    seriesId={seriesId}
                />
            )}
        </>
    );
});
