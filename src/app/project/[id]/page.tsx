'use client';

import { EditorContainer } from '@/components/editor-container';
import { PlanView } from '@/components/plan/plan-view';
import { ChatInterface } from '@/components/chat/chat-interface';
import { use } from 'react';
import { useProjectStore } from '@/store/use-project-store';

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { viewMode } = useProjectStore();

    return (
        <div className="h-full overflow-hidden">
            {viewMode === 'plan' ? (
                <PlanView projectId={id} />
            ) : viewMode === 'write' ? (
                <EditorContainer projectId={id} />
            ) : viewMode === 'chat' ? (
                <ChatInterface projectId={id} />
            ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                    Review mode coming soon...
                </div>
            )}
        </div>
    );
}
