'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Expand, Copy } from 'lucide-react';
import { ModelSelector } from '@/features/ai/components/model-selector';
import type { ChatContext } from '@/lib/types';

type GenerationMode = 'scene-beat' | 'continue-writing' | 'codex-progression';

import { ContextSelector, ContextItem } from '@/features/chat/components/context-selector';

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
    const [wordCount, setWordCount] = useState(defaultWordCount.toString());
    const [instructions, setInstructions] = useState('');
    const [context, setContext] = useState<ChatContext>({});
    const [model, setModel] = useState('');
    const [selectedContexts, setSelectedContexts] = useState<ContextItem[]>([]);

    useState(() => {
        // Load default model from AI connections
        const connections = JSON.parse(localStorage.getItem('ai_connections') || '[]');
        const allModels = connections
            .filter((c: any) => c.enabled)
            .flatMap((c: any) => c.models || []);

        if (allModels.length > 0 && !model) {
            setModel(allModels[0]);
        }
    });

    const handleGenerate = () => {
        onGenerate({
            wordCount: parseInt(wordCount) || 400,
            instructions,
            context,
            model: model || localStorage.getItem('last_used_model') || 'openai/gpt-3.5-turbo',
            selectedContexts
        });
        onOpenChange(false);
    };

    const handleReset = () => {
        setWordCount(defaultWordCount.toString());
        setInstructions('');
        setContext({});
        setSelectedContexts([]);
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
                                <span className="text-muted-foreground mx-2">OR</span>
                                <Input
                                    type="number"
                                    value={wordCount}
                                    onChange={(e) => setWordCount(e.target.value)}
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
                                value={instructions}
                                onChange={(e) => setInstructions(e.target.value)}
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
                                <Button variant="ghost" size="sm" onClick={() => setSelectedContexts([])}>
                                    Reset
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                                Select context from your project to provide to the AI
                            </p>
                            <ContextSelector
                                projectId={projectId}
                                selectedContexts={selectedContexts}
                                onContextsChange={setSelectedContexts}
                            />
                        </div>

                        {/* Model Selection */}
                        <div className="flex items-center justify-between pt-4 border-t">
                            <ModelSelector
                                value={model}
                                onValueChange={setModel}
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
