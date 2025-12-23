'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CodexList } from '@/features/codex';
import { AIChat } from '@/features/chat';
import { SettingsDialog } from '@/features/settings';

interface ProjectToolsProps {
    projectId: string;
    seriesId: string;  // Required - series-first architecture
}

export function ProjectTools({ projectId, seriesId }: ProjectToolsProps) {
    return (
        <div className="h-full flex flex-col">
            <div className="p-2 border-b flex justify-end">
                <SettingsDialog />
            </div>
            <Tabs defaultValue="codex" className="h-full flex flex-col">
                <div className="p-2 border-b">
                    <TabsList className="w-full">
                        <TabsTrigger value="codex" className="flex-1">Codex</TabsTrigger>
                        <TabsTrigger value="chat" className="flex-1">Chat</TabsTrigger>
                    </TabsList>
                </div>
                <TabsContent value="codex" className="flex-1 p-0 overflow-hidden">
                    <CodexList projectId={projectId} seriesId={seriesId} />
                </TabsContent>
                <TabsContent value="chat" className="flex-1 p-0 overflow-hidden">
                    <AIChat projectId={projectId} seriesId={seriesId} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
