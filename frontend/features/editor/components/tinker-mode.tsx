'use client';

import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { Editor } from '@tiptap/react';
import { useAI } from '@/hooks/use-ai';
import { ModelCombobox } from '@/features/ai/components/model-combobox';
import { Loader2, X } from 'lucide-react';

interface TinkerModeProps {
    editor: Editor | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function TinkerMode({ editor, open, onOpenChange }: TinkerModeProps) {
    const [instruction, setInstruction] = useState('');
    const [streamingResult, setStreamingResult] = useState('');

    const { generateStream, isGenerating, model, setModel, cancel } = useAI({
        system: 'You are a creative writing assistant helping to modify and improve text.',
        streaming: true,
        persistModel: true,
        operationName: 'Tinker Mode',
    });

    if (!editor) return null;

    const handleGenerate = async () => {
        if (!instruction.trim()) return;

        const selection = editor.state.selection;
        const selectedText = editor.state.doc.textBetween(selection.from, selection.to);

        if (!selectedText) return;

        setStreamingResult('');

        await generateStream(
            {
                prompt: `Original text:\n\n"${selectedText}"\n\nInstructions: ${instruction}\n\nProvide only the modified text without any explanation.`,
                maxTokens: 2000,
            },
            {
                onChunk: (chunk) => {
                    setStreamingResult(prev => prev + chunk);
                },
                onComplete: (fullText) => {
                    if (fullText) {
                        // Replace selected text with result
                        const { from, to } = editor.state.selection;
                        editor.chain().focus().insertContentAt({ from, to }, fullText).run();
                    }
                    setStreamingResult('');
                    setInstruction('');
                    onOpenChange(false);
                },
            }
        );
    };

    const handleCancel = () => {
        cancel();
        setStreamingResult('');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogTitle>Tweak & Generate</DialogTitle>

                <div className="space-y-4 py-4">
                    {/* Model Selector */}
                    <div>
                        <Label>Model</Label>
                        <ModelCombobox
                            value={model}
                            onValueChange={setModel}
                            className="mt-2"
                        />
                    </div>

                    {/* Instructions */}
                    <div>
                        <Label>Instructions</Label>
                        <Textarea
                            value={instruction}
                            onChange={(e) => setInstruction(e.target.value)}
                            placeholder="E.g., Make this more dramatic, Add more sensory details, Shorten while keeping the key points..."
                            className="min-h-[100px] mt-2"
                            disabled={isGenerating}
                        />
                    </div>

                    {/* Streaming Preview */}
                    {isGenerating && streamingResult && (
                        <div>
                            <Label>Preview (streaming...)</Label>
                            <div className="mt-2 p-3 bg-muted rounded-md max-h-[200px] overflow-y-auto">
                                <p className="text-sm whitespace-pre-wrap">
                                    {streamingResult}
                                    <span className="inline-block w-2 h-4 ml-1 bg-blue-500 animate-pulse" />
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    {!isGenerating ? (
                        <>
                            <Button variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleGenerate} disabled={!instruction.trim() || !model}>
                                Generate
                            </Button>
                        </>
                    ) : (
                        <Button variant="destructive" onClick={handleCancel}>
                            <X className="h-4 w-4 mr-2" />
                            Cancel Generation
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
