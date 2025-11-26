'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { Sparkles } from 'lucide-react';

export function TinkerMode({ editor, open, onOpenChange }: { editor: Editor | null, open: boolean, onOpenChange: (open: boolean) => void }) {
    const [originalText, setOriginalText] = useState('');
    const [tinkeredText, setTinkeredText] = useState('');
    const [instruction, setInstruction] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (open && editor) {
            const selection = editor.state.selection;
            const text = editor.state.doc.textBetween(selection.from, selection.to);
            setOriginalText(text);
            setTinkeredText(text);
        }
    }, [open, editor]);

    const handleGenerate = async () => {
        if (!instruction) return;
        setIsGenerating(true);

        const apiKey = localStorage.getItem('openrouter_api_key');
        const model = localStorage.getItem('openrouter_model') || 'openai/gpt-3.5-turbo';

        try {
            const prompt = `Original Text: "${tinkeredText}"\n\nInstruction: ${instruction}\n\nRewrite the text following the instruction. Output ONLY the rewritten text.`;

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'OpenSource Novel Writer',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: 'user', content: prompt }],
                }),
            });

            const data = await response.json();
            const newText = data.choices[0]?.message?.content || '';
            if (newText) setTinkeredText(newText);
        } catch (e) {
            console.error(e);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleApply = () => {
        if (editor) {
            editor.chain().focus().insertContent(tinkeredText).run();
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Tinker Mode</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Experiment with this text:</label>
                        <Textarea
                            value={tinkeredText}
                            onChange={(e) => setTinkeredText(e.target.value)}
                            className="min-h-[150px]"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Textarea
                            placeholder="How should AI change this? (e.g. 'Make it more ominous')"
                            value={instruction}
                            onChange={(e) => setInstruction(e.target.value)}
                            className="h-[80px]"
                        />
                        <Button onClick={handleGenerate} disabled={isGenerating || !instruction} className="h-[80px] w-[100px] flex flex-col gap-1">
                            <Sparkles className="h-4 w-4" />
                            {isGenerating ? '...' : 'Run'}
                        </Button>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setTinkeredText(originalText)}>Reset</Button>
                    <Button onClick={handleApply}>Apply Change</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
