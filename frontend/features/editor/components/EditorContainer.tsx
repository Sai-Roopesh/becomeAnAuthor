"use client";

import { useState, useEffect, useCallback } from "react";
import { useProjectStore } from "@/store/use-project-store";
import { useFormatStore } from "@/store/use-format-store";
import { useLiveQuery } from "@/hooks/use-live-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAppServices } from "@/infrastructure/di/AppContext";
import { useSnippetRepository } from "@/hooks/use-snippet-repository";
import { useEditorState } from "../hooks/useEditorState";
import { FocusModeLayout } from "./editor-layout/FocusModeLayout";
import { MobileLayout } from "./editor-layout/MobileLayout";
import { DesktopLayout } from "./editor-layout/DesktopLayout";
import { ErrorBoundary } from "@/features/shared/components";
// Import slot components at app/feature boundary level
import { ProjectNavigation } from "@/features/navigation/components/ProjectNavigation";
import { SnippetEditor } from "@/features/snippets/components/snippet-editor";
import { SnippetList } from "@/features/snippets/components/snippet-list";
import { CodexList } from "@/features/codex/components/codex-list";
import { NodeActionsMenu } from "@/features/editor/components/NodeActionsMenu";

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

  const { nodeRepository: nodeRepo, projectRepository: projectRepo } =
    useAppServices();
  const snippetRepo = useSnippetRepository();

  // Editor state management
  const { editorWordCount, handleWordCountUpdate } = useEditorState();

  // Fetch project to get seriesId
  const project = useLiveQuery(
    () => projectRepo.get(projectId),
    [projectId, projectRepo],
  );

  const activeScene = useLiveQuery(
    async () => (activeSceneId ? await nodeRepo.get(activeSceneId) : undefined),
    [activeSceneId, nodeRepo],
  );

  const pinnedSnippets = useLiveQuery(
    () => snippetRepo.getPinned(projectId),
    [projectId, snippetRepo],
  );

  const handleSnippetSelect = useCallback(
    (id: string) => {
      setActiveSnippetId(id);
      if (isMobile) setShowSidebar(false);
    },
    [isMobile, setShowSidebar],
  );

  const handleSnippetDelete = useCallback((id: string) => {
    setActiveSnippetId((current) => (current === id ? null : current));
  }, []);

  const handleCloseSnippet = () => setActiveSnippetId(null);

  // Check if we have an active scene
  const hasActiveScene = Boolean(activeScene && activeScene.type === "scene");

  // Slot render functions - compose features at container level
  const renderSidebar = useCallback(
    () => (
      <ProjectNavigation
        projectId={projectId}
        onSelectSnippet={handleSnippetSelect}
        onDeleteSnippet={handleSnippetDelete}
        renderSnippetList={(props) => (
          <SnippetList
            projectId={props.projectId}
            onSelect={props.onSelect}
            {...(props.onDeleteSnippet && {
              onDeleteSnippet: props.onDeleteSnippet,
            })}
          />
        )}
        renderCodexList={(props) => (
          <CodexList
            seriesId={props.seriesId}
            selectedEntityId={props.selectedEntityId}
            onSelectedEntityIdChange={props.onSelectedEntityIdChange}
          />
        )}
        renderNodeActionsMenu={(props) => (
          <NodeActionsMenu
            nodeId={props.nodeId}
            nodeType={props.nodeType}
            onDelete={props.onDelete}
          />
        )}
      />
    ),
    [projectId, handleSnippetSelect, handleSnippetDelete],
  );

  const renderSnippetEditor = useCallback(
    (props: { snippetId: string; onClose: () => void }) => (
      <SnippetEditor snippetId={props.snippetId} onClose={props.onClose} />
    ),
    [],
  );

  // Keyboard shortcuts for Focus Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + F = Toggle Focus Mode (only when scene is active)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "f") {
        e.preventDefault();
        if (hasActiveScene || focusMode) {
          toggleFocusMode();
        }
      }
      // Escape = Exit Focus Mode
      if (e.key === "Escape" && focusMode) {
        e.preventDefault();
        toggleFocusMode();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
  if (focusMode && activeScene && activeScene.type === "scene") {
    return (
      <ErrorBoundary name="Focus Mode" maxRetries={3}>
        <FocusModeLayout
          activeScene={activeScene}
          projectId={projectId}
          seriesId={project.seriesId}
          editorWordCount={editorWordCount}
          onWordCountChange={handleWordCountUpdate}
          onExitFocusMode={toggleFocusMode}
        />
      </ErrorBoundary>
    );
  }

  // Mobile Layout using Sheets
  if (isMobile) {
    return (
      <ErrorBoundary name="Mobile Editor" maxRetries={3}>
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
          renderSidebar={renderSidebar}
          renderSnippetEditor={renderSnippetEditor}
        />
      </ErrorBoundary>
    );
  }

  // Desktop Layout (Existing ResizablePanels)
  return (
    <ErrorBoundary name="Desktop Editor" maxRetries={3}>
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
        renderSidebar={renderSidebar}
        renderSnippetEditor={renderSnippetEditor}
      />
    </ErrorBoundary>
  );
}
