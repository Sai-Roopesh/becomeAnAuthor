
'use client';

import { useProjectStore } from '@/store/use-project-store';
import { useFormatStore } from '@/store/use-format-store';
import { ProjectNavigation } from '../../navigation/components/ProjectNavigation';
import { TiptapEditor } from './tiptap-editor';
import { StoryTimeline } from './story-timeline';
import { useLiveQuery } from '@/hooks/use-live-query';
import { useState, useEffect, useRef, useCallback } from 'react';
import { SnippetEditor } from '../../snippets/components/snippet-editor';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from '@/components/ui/button';
import { PinOff, PenTool, PanelLeftClose, PanelLeft, PanelRightClose, PanelRight, Minimize2, X } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useNodeRepository } from '@/hooks/use-node-repository';
import { useSnippetRepository } from '@/hooks/use-snippet-repository';
import { saveCoordinator } from '@/lib/core/save-coordinator';
import { cn } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { FocusModeToggle } from './FocusModeToggle';

export function EditorContainer({ projectId }: { projectId: string }) {
    const { activeSceneId, showSidebar, showTimeline, toggleSidebar, toggleTimeline, setShowSidebar, setShowTimeline } = useProjectStore();
    const { focusMode, toggleFocusMode } = useFormatStore();
    const [activeSnippetId, setActiveSnippetId] = useState<string | null>(null);
    const [editorWordCount, setEditorWordCount] = useState(0);
    const isMobile = useIsMobile();

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
        if (isMobile) setShowSidebar(false);
    };

    const handleWordCountUpdate = (count: number) => {
        setEditorWordCount(count);
    };

    // Check if we have an active scene
    const hasActiveScene = Boolean(activeScene && activeScene.type === 'scene');

    // Keyboard shortcuts for Focus Mode
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd/Ctrl + Shift + F = Toggle Focus Mode (only when scene is active)
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'f') {
                e.preventDefault();
                if (hasActiveScene || focusMode) {
                    toggleFocusMode();
                }
            }
            // Escape = Exit Focus Mode
            if (e.key === 'Escape' && focusMode) {
                e.preventDefault();
                toggleFocusMode();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [focusMode, toggleFocusMode, hasActiveScene]);

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

    // Focus Mode Overlay - Full Screen Distraction-Free Writing
    if (focusMode && activeScene && activeScene.type === 'scene') {
        return (
            <div className="fixed inset-0 z-50 bg-background flex flex-col">
                {/* Focus Mode Header - Minimal */}
                <div className="absolute top-4 right-4 z-10 flex items-center gap-2 opacity-30 hover:opacity-100 transition-opacity">
                    <span className="text-xs text-muted-foreground">
                        {editorWordCount.toLocaleString()} words
                    </span>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={toggleFocusMode}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Exit Focus Mode (Esc)</TooltipContent>
                    </Tooltip>
                </div>

                {/* Centered Editor */}
                <div className="flex-1 overflow-y-auto flex justify-center pt-16 pb-32">
                    <div className="w-full max-w-3xl px-8">
                        <TiptapEditor
                            sceneId={activeScene.id}
                            projectId={projectId}
                            content={'content' in activeScene ? activeScene.content : { type: 'doc', content: [] }}
                            onWordCountChange={handleWordCountUpdate}
                        />
                    </div>
                </div>

                {/* Bottom hint */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-muted-foreground/50">
                    Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Esc</kbd> to exit focus mode
                </div>
            </div>
        );
    }

    // Mobile Layout using Sheets
    if (isMobile) {
        return (
            <div className="h-full flex flex-col relative bg-background/95 backdrop-blur-sm">
                {/* Mobile Header / Toggles */}
                <div className="flex items-center justify-between p-2 border-b border-border/50 bg-background/80 backdrop-blur-md z-30">
                    <Button variant="ghost" size="icon" onClick={() => setShowSidebar(true)}>
                        <PanelLeft className="h-5 w-5" />
                    </Button>
                    <span className="text-sm font-medium truncate max-w-[200px]">
                        {activeScene?.title || 'No Scene Selected'}
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => setShowTimeline(true)}>
                        <PanelRight className="h-5 w-5" />
                    </Button>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden relative">
                    {activeSnippetId ? (
                        <SnippetEditor snippetId={activeSnippetId} onClose={() => setActiveSnippetId(null)} />
                    ) : (activeScene && activeScene.type === 'scene') ? (
                        <TiptapEditor
                            sceneId={activeScene.id}
                            projectId={projectId}
                            content={'content' in activeScene ? activeScene.content : { type: 'doc', content: [] }}
                            onWordCountChange={handleWordCountUpdate}
                        />
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-4">
                            <PenTool className="h-12 w-12 text-primary/20 mb-4" />
                            <p className="text-center">Select a scene to start writing</p>
                        </div>
                    )}
                </div>

                {/* Left Sidebar Sheet */}
                <Sheet open={showSidebar} onOpenChange={setShowSidebar}>
                    <SheetContent side="left" className="p-0 w-[85vw] sm:w-[350px]">
                        <ProjectNavigation projectId={projectId} onSelectSnippet={handleSnippetSelect} />
                    </SheetContent>
                </Sheet>

                {/* Right Timeline Sheet */}
                <Sheet open={showTimeline} onOpenChange={setShowTimeline}>
                    <SheetContent side="right" className="p-0 w-[85vw] sm:w-[350px]">
                        <StoryTimeline projectId={projectId} activeSceneWordCount={editorWordCount} />
                    </SheetContent>
                </Sheet>
            </div>
        );
    }

    // Desktop Layout (Existing ResizablePanels)
    return (
        <TooltipProvider delayDuration={300}>
            <div className="h-full flex overflow-hidden bg-background/95 backdrop-blur-sm">
                {/* Subtle background texture */}
                <div className="absolute inset-0 z-[-1] opacity-30 pointer-events-none bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)]" />

                {/* Toggle buttons - fixed position */}
                <div className="absolute top-2 left-2 z-30 flex gap-1">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 bg-background/80 backdrop-blur-sm border border-border/50"
                                onClick={toggleSidebar}
                            >
                                {showSidebar ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                            {showSidebar ? 'Hide Sidebar' : 'Show Sidebar'}
                        </TooltipContent>
                    </Tooltip>
                </div>

                <div className="absolute top-2 right-2 z-30 flex gap-1">
                    {/* Focus Mode Toggle */}
                    <FocusModeToggle hasActiveScene={hasActiveScene} />

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 bg-background/80 backdrop-blur-sm border border-border/50"
                                onClick={toggleTimeline}
                            >
                                {showTimeline ? <PanelRightClose className="h-4 w-4" /> : <PanelRight className="h-4 w-4" />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                            {showTimeline ? 'Hide Timeline' : 'Show Timeline'}
                        </TooltipContent>
                    </Tooltip>
                </div>

                <ResizablePanelGroup direction="horizontal">
                    {showSidebar && (
                        <>
                            <ResizablePanel defaultSize={20} minSize={15} maxSize={30} className="bg-background/50 backdrop-blur-sm border-r border-border/50">
                                <ProjectNavigation projectId={projectId} onSelectSnippet={handleSnippetSelect} />
                            </ResizablePanel>
                            <ResizableHandle className="w-1 bg-transparent hover:bg-primary/20 transition-colors" />
                        </>
                    )}

                    <ResizablePanel defaultSize={showSidebar ? 60 : 80}>
                        <ResizablePanelGroup direction="horizontal">
                            {/* Main Editor */}
                            <ResizablePanel defaultSize={showTimeline ? 78 : 100} className="bg-background/30">
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
                                                Select a scene from the {!showSidebar && <button onClick={toggleSidebar} className="text-primary underline">sidebar</button>}{showSidebar && 'left sidebar'} or create a new one to start your masterpiece.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </ResizablePanel>

                            {/* Story Timeline */}
                            {!activeSnippetId && showTimeline && (
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
        </TooltipProvider>
    );
}


