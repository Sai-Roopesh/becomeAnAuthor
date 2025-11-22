'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CodexList } from '@/components/codex/codex-list';
import { AIChat } from '@/components/ai-chat';
import { SettingsDialog } from '@/components/settings-dialog';

export function ProjectTools({ projectId }: { projectId: string }) {
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
                    <CodexList projectId={projectId} />
                </TabsContent>
                <TabsContent value="chat" className="flex-1 p-0 overflow-hidden">
                    <AIChat />
                </TabsContent>
            </Tabs>
        </div>
    );
}
