
'use client';

import { useProjectStore } from '@/store/use-project-store';
import { ProjectNavigation } from '../../navigation/components/ProjectNavigation';
import { TiptapEditor } from './tiptap-editor';
import { StoryTimeline } from './story-timeline';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState, useEffect, useRef } from 'react';
import { SnippetEditor } from '../../snippets/components/snippet-editor';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from '@/components/ui/button';
import { PinOff, PenTool } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { useNodeRepository } from '@/hooks/use-node-repository';
import { useSnippetRepository } from '@/hooks/use-snippet-repository';
import { saveCoordinator } from '@/lib/core/save-coordinator';
import { cn } from '@/lib/utils';

export function EditorContainer({ projectId }: { projectId: string }) {
    const { activeSceneId } = useProjectStore();
    const [activeSnippetId, setActiveSnippetId] = useState<string | null>(null);
    const [editorWordCount, setEditorWordCount] = useState(0);

    const nodeRepo = useNodeRepository();
    const snippetRepo = useSnippetRepository();

    const activeScene = useLiveQuery(
        async () => activeSceneId ? await nodeRepo.get(activeSceneId) : undefined,
        [activeSceneId, nodeRepo]
    );

    const pinnedSnippets = useLiveQuery(
        () => snippetRepo.getPinned(projectId),
        [projectId, snippetRepo]
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
        // ✅ FIXED: Now uses SaveCoordinator to prevent race conditions
        if (activeSceneId && activeSceneId === prevSceneIdRef.current && debouncedWordCount > 0) {
            saveCoordinator.scheduleSave(activeSceneId, async () => {
                await nodeRepo.updateMetadata(activeSceneId, { wordCount: debouncedWordCount });
            });
        }
        prevSceneIdRef.current = activeSceneId;
    }, [debouncedWordCount, activeSceneId, nodeRepo]);

    return (
        <div className="h-full flex overflow-hidden bg-background/95 backdrop-blur-sm">
            {/* Subtle background texture */}
            <div className="absolute inset-0 z-[-1] opacity-30 pointer-events-none bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)]" />

            <ResizablePanelGroup direction="horizontal">
                <ResizablePanel defaultSize={20} minSize={15} maxSize={30} className="bg-background/50 backdrop-blur-sm border-r border-border/50">
                    <ProjectNavigation projectId={projectId} onSelectSnippet={handleSnippetSelect} />
                </ResizablePanel>

                <ResizableHandle className="w-1 bg-transparent hover:bg-primary/20 transition-colors" />

                <ResizablePanel defaultSize={60}>
                    <ResizablePanelGroup direction="horizontal">
                        {/* Main Editor */}
                        <ResizablePanel defaultSize={78} className="bg-background/30">
                            <div className="h-full flex flex-col min-w-0 relative">
                                {activeSnippetId ? (
                                    <SnippetEditor snippetId={activeSnippetId} onClose={() => setActiveSnippetId(null)} />
                                ) : (activeScene && activeScene.type === 'scene') ? (
                                    <div className="flex-1 flex flex-col h-full overflow-hidden">
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
                                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground animate-in fade-in zoom-in duration-500">
                                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                            <PenTool className="h-8 w-8 text-primary" />
                                        </div>
                                        <h3 className="text-xl font-heading font-bold text-foreground mb-2">Ready to Write?</h3>
                                        <p className="text-sm max-w-xs text-center">
                                            Select a scene from the left sidebar or create a new one to start your masterpiece.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </ResizablePanel>

                        {/* Story Timeline */}
                        {!activeSnippetId && (
                            <>
                                <ResizableHandle className="w-1 bg-transparent hover:bg-primary/20 transition-colors" />
                                <ResizablePanel defaultSize={22} minSize={18} maxSize={30}>
                                    <StoryTimeline projectId={projectId} activeSceneWordCount={editorWordCount} />
                                </ResizablePanel>
                            </>
                        )}
                    </ResizablePanelGroup>
                </ResizablePanel>

                {pinnedSnippets && pinnedSnippets.length > 0 && (
                    <>
                        <ResizableHandle className="w-1 bg-transparent hover:bg-primary/20 transition-colors" />
                        <ResizablePanel defaultSize={20} minSize={15} maxSize={35} className="bg-background/50 backdrop-blur-sm border-l border-border/50">
                            <div className="h-full flex flex-col">
                                <div className="p-3 border-b border-border/50 font-heading font-semibold text-sm text-foreground bg-muted/20">
                                    Pinned Snippets
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-3 p-3">
                                    {pinnedSnippets.map(snippet => (
                                        <div key={snippet.id} className="border border-border/50 rounded-xl p-3 bg-card/50 hover:bg-card hover:shadow-sm transition-all max-h-[300px] overflow-hidden group">
                                            <div className="font-medium text-sm mb-2 flex items-center justify-between">
                                                <span className="truncate text-foreground">{snippet.title}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={async () => {
                                                        await snippetRepo.togglePin(snippet.id);
                                                    }}
                                                    title="Unpin"
                                                >
                                                    <PinOff className="h-3 w-3" />
                                                </Button>
                                            </div>
                                            <div className="text-xs text-muted-foreground prose prose-sm dark:prose-invert max-w-none line-clamp-6 leading-relaxed">
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
