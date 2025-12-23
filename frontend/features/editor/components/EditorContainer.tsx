'use client';

import { useState, useEffect } from 'react';
import { useProjectStore } from '@/store/use-project-store';
import { useFormatStore } from '@/store/use-format-store';
import { useLiveQuery } from '@/hooks/use-live-query';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAppServices } from '@/infrastructure/di/AppContext';
import { useSnippetRepository } from '@/hooks/use-snippet-repository';
import { useEditorState } from '../hooks/useEditorState';
import { FocusModeLayout } from './editor-layout/FocusModeLayout';
import { MobileLayout } from './editor-layout/MobileLayout';
import { DesktopLayout } from './editor-layout/DesktopLayout';

/**
 * EditorContainer - Refactored
 * Main orchestrator for the editor with responsive layout switching.
 * Series-first: fetches project to get seriesId for editor features
 */
export function EditorContainer({ projectId }: { projectId: string }) {
    const {
        activeSceneId,
        showSidebar,
        showTimeline,
        toggleSidebar,
        toggleTimeline,
        setShowSidebar,
        setShowTimeline,
    } = useProjectStore();
    const { focusMode, toggleFocusMode } = useFormatStore();
    const [activeSnippetId, setActiveSnippetId] = useState<string | null>(null);
    const isMobile = useIsMobile();

    const { nodeRepository: nodeRepo, projectRepository: projectRepo } = useAppServices();
    const snippetRepo = useSnippetRepository();

    // Editor state management
    const { editorWordCount, handleWordCountUpdate } = useEditorState(activeSceneId);

    // Fetch project to get seriesId
    const project = useLiveQuery(
        () => projectRepo.get(projectId),
        [projectId, projectRepo]
    );

    const activeScene = useLiveQuery(
        async () => (activeSceneId ? await nodeRepo.get(activeSceneId) : undefined),
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

    const handleCloseSnippet = () => setActiveSnippetId(null);

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

    // Wait for project to load
    if (!project) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground">
                Loading project...
            </div>
        );
    }

    // Focus Mode Overlay - Full Screen Distraction-Free Writing
    if (focusMode && activeScene && activeScene.type === 'scene') {
        return (
            <FocusModeLayout
                activeScene={activeScene}
                projectId={projectId}
                seriesId={project.seriesId}
                editorWordCount={editorWordCount}
                onWordCountChange={handleWordCountUpdate}
                onExitFocusMode={toggleFocusMode}
            />
        );
    }

    // Mobile Layout using Sheets
    if (isMobile) {
        return (
            <MobileLayout
                projectId={projectId}
                seriesId={project.seriesId}
                activeScene={activeScene}
                activeSnippetId={activeSnippetId}
                showSidebar={showSidebar}
                showTimeline={showTimeline}
                editorWordCount={editorWordCount}
                onSetShowSidebar={setShowSidebar}
                onSetShowTimeline={setShowTimeline}
                onWordCountChange={handleWordCountUpdate}
                onSnippetSelect={handleSnippetSelect}
                onCloseSnippet={handleCloseSnippet}
            />
        );
    }

    // Desktop Layout (Existing ResizablePanels)
    return (
        <DesktopLayout
            projectId={projectId}
            seriesId={project.seriesId}
            activeScene={activeScene}
            activeSnippetId={activeSnippetId}
            showSidebar={showSidebar}
            showTimeline={showTimeline}
            hasActiveScene={hasActiveScene}
            editorWordCount={editorWordCount}
            pinnedSnippets={pinnedSnippets}
            snippetRepo={snippetRepo}
            onToggleSidebar={toggleSidebar}
            onToggleTimeline={toggleTimeline}
            onWordCountChange={handleWordCountUpdate}
            onSnippetSelect={handleSnippetSelect}
            onCloseSnippet={handleCloseSnippet}
        />
    );
}
