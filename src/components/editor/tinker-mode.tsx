'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { Sparkles } from 'lucide-react';
import { generateText } from '@/lib/ai-service';
import { toast } from '@/lib/toast-service';
import { storage } from '@/lib/safe-storage';
import { STORAGE_KEYS } from '@/lib/constants';

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

        const model = storage.getItem<string>(STORAGE_KEYS.LAST_USED_MODEL, '');

        if (!model) {
            toast.error('Please select a model in settings or chat to use AI features.');
            setIsGenerating(false);
            return;
        }

        try {
            const prompt = `Original Text: "${tinkeredText}"\n\nInstruction: ${instruction}\n\nRewrite the text following the instruction. Output ONLY the rewritten text.`;

            const response = await generateText({
                model,
                system: 'You are a helpful creative writing assistant.',
                prompt,
                maxTokens: 1000,
            });

            const newText = response.text;
            if (newText) setTinkeredText(newText);
        } catch (e) {
            console.error(e);
            toast.error(`Generation failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
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
