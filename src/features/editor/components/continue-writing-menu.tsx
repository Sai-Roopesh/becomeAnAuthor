'use client';

import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Sparkles, Wand2, BookOpen, Settings2 } from 'lucide-react';
import { TweakGenerateDialog, GenerateOptions } from './tweak-generate-dialog';
import { ModelCombobox } from '@/features/ai/components/model-combobox';
import { storage } from '@/lib/safe-storage';

type GenerationMode = 'scene-beat' | 'continue-writing' | 'codex-progression';

interface ContinueWritingMenuProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onGenerate: (options: GenerateOptions & { mode: GenerationMode }) => void;
    projectId: string;
    isGenerating?: boolean; // NEW: track generation state
    onCancel?: () => void; // NEW: cancel handler
}

export function ContinueWritingMenu({ open, onOpenChange, onGenerate, projectId, isGenerating, onCancel }: ContinueWritingMenuProps) {
    const [wordCount, setWordCount] = useState('400');
    const [model, setModel] = useState('');
    const [showTweakDialog, setShowTweakDialog] = useState(false);
    const [selectedMode, setSelectedMode] = useState<GenerationMode>('continue-writing');

    useEffect(() => {
        // Load default model from AI connections with safe parsing
        const connections = storage.getItem<any[]>('ai_connections', []);
        const allModels = connections
            .filter((c: any) => c.enabled)
            .flatMap((c: any) => c.models || []);

        if (allModels.length > 0 && !model) {
            setModel(allModels[0]);
        } else if (!model && allModels.length === 0) {
            // No AI connections configured - try last used
            const lastUsed = storage.getItem<string>('last_used_model', '');
            if (lastUsed) {
                setModel(lastUsed);
            }
        }
    }, []);

    const handleModeSelect = (mode: GenerationMode) => {
        setSelectedMode(mode);
        // Mode is selected, user can now use quick generate or tweak
    };

    const handleQuickGenerate = () => {
        onGenerate({
            wordCount: parseInt(wordCount),
            instructions: getModeInstructions(selectedMode),
            context: {},
            model: model || localStorage.getItem('last_used_model') || 'openai/gpt-3.5-turbo',
            mode: selectedMode,
        });
        onOpenChange(false);
    };

    const handleTweakAndGenerate = () => {
        setShowTweakDialog(true);
        onOpenChange(false);
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
                    <div />
                </PopoverTrigger>
                <PopoverContent className="w-80" align="start">
                    <div className="space-y-3">
                        <div>
                            <h4 className="font-medium text-sm mb-3">AI</h4>

                            {/* Scene Beat */}
                            <button
                                onClick={() => handleModeSelect('scene-beat')}
                                className={`w-full p-3 rounded-md transition-colors text-left ${selectedMode === 'scene-beat' ? 'bg-accent' : 'hover:bg-accent'
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
                                className={`w-full p-3 rounded-md transition-colors text-left ${selectedMode === 'continue-writing' ? 'bg-accent' : 'hover:bg-accent'
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
                                className={`w-full p-3 rounded-md transition-colors text-left ${selectedMode === 'codex-progression' ? 'bg-accent' : 'hover:bg-accent'
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
                                {selectedMode === 'scene-beat' ? 'Generate a scene beat.' :
                                    selectedMode === 'continue-writing' ? 'Continue the story.' :
                                        'Analyze story progression.'}
                            </p>
                            <div className="flex gap-2 mb-2">
                                <Button
                                    variant={wordCount === '200' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setWordCount('200')}
                                >
                                    200
                                </Button>
                                <Button
                                    variant={wordCount === '400' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setWordCount('400')}
                                >
                                    400
                                </Button>
                                <Button
                                    variant={wordCount === '600' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setWordCount('600')}
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
                                <ModelCombobox
                                    value={model}
                                    onValueChange={setModel}
                                    className="h-8 text-xs"
                                />
                            </div>

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

            <TweakGenerateDialog
                open={showTweakDialog}
                onOpenChange={setShowTweakDialog}
                onGenerate={(opts) => onGenerate({ ...opts, mode: selectedMode })}
                defaultWordCount={parseInt(wordCount)}
                mode={selectedMode}
                projectId={projectId}
            />
        </>
    );
}
