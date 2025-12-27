'use client';

import { Editor } from '@tiptap/react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { ModelCombobox } from '@/features/ai';
import { useAI } from '@/hooks/use-ai';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useDialogState, textReplaceReducer, initialTextReplaceState } from '@/hooks/use-dialog-state';
import { ContextSelector, type ContextItem } from '@/features/shared/components';
import type { EditorStateManager } from '@/lib/core/editor-state-manager';

interface TextReplaceDialogProps {
    action: 'expand' | 'rephrase' | 'shorten';
    selectedText: string;
    editor: Editor;
    onClose: () => void;
    projectId: string;
    seriesId: string;  // Required - series-first architecture
    sceneId: string;  // Required for save tracking
    editorStateManager: EditorStateManager | null;  // Required for immediate save
}

export function TextReplaceDialog({ action, selectedText, editor, onClose, projectId, seriesId, sceneId, editorStateManager }: TextReplaceDialogProps) {
    // Replace 7 useState calls with single useReducer
    const [state, dispatch] = useDialogState(
        initialTextReplaceState,
        textReplaceReducer
    );

    const { generateStream, isGenerating, model, setModel, error: aiError, cancel } = useAI({
        system: `You are an expert creative writing editor specializing in text transformation.

EDITING APPROACH:
- ${action === 'expand' ? 'Add rich sensory details and vivid descriptions' : ''}
- ${action === 'rephrase' ? 'Improve flow and clarity while maintaining meaning' : ''}
- ${action === 'shorten' ? 'Remove redundancy while keeping impact' : ''}
- Show, don't tell: Use concrete details
- Active voice: Choose strong, specific verbs
- Match tone: Preserve the original style

OUTPUT:
Provide only the transformed text. No explanations, no preamble.`,
        streaming: true,
        persistModel: true,
        operationName: action === 'expand' ? 'Expand Text' : action === 'rephrase' ? 'Rephrase Text' : 'Shorten Text',
    });

    const getActionTitle = () => {
        switch (action) {
            case 'expand':
                return 'Expand Text';
            case 'rephrase':
                return 'Rephrase Text';
            case 'shorten':
                return 'Shorten Text';
        }
    };

    const getSystemPrompt = () => {
        let systemPrompt = '';

        if (action === 'expand') {
            const amount = state.preset === 'custom' ? `${state.customLength} words` : state.preset === 'double' ? 'double' : state.preset === 'triple' ? 'triple' : '50% more';
            systemPrompt = `You are expanding the selected text to be approximately ${amount} long. Maintain the original meaning, tone, and style while adding more detail, description, and depth.`;
        } else if (action === 'rephrase') {
            systemPrompt = `You are rephrasing the selected text. Keep the same meaning and approximate length but use different words and sentence structures.`;
            if (state.preset !== 'default') {
                systemPrompt += ` Specifically: ${state.preset}.`;
            }
        } else if (action === 'shorten') {
            const amount = state.preset === 'custom' ? `${state.customLength} words` : state.preset === 'half' ? 'half the length' : state.preset === 'quarter' ? '25% of original length' : 'one paragraph';
            systemPrompt = `You are condensing the selected text to approximately ${amount}. Preserve the core meaning while being more concise and removing unnecessary details.`;
        }

        if (state.instruction.trim()) {
            systemPrompt += `\n\nAdditional instructions: ${state.instruction}`;
        }

        if (state.selectedContexts.length > 0) {
            const contextLabels = state.selectedContexts.map((c: ContextItem) => c.label).join(', ');
            systemPrompt += `\n\nConsider the following context: ${contextLabels}. (Note: Full context content would be injected here in a real implementation)`;
        }

        return systemPrompt;
    };

    const handleGenerate = async () => {
        if (!model) {
            return;
        }

        // Clear previous result and switch to preview tab  
        dispatch({ type: 'START_GENERATE' });

        await generateStream(
            {
                prompt: `Original text:\n\n${selectedText}\n\nProvide only the ${action === 'expand' ? 'expanded' : action === 'rephrase' ? 'rephrased' : 'shortened'} version without any explanation.`,
                context: getSystemPrompt(),
                maxTokens: 4000,
            },
            {
                onChunk: (chunk) => {
                    dispatch({ type: 'SET_RESULT', payload: state.result + chunk });
                    // Update word count in real-time
                    const words = (state.result + chunk).trim().split(/\s+/).filter(Boolean).length;
                    dispatch({ type: 'UPDATE_STREAM_COUNT', payload: words });
                },
                onComplete: (fullText) => {
                    // Final word count
                    const words = fullText.trim().split(/\s+/).filter(Boolean).length;
                    dispatch({ type: 'UPDATE_STREAM_COUNT', payload: words });
                },
            }
        );
    };

    const handleCancelGeneration = () => {
        cancel();
        dispatch({ type: 'RESET' });
    };

    const handleApply = async () => {
        if (state.result) {
            const { from, to } = editor.state.selection;
            editor.chain().focus().insertContentAt({ from, to }, state.result).run();

            // ✅ NEW: Immediate save after AI operation
            if (editorStateManager) {
                await editorStateManager.saveImmediate();
            }

            onClose();
        }
    };

    const handleRetry = () => {
        dispatch({ type: 'SWITCH_TAB', payload: 'tweak' });
        dispatch({ type: 'SET_RESULT', payload: '' });
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0" aria-describedby={undefined}>
                <VisuallyHidden>
                    <DialogTitle>{getActionTitle()}</DialogTitle>
                </VisuallyHidden>

                <div className="flex-none px-6 pt-6 pb-4 border-b">
                    <h2 className="text-lg font-semibold">{getActionTitle()}</h2>
                </div>

                <Tabs value={state.activeTab} onValueChange={(v) => dispatch({ type: 'SWITCH_TAB', payload: v as 'tweak' | 'preview' })} className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-none px-6 pt-2">
                        <TabsList className="w-full grid grid-cols-2">
                            <TabsTrigger value="tweak">✏️ Tweak</TabsTrigger>
                            <TabsTrigger value="preview" disabled={!state.result}>👁️ Preview</TabsTrigger>
                        </TabsList>
                    </div>

                    {/* Tweak Tab */}
                    <TabsContent value="tweak" className="flex-1 overflow-y-auto px-6 py-4 space-y-4 mt-0">
                        {/* Preset Options */}
                        <div>
                            <Label className="text-sm font-medium">Instructions</Label>
                            <p className="text-xs text-muted-foreground mb-2">
                                How should the text be {action === 'expand' ? 'expanded' : action === 'rephrase' ? 'rephrased' : 'shortened'}?
                            </p>
                            <Select value={state.preset} onValueChange={(value) => dispatch({ type: 'SET_PRESET', payload: value })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {action === 'expand' && (
                                        <>
                                            <SelectItem value="default">Default (50% more)</SelectItem>
                                            <SelectItem value="double">Double length</SelectItem>
                                            <SelectItem value="triple">Triple length</SelectItem>
                                            <SelectItem value="custom">Custom word count</SelectItem>
                                        </>
                                    )}
                                    {action === 'rephrase' && (
                                        <>
                                            <SelectItem value="default">Improve</SelectItem>
                                            <SelectItem value="add inner thoughts">Add inner thoughts</SelectItem>
                                            <SelectItem value="convert to dialogue">Convert to dialogue</SelectItem>
                                            <SelectItem value="passive to active voice">Passive → Active</SelectItem>
                                            <SelectItem value="use different words">Use different words</SelectItem>
                                            <SelectItem value="show don't tell">Show, don't tell</SelectItem>
                                        </>
                                    )}
                                    {action === 'shorten' && (
                                        <>
                                            <SelectItem value="half">Half</SelectItem>
                                            <SelectItem value="quarter">Quarter</SelectItem>
                                            <SelectItem value="paragraph">Single paragraph</SelectItem>
                                            <SelectItem value="custom">Custom word count</SelectItem>
                                        </>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Custom Length Input */}
                        {(state.preset === 'custom' && (action === 'expand' || action === 'shorten')) && (
                            <div>
                                <Label className="text-sm font-medium">
                                    Target Word Count
                                </Label>
                                <Input
                                    type="number"
                                    value={state.customLength}
                                    onChange={(e) => dispatch({ type: 'SET_CUSTOM_LENGTH', payload: e.target.value })}
                                    placeholder="e.g., 400 words"
                                    className="mt-2"
                                />
                            </div>
                        )}

                        {/* Additional Instructions */}
                        <div>
                            <Label className="text-sm font-medium">AND</Label>
                            <Textarea
                                value={state.instruction}
                                onChange={(e) => dispatch({ type: 'SET_INSTRUCTION', payload: e.target.value })}
                                placeholder="e.g., describe the setting"
                                className="min-h-[80px] max-h-[20vh] mt-2"
                            />
                        </div>

                        {/* Context Selector */}
                        <div>
                            <Label className="text-sm font-medium mb-2 block">Context</Label>
                            <ContextSelector
                                projectId={projectId}
                                seriesId={seriesId}
                                selectedContexts={state.selectedContexts}
                                onContextsChange={(contexts) => dispatch({ type: 'SET_SELECTED_CONTEXTS', payload: contexts })}
                            />
                        </div>

                        {/* Original Text Preview */}
                        <div>
                            <Label className="text-sm font-medium">Original Text</Label>
                            <div className="mt-2 p-3 bg-muted rounded-md max-h-[25vh] overflow-y-auto">
                                <p className="text-sm whitespace-pre-wrap">{selectedText}</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {selectedText.trim().split(/\s+/).length} words
                            </p>
                        </div>

                        {/* Model Selector */}
                        <div>
                            <Label className="text-sm font-medium">Model</Label>
                            <ModelCombobox
                                value={model}
                                onValueChange={setModel}
                                className="mt-2"
                            />
                        </div>

                        {aiError && (
                            <div className="p-3 bg-destructive/10 border border-destructive rounded-md">
                                <p className="text-sm text-destructive">{aiError}</p>
                            </div>
                        )}
                    </TabsContent>

                    {/* Preview Tab */}
                    <TabsContent value="preview" className="flex-1 overflow-y-auto px-6 py-4 space-y-4 mt-0">
                        <div>
                            <Label className="text-sm font-medium">Before</Label>
                            <div className="mt-2 p-3 bg-muted rounded-md max-h-[25vh] overflow-y-auto">
                                <p className="text-sm whitespace-pre-wrap">{selectedText}</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {selectedText.trim().split(/\s+/).length} words
                            </p>
                        </div>

                        <div>
                            <Label className="text-sm font-medium">After</Label>
                            <Textarea
                                value={state.result}
                                onChange={(e) => dispatch({ type: 'SET_RESULT', payload: e.target.value })}
                                className="min-h-[200px] mt-2"
                                readOnly={isGenerating}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                {isGenerating ? (
                                    <>
                                        <span className="inline-block w-2 h-2 mr-1 bg-blue-500 rounded-full animate-pulse" />
                                        {state.streamingWordCount} words (streaming...)
                                    </>
                                ) : (
                                    `${state.result.trim().split(/\s+/).filter(Boolean).length} words`
                                )}
                            </p>
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Footer Actions */}
                <div className="flex-none px-6 py-4 border-t flex justify-end gap-2">
                    {state.activeTab === 'tweak' ? (
                        <>
                            <Button variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button onClick={handleGenerate} disabled={isGenerating || !model}>
                                {isGenerating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                {isGenerating ? 'Generating...' : 'Generate'}
                            </Button>
                            {isGenerating && (
                                <Button
                                    variant="outline"
                                    onClick={handleCancelGeneration}
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    Cancel
                                </Button>
                            )}
                        </>
                    ) : (
                        <>
                            <Button variant="outline" onClick={onClose}>
                                Discard
                            </Button>
                            <Button variant="outline" onClick={handleRetry} disabled={isGenerating}>
                                Regenerate
                            </Button>
                            <Button onClick={handleApply}>
                                Apply
                            </Button>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
