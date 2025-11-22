'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { MoreVertical, Eye, EyeOff, FileText, Users, MessageSquare, Copy, FileDown, Archive, History } from 'lucide-react';
import { useState } from 'react';

interface SceneActionMenuProps {
    sceneId: string;
}

export function SceneActionMenu({ sceneId }: SceneActionMenuProps) {
    const scene = useLiveQuery(() => db.nodes.get(sceneId), [sceneId]);
    const [isSummarizing, setIsSummarizing] = useState(false);

    if (!scene || scene.type !== 'scene') return null;

    const handleSetPOV = () => {
        const pov = prompt('Enter POV character name:');
        if (pov) {
            db.nodes.update(sceneId, { pov } as any);
        }
    };

    const handleAddSubtitle = () => {
        const subtitle = prompt('Enter scene subtitle:');
        if (subtitle) {
            db.nodes.update(sceneId, { subtitle } as any);
        }
    };

    const handleToggleAIExclusion = async () => {
        const current = (scene as any).excludeFromAI || false;
        await db.nodes.update(sceneId, { excludeFromAI: !current } as any);
    };

    const handleSummarizeScene = async () => {
        setIsSummarizing(true);
        const apiKey = localStorage.getItem('openrouter_api_key');
        const model = localStorage.getItem('openrouter_model') || 'openai/gpt-3.5-turbo';

        if (!apiKey) {
            alert('Please set your API Key in settings.');
            setIsSummarizing(false);
            return;
        }

        try {
            // Extract text from Tiptap JSON
            const content = (scene as any).content;
            let text = '';
            if (content?.content) {
                text = content.content.map((node: any) => {
                    if (node.type === 'paragraph' && node.content) {
                        return node.content.map((c: any) => c.text || '').join('');
                    }
                    return '';
                }).join('\n');
            }

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
                    messages: [{
                        role: 'user',
                        content: `Summarize this scene in 2-3 sentences:\n\n${text}`
                    }],
                }),
            });

            const data = await response.json();
            const summary = data.choices[0]?.message?.content || '';

            if (summary) {
                await db.nodes.update(sceneId, { summary } as any);
                alert('Scene summarized successfully!');
            }
        } catch (error) {
            console.error('Summarization failed', error);
            alert('Failed to summarize scene.');
        } finally {
            setIsSummarizing(false);
        }
    };

    const handleDetectCharacters = async () => {
        alert('Character detection coming soon...');
    };

    const handleChatWithScene = () => {
        alert('Chat with scene coming soon...');
    };

    const handleDuplicate = async () => {
        const newScene = {
            ...scene,
            id: crypto.randomUUID(),
            title: `${scene.title} (Copy)`,
            order: (scene.order || 0) + 0.5,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        await db.nodes.add(newScene as any);
    };

    const handleCopyProse = async () => {
        const content = (scene as any).content;
        let text = '';
        if (content?.content) {
            text = content.content.map((node: any) => {
                if (node.type === 'paragraph' && node.content) {
                    return node.content.map((c: any) => c.text || '').join('');
                }
                return '';
            }).join('\n\n');
        }
        await navigator.clipboard.writeText(text);
        alert('Prose copied to clipboard!');
    };

    const handleExport = () => {
        const content = (scene as any).content;
        let text = '';
        if (content?.content) {
            text = content.content.map((node: any) => {
                if (node.type === 'paragraph' && node.content) {
                    return node.content.map((c: any) => c.text || '').join('');
                }
                return '';
            }).join('\n\n');
        }

        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${scene.title}.txt`;
        a.click();
    };

    const handleArchive = async () => {
        if (confirm('Archive this scene?')) {
            await db.nodes.update(sceneId, { archived: true } as any);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={handleSetPOV}>
                    <Eye className="h-4 w-4 mr-2" />
                    Set Custom POV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleToggleAIExclusion}>
                    <EyeOff className="h-4 w-4 mr-2" />
                    {(scene as any).excludeFromAI ? 'Include in AI Context' : 'Exclude from AI Context'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleAddSubtitle}>
                    <FileText className="h-4 w-4 mr-2" />
                    Add Subtitle
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel>AI Actions</DropdownMenuLabel>

                <DropdownMenuItem onClick={handleSummarizeScene} disabled={isSummarizing}>
                    <FileText className="h-4 w-4 mr-2" />
                    {isSummarizing ? 'Summarizing...' : 'Summarize Scene'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDetectCharacters}>
                    <Users className="h-4 w-4 mr-2" />
                    Detect Characters
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleChatWithScene}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Chat with Scene
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={handleDuplicate}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate Scene
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel>History</DropdownMenuLabel>

                <DropdownMenuItem>
                    <History className="h-4 w-4 mr-2" />
                    Scene Summary
                </DropdownMenuItem>
                <DropdownMenuItem>
                    <History className="h-4 w-4 mr-2" />
                    Scene Contents
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={handleCopyProse}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Scene Prose
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExport}>
                    <FileDown className="h-4 w-4 mr-2" />
                    Export Scene
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleArchive}>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive Scene
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
