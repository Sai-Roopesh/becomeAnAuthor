'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Expand, Copy } from 'lucide-react';
import { ModelCombobox } from '@/features/ai/components/model-combobox';
import type { ChatContext } from '@/lib/config/types';
import { storage } from '@/lib/safe-storage';
import {
    useDialogState,
    tweakGenerateReducer,
    createInitialTweakGenerateState
} from '@/hooks/use-dialog-state';

type GenerationMode = 'scene-beat' | 'continue-writing' | 'codex-progression';

import { ContextSelector, type ContextItem } from '@/features/shared/components';

interface TweakGenerateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onGenerate: (options: GenerateOptions) => void;
    defaultWordCount?: number;
    mode?: GenerationMode;
    projectId: string;
}

export interface GenerateOptions {
    wordCount: number;
    instructions: string;
    context: ChatContext;
    model: string;
    selectedContexts?: ContextItem[];
}

export function TweakGenerateDialog({ open, onOpenChange, onGenerate, defaultWordCount = 400, mode, projectId }: TweakGenerateDialogProps) {
    // Replace 6 useState calls with single useReducer
    const [state, dispatch] = useDialogState(
        createInitialTweakGenerateState(defaultWordCount),
        tweakGenerateReducer
    );
    const [context, setContext] = useState<ChatContext>({});

    useEffect(() => {
        // Load default model from AI connections with safe parsing
        const connections = storage.getItem<any[]>('ai_connections', []);
        const allModels = connections
            .filter((c: any) => c.enabled)
            .flatMap((c: any) => c.models || []);

        if (allModels.length > 0 && !state.model) {
            dispatch({ type: 'SET_MODEL', payload: allModels[0] });
        }
    }, [state.model]);

    const handleGenerate = () => {
        onGenerate({
            wordCount: parseInt(state.wordCount) || 400,
            instructions: state.instructions,
            context,
            model: state.model || storage.getItem<string>('last_used_model', 'openai/gpt-3.5-turbo'),
            selectedContexts: state.selectedContexts
        });
        onOpenChange(false);
    };

    const handleReset = () => {
        dispatch({ type: 'RESET', payload: { wordCount: defaultWordCount.toString() } });
        setContext({});
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Generate Text</DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="tweak" className="w-full">
                    <TabsList>
                        <TabsTrigger value="tweak">Tweak</TabsTrigger>
                        <TabsTrigger value="preview">Preview</TabsTrigger>
                    </TabsList>

                    <TabsContent value="tweak" className="space-y-4 mt-4">
                        {/* Words */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <Label>
                                    Words <span className="text-destructive">*</span>
                                </Label>
                                <Button variant="ghost" size="sm" onClick={handleReset}>
                                    Reset
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                                How many words should the AI write?
                            </p>
                            <div className="flex gap-2">
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
                                <span className="text-muted-foreground mx-2">OR</span>
                                <Input
                                    type="number"
                                    value={state.wordCount}
                                    onChange={(e) => dispatch({ type: 'SET_WORD_COUNT', payload: e.target.value })}
                                    placeholder="e.g. 300"
                                    className="w-32"
                                />
                            </div>
                        </div>

                        {/* Instructions */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <Label>Instructions</Label>
                                <Button variant="ghost" size="sm" onClick={handleReset}>
                                    Reset
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                                Any (optional) additional instructions and notes for the AI
                            </p>
                            <Textarea
                                value={state.instructions}
                                onChange={(e) => dispatch({ type: 'SET_INSTRUCTIONS', payload: e.target.value })}
                                placeholder="e.g. You are a..."
                                rows={4}
                            />
                            <div className="flex gap-2 mt-2">
                                <Button variant="ghost" size="sm">
                                    <Expand className="h-3 w-3 mr-1" />
                                    Expand
                                </Button>
                                <Button variant="ghost" size="sm">
                                    <Copy className="h-3 w-3 mr-1" />
                                    Copy
                                </Button>
                            </div>
                        </div>

                        {/* Additional Context */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <Label>Additional Context</Label>
                                <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'SET_SELECTED_CONTEXTS', payload: [] })}>
                                    Reset
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                                Select context from your project to provide to the AI
                            </p>
                            <ContextSelector
                                projectId={projectId}
                                selectedContexts={state.selectedContexts}
                                onContextsChange={(contexts) => dispatch({ type: 'SET_SELECTED_CONTEXTS', payload: contexts })}
                            />
                        </div>

                        {/* Model Selection */}
                        <div className="flex items-center justify-between pt-4 border-t">
                            <ModelCombobox
                                value={state.model}
                                onValueChange={(value) => dispatch({ type: 'SET_MODEL', payload: value })}
                                className="w-[300px]"
                            />

                            <Button onClick={handleGenerate}>Generate</Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="preview" className="mt-4">
                        <div className="text-center text-muted-foreground p-8">
                            Preview will show the final prompt sent to AI
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
