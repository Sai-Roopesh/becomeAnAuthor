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
import { Loader2 } from 'lucide-react';
import { ModelSelector } from '@/components/ai/model-selector';
import { generateText } from '@/lib/ai-service';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

import { ContextSelector, ContextItem } from '@/components/chat/context-selector';

interface TextReplaceDialogProps {
    action: 'expand' | 'rephrase' | 'shorten';
    selectedText: string;
    editor: Editor;
    onClose: () => void;
    projectId: string;
}

export function TextReplaceDialog({ action, selectedText, editor, onClose, projectId }: TextReplaceDialogProps) {
    const [activeTab, setActiveTab] = useState<'tweak' | 'preview'>('tweak');
    const [instruction, setInstruction] = useState('');
    const [preset, setPreset] = useState('default');
    const [customLength, setCustomLength] = useState('');
    const [model, setModel] = useState('');
    const [result, setResult] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');
    const [selectedContexts, setSelectedContexts] = useState<ContextItem[]>([]);

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
            const amount = preset === 'custom' ? `${customLength} words` : preset === 'double' ? 'double' : preset === 'triple' ? 'triple' : '50% more';
            systemPrompt = `You are expanding the selected text to be approximately ${amount} long. Maintain the original meaning, tone, and style while adding more detail, description, and depth.`;
        } else if (action === 'rephrase') {
            systemPrompt = `You are rephrasing the selected text. Keep the same meaning and approximate length but use different words and sentence structures.`;
            if (preset !== 'default') {
                systemPrompt += ` Specifically: ${preset}.`;
            }
        } else if (action === 'shorten') {
            const amount = preset === 'custom' ? `${customLength} words` : preset === 'half' ? 'half the length' : preset === 'quarter' ? '25% of original length' : 'one paragraph';
            systemPrompt = `You are condensing the selected text to approximately ${amount}. Preserve the core meaning while being more concise and removing unnecessary details.`;
        }

        if (instruction.trim()) {
            systemPrompt += `\n\nAdditional instructions: ${instruction}`;
        }

        if (selectedContexts.length > 0) {
            const contextLabels = selectedContexts.map(c => c.label).join(', ');
            systemPrompt += `\n\nConsider the following context: ${contextLabels}. (Note: Full context content would be injected here in a real implementation)`;
        }

        return systemPrompt;
    };

    const handleGenerate = async () => {
        if (!model) {
            setError('Please select a model');
            return;
        }

        if (action === 'expand' && preset === 'custom' && !customLength) {
            setError('Please enter target word count');
            return;
        }

        if (action === 'shorten' && preset === 'custom' && !customLength) {
            setError('Please enter target word count');
            return;
        }

        setIsGenerating(true);
        setError('');

        try {
            // In a real implementation, we would fetch the content of selected contexts here
            // For now, we just pass the labels in the system prompt

            const response = await generateText({
                model,
                system: getSystemPrompt(),
                prompt: `Original text:\n\n${selectedText}\n\nProvide only the ${action === 'expand' ? 'expanded' : action === 'rephrase' ? 'rephrased' : 'shortened'} version without any explanation.`,
                maxTokens: 4000,
            });

            setResult(response.text);
            setActiveTab('preview');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate text');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleApply = () => {
        if (result) {
            const { from, to } = editor.state.selection;
            editor.chain().focus().insertContentAt({ from, to }, result).run();
            onClose();
        }
    };

    const handleRetry = () => {
        setResult('');
        setActiveTab('tweak');
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

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'tweak' | 'preview')} className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-none px-6 pt-2">
                        <TabsList className="w-full grid grid-cols-2">
                            <TabsTrigger value="tweak">✏️ Tweak</TabsTrigger>
                            <TabsTrigger value="preview" disabled={!result}>👁️ Preview</TabsTrigger>
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
                            <Select value={preset} onValueChange={setPreset}>
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
                        {(preset === 'custom' && (action === 'expand' || action === 'shorten')) && (
                            <div>
                                <Label className="text-sm font-medium">
                                    Target Word Count
                                </Label>
                                <Input
                                    type="number"
                                    value={customLength}
                                    onChange={(e) => setCustomLength(e.target.value)}
                                    placeholder="e.g., 400 words"
                                    className="mt-2"
                                />
                            </div>
                        )}

                        {/* Additional Instructions */}
                        <div>
                            <Label className="text-sm font-medium">AND</Label>
                            <Textarea
                                value={instruction}
                                onChange={(e) => setInstruction(e.target.value)}
                                placeholder="e.g., describe the setting"
                                className="min-h-[80px] mt-2"
                            />
                        </div>

                        {/* Context Selector */}
                        <div>
                            <Label className="text-sm font-medium mb-2 block">Context</Label>
                            <ContextSelector
                                projectId={projectId}
                                selectedContexts={selectedContexts}
                                onContextsChange={setSelectedContexts}
                            />
                        </div>

                        {/* Original Text Preview */}
                        <div>
                            <Label className="text-sm font-medium">Original Text</Label>
                            <div className="mt-2 p-3 bg-muted rounded-md max-h-[120px] overflow-y-auto">
                                <p className="text-sm whitespace-pre-wrap">{selectedText}</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {selectedText.trim().split(/\s+/).length} words
                            </p>
                        </div>

                        {/* Model Selector */}
                        <div>
                            <Label className="text-sm font-medium">Model</Label>
                            <ModelSelector
                                value={model}
                                onValueChange={setModel}
                                className="mt-2"
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-destructive/10 border border-destructive rounded-md">
                                <p className="text-sm text-destructive">{error}</p>
                            </div>
                        )}
                    </TabsContent>

                    {/* Preview Tab */}
                    <TabsContent value="preview" className="flex-1 overflow-y-auto px-6 py-4 space-y-4 mt-0">
                        <div>
                            <Label className="text-sm font-medium">Before</Label>
                            <div className="mt-2 p-3 bg-muted rounded-md max-h-[150px] overflow-y-auto">
                                <p className="text-sm whitespace-pre-wrap">{selectedText}</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {selectedText.trim().split(/\s+/).length} words
                            </p>
                        </div>

                        <div>
                            <Label className="text-sm font-medium">After</Label>
                            <Textarea
                                value={result}
                                onChange={(e) => setResult(e.target.value)}
                                className="min-h-[200px] mt-2"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                {result.trim().split(/\s+/).filter(Boolean).length} words
                            </p>
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Footer Actions */}
                <div className="flex-none px-6 py-4 border-t flex justify-end gap-2">
                    {activeTab === 'tweak' ? (
                        <>
                            <Button variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button onClick={handleGenerate} disabled={isGenerating || !model}>
                                {isGenerating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                {isGenerating ? 'Generating...' : 'Generate'}
                            </Button>
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
