'use client';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { PanelLeft, PanelRight, PenTool } from 'lucide-react';
import { TiptapEditor } from '../tiptap-editor';
import { SnippetEditor } from '../../../snippets/components/snippet-editor';
import { ProjectNavigation } from '../../../navigation/components/ProjectNavigation';
import { StoryTimeline } from '../story-timeline';
import type { DocumentNode } from '@/lib/config/types';

interface MobileLayoutProps {
    projectId: string;
    activeScene: DocumentNode | undefined;
    activeSnippetId: string | null;
    showSidebar: boolean;
    showTimeline: boolean;
    editorWordCount: number;
    onSetShowSidebar: (show: boolean) => void;
    onSetShowTimeline: (show: boolean) => void;
    onWordCountChange: (count: number) => void;
    onSnippetSelect: (id: string) => void;
    onCloseSnippet: () => void;
}

/**
 * Mobile Layout using Sheets for sidebars.
 */
export function MobileLayout({
    projectId,
    activeScene,
    activeSnippetId,
    showSidebar,
    showTimeline,
    editorWordCount,
    onSetShowSidebar,
    onSetShowTimeline,
    onWordCountChange,
    onSnippetSelect,
    onCloseSnippet,
}: MobileLayoutProps) {
    return (
        <div className="h-full flex flex-col relative bg-background/95 backdrop-blur-sm">
            {/* Mobile Header / Toggles */}
            <div className="flex items-center justify-between p-2 border-b border-border/50 bg-background/80 backdrop-blur-md z-30">
                <Button variant="ghost" size="icon" onClick={() => onSetShowSidebar(true)}>
                    <PanelLeft className="h-5 w-5" />
                </Button>
                <span className="text-sm font-medium truncate max-w-[200px]">
                    {activeScene?.title || 'No Scene Selected'}
                </span>
                <Button variant="ghost" size="icon" onClick={() => onSetShowTimeline(true)}>
                    <PanelRight className="h-5 w-5" />
                </Button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden relative">
                {activeSnippetId ? (
                    <SnippetEditor snippetId={activeSnippetId} onClose={onCloseSnippet} />
                ) : activeScene && activeScene.type === 'scene' ? (
                    <TiptapEditor
                        sceneId={activeScene.id}
                        projectId={projectId}
                        content={'content' in activeScene ? activeScene.content : { type: 'doc', content: [] }}
                        onWordCountChange={onWordCountChange}
                    />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-4">
                        <PenTool className="h-12 w-12 text-primary/20 mb-4" />
                        <p className="text-center">Select a scene to start writing</p>
                    </div>
                )}
            </div>

            {/* Left Sidebar Sheet */}
            <Sheet open={showSidebar} onOpenChange={onSetShowSidebar}>
                <SheetContent side="left" className="p-0 w-[85vw] sm:w-[350px]">
                    <ProjectNavigation projectId={projectId} onSelectSnippet={onSnippetSelect} />
                </SheetContent>
            </Sheet>

            {/* Right Timeline Sheet */}
            <Sheet open={showTimeline} onOpenChange={onSetShowTimeline}>
                <SheetContent side="right" className="p-0 w-[85vw] sm:w-[350px]">
                    <StoryTimeline projectId={projectId} activeSceneWordCount={editorWordCount} />
                </SheetContent>
            </Sheet>
        </div>
    );
}
