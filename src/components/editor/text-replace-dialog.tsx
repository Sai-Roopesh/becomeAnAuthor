'use client';

import { Editor } from '@tiptap/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface TextReplaceDialogProps {
    action: 'expand' | 'rephrase' | 'shorten';
    selectedText: string;
    editor: Editor;
    onClose: () => void;
}

export function TextReplaceDialog({ action, selectedText, editor, onClose }: TextReplaceDialogProps) {
    const [instruction, setInstruction] = useState('');
    const [preset, setPreset] = useState('default');
    const [result, setResult] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const getPrompt = () => {
        let basePrompt = '';

        if (action === 'expand') {
            const amount = preset === 'default' ? '50%' : preset;
            basePrompt = `Expand the following text by ${amount}. ${instruction ? instruction : ''}\n\nText: ${selectedText}`;
        } else if (action === 'rephrase') {
            const rephraseType = preset === 'default' ? 'improve the text' : preset;
            basePrompt = `Rephrase the following text to ${rephraseType}. ${instruction ? instruction : ''}\n\nText: ${selectedText}`;
        } else if (action === 'shorten') {
            const amount = preset === 'half' ? '50%' : preset === 'quarter' ? '75%' : 'one paragraph';
            basePrompt = `Shorten the following text by ${amount}. ${instruction ? instruction : ''}\n\nText: ${selectedText}`;
        }

        return basePrompt;
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        const apiKey = localStorage.getItem('openrouter_api_key');
        const model = localStorage.getItem('openrouter_model') || 'openai/gpt-3.5-turbo';

        if (!apiKey) {
            alert('Please set your API Key in settings.');
            setIsGenerating(false);
            return;
        }

        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'Become an Author',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: 'user', content: getPrompt() }],
                }),
            });

            const data = await response.json();
            const text = data.choices[0]?.message?.content || '';

            if (text) {
                setResult(text);
            }
        } catch (error) {
            console.error('Generation failed', error);
            alert('Failed to generate text.');
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
        handleGenerate();
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {action === 'expand' && 'Expand Text'}
                        {action === 'rephrase' && 'Rephrase Text'}
                        {action === 'shorten' && 'Shorten Text'}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Preset Options */}
                    <div>
                        <Label>Preset</Label>
                        <Select value={preset} onValueChange={setPreset}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {action === 'expand' && (
                                    <>
                                        <SelectItem value="default">Default (50% more)</SelectItem>
                                        <SelectItem value="100%">Double length</SelectItem>
                                        <SelectItem value="200%">Triple length</SelectItem>
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
                                    </>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Custom Instructions */}
                    <div>
                        <Label>Additional Instructions (Optional)</Label>
                        <Textarea
                            value={instruction}
                            onChange={(e) => setInstruction(e.target.value)}
                            placeholder="Add any specific instructions..."
                            className="min-h-[60px]"
                        />
                    </div>

                    {/* Original Text */}
                    <div>
                        <Label>Original Text</Label>
                        <Textarea
                            value={selectedText}
                            readOnly
                            className="min-h-[100px] bg-muted"
                        />
                    </div>

                    {/* Result */}
                    {result && (
                        <div>
                            <Label>Generated Text</Label>
                            <Textarea
                                value={result}
                                onChange={(e) => setResult(e.target.value)}
                                className="min-h-[150px]"
                            />
                        </div>
                    )}
                </div>

                <DialogFooter>
                    {!result ? (
                        <>
                            <Button variant="outline" onClick={onClose}>Cancel</Button>
                            <Button onClick={handleGenerate} disabled={isGenerating}>
                                {isGenerating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                {isGenerating ? 'Generating...' : 'Generate'}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" onClick={onClose}>Discard</Button>
                            <Button variant="outline" onClick={handleRetry} disabled={isGenerating}>
                                Retry
                            </Button>
                            <Button onClick={handleApply}>Apply</Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
