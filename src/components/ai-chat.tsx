'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send } from 'lucide-react';

import { assembleContext } from '@/lib/context-engine';
import { useProjectStore } from '@/store/use-project-store';

export function AIChat() {
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant' | 'system', content: string }[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { activeSceneId } = useProjectStore();

    const sendMessage = async () => {
        if (!input.trim()) return;
        const apiKey = localStorage.getItem('openrouter_api_key');
        if (!apiKey) {
            alert('Please set your API Key in settings.');
            return;
        }

        const userMsg = { role: 'user' as const, content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const context = await assembleContext(activeSceneId, input);
            const systemMsg = { role: 'system' as const, content: `You are an expert fiction writer. Use the following context to assist the user:\n\n${context}` };

            const model = localStorage.getItem('openrouter_model') || 'openai/gpt-3.5-turbo';
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
                    messages: [systemMsg, ...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
                }),
            });

            if (!response.ok) throw new Error('API Error');

            const data = await response.json();
            const aiMsg = { role: 'assistant' as const, content: data.choices[0].message.content };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'assistant', content: 'Error: Failed to generate response.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col">
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                    {messages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-lg p-2 text-sm ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                {m.content}
                            </div>
                        </div>
                    ))}
                    {isLoading && <div className="text-xs text-muted-foreground">Thinking...</div>}
                </div>
            </ScrollArea>
            <div className="p-4 border-t flex gap-2">
                <Input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Ask AI..."
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                />
                <Button size="icon" onClick={sendMessage} disabled={isLoading}>
                    <Send className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
