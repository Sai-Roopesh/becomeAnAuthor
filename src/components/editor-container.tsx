'use client';

import { useProjectStore } from '@/store/use-project-store';
import { ProjectNavigation } from './project-navigation';
import { TiptapEditor } from '@/features/editor/components/tiptap-editor';
import { EditorToolbar } from '@/features/editor/components/editor-toolbar';
import { StoryTimeline } from '@/features/editor/components/story-timeline';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useState, useEffect, useRef } from 'react';
import { SnippetEditor } from '@/features/snippets/components/snippet-editor';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from '@/components/ui/button';
import { PinOff } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';

export function EditorContainer({ projectId }: { projectId: string }) {
    const { activeSceneId } = useProjectStore();
    const [activeSnippetId, setActiveSnippetId] = useState<string | null>(null);
    const [editorWordCount, setEditorWordCount] = useState(0);

    const activeScene = useLiveQuery(
        async () => activeSceneId ? await db.nodes.get(activeSceneId) : undefined,
        [activeSceneId]
    );

    const pinnedSnippets = useLiveQuery(
        () => db.snippets.where('projectId').equals(projectId).filter(s => s.pinned).toArray()
    );

    const handleSnippetSelect = (id: string) => {
        setActiveSnippetId(id);
    };

    const handleWordCountUpdate = (count: number) => {
        setEditorWordCount(count);
    };

    // Persist word count to database (debounced)
    const debouncedWordCount = useDebounce(editorWordCount, 2000);
    const prevSceneIdRef = useRef(activeSceneId);

    useEffect(() => {
        // Only update if we have an active scene and it's the same scene
        if (activeSceneId && activeSceneId === prevSceneIdRef.current && debouncedWordCount > 0) {
            db.nodes.update(activeSceneId, { wordCount: debouncedWordCount } as any);
        }
        prevSceneIdRef.current = activeSceneId;
    }, [debouncedWordCount, activeSceneId]);

    return (
        <div className="h-full flex overflow-hidden">
            <ResizablePanelGroup direction="horizontal">
                <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
                    <ProjectNavigation projectId={projectId} onSelectSnippet={handleSnippetSelect} />
                </ResizablePanel>

                <ResizableHandle />

                <ResizablePanel defaultSize={60}>
                    <ResizablePanelGroup direction="horizontal">
                        {/* Main Editor */}
                        <ResizablePanel defaultSize={78}>
                            <div className="h-full flex flex-col min-w-0 bg-background">
                                {activeSnippetId ? (
                                    <SnippetEditor snippetId={activeSnippetId} onClose={() => setActiveSnippetId(null)} />
                                ) : (activeScene && activeScene.type === 'scene') ? (
                                    <div className="flex-1 flex flex-col h-full overflow-hidden">
                                        <div className="border-b px-8 py-4">
                                            <h1 className="text-3xl font-bold">{activeScene.title}</h1>
                                        </div>
                                        <div className="flex-1 overflow-hidden relative">
                                            <TiptapEditor
                                                sceneId={activeScene.id}
                                                projectId={projectId}
                                                content={'content' in activeScene ? activeScene.content : { type: 'doc', content: [] }}
                                                onWordCountChange={handleWordCountUpdate}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                                        Select a scene or snippet to start writing.
                                    </div>
                                )}
                            </div>
                        </ResizablePanel>

                        {/* Story Timeline */}
                        {!activeSnippetId && (
                            <>
                                <ResizableHandle />
                                <ResizablePanel defaultSize={22} minSize={18} maxSize={30}>
                                    <StoryTimeline projectId={projectId} activeSceneWordCount={editorWordCount} />
                                </ResizablePanel>
                            </>
                        )}
                    </ResizablePanelGroup>
                </ResizablePanel>

                {pinnedSnippets && pinnedSnippets.length > 0 && (
                    <>
                        <ResizableHandle />
                        <ResizablePanel defaultSize={20} minSize={15} maxSize={35}>
                            <div className="h-full flex flex-col border-l bg-muted/10">
                                <div className="p-2 border-b font-semibold text-sm text-muted-foreground">
                                    Pinned Snippets
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-2 p-2">
                                    {pinnedSnippets.map(snippet => (
                                        <div key={snippet.id} className="border rounded-lg p-3 bg-background max-h-[300px] overflow-hidden">
                                            <div className="font-medium text-sm mb-2 flex items-center justify-between">
                                                <span className="truncate">{snippet.title}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-5 w-5"
                                                    onClick={async () => {
                                                        await db.snippets.update(snippet.id, { pinned: false });
                                                    }}
                                                    title="Unpin"
                                                >
                                                    <PinOff className="h-3 w-3" />
                                                </Button>
                                            </div>
                                            <div className="text-xs text-muted-foreground prose prose-sm dark:prose-invert max-w-none line-clamp-10">
                                                {snippet.content?.content?.[0]?.content?.[0]?.text || 'Empty snippet'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </ResizablePanel>
                    </>
                )}
            </ResizablePanelGroup>
        </div>
    );
}
