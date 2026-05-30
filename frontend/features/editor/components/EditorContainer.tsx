"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
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
import { ProjectNavigation } from "@/features/navigation";
import { SnippetEditor, SnippetList } from "@/features/snippets";
import { CodexList } from "@/features/codex";
import { NodeActionsMenu } from "@/features/editor/components/NodeActionsMenu";

import type {
  CollaborationStatus,
  CollaborationPeer,
} from "@/domain/entities/types";

type CollaborationPanelProps = {
  status: CollaborationStatus;
  peers: CollaborationPeer[];
  roomId: string;
  enabled: boolean;
  isJoinedRoom: boolean;
  onToggle: (enabled: boolean) => void;
  onJoinRoom: (roomId: string) => void;
  onLeaveRoom: () => void;
};

interface EditorContainerProps {
  projectId: string;
  renderCollaborationPanel?:
    | ((props: CollaborationPanelProps) => ReactNode)
    | undefined;
}

/**
 * EditorContainer - Refactored
 * Main orchestrator for the editor with responsive layout switching.
 * Series-first: fetches project to get seriesId for editor features
 */
export function EditorContainer({
  projectId,
  renderCollaborationPanel,
}: EditorContainerProps) {
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
  const { data: project } = useLiveQuery(
    () => projectRepo.get(projectId),
    [projectId, projectRepo],
  );

  const { data: activeScene } = useLiveQuery(
    async () => (activeSceneId ? await nodeRepo.get(activeSceneId) : undefined),
    [activeSceneId, nodeRepo],
  );

  const { data: pinnedSnippets } = useLiveQuery(
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
      <ErrorBoundary name="Focus Mode">
        <FocusModeLayout
          activeScene={activeScene}
          projectId={projectId}
          seriesId={project.seriesId}
          editorWordCount={editorWordCount}
          onWordCountChange={handleWordCountUpdate}
          onExitFocusMode={toggleFocusMode}
          renderCollaborationPanel={renderCollaborationPanel}
        />
      </ErrorBoundary>
    );
  }

  // Mobile Layout using Sheets
  if (isMobile) {
    return (
      <ErrorBoundary name="Mobile Editor">
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
          renderCollaborationPanel={renderCollaborationPanel}
        />
      </ErrorBoundary>
    );
  }

  // Desktop Layout (Existing ResizablePanels)
  return (
    <ErrorBoundary name="Desktop Editor">
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
        renderCollaborationPanel={renderCollaborationPanel}
      />
    </ErrorBoundary>
  );
}
