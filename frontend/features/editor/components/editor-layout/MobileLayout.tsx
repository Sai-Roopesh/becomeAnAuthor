"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { PanelLeft, PanelRight, PenTool } from "lucide-react";
import { TiptapEditor } from "../tiptap-editor";
import { StoryTimeline } from "../story-timeline";
import { FocusModeToggle } from "../FocusModeToggle";
import type { DocumentNode } from "@/domain/entities/types";
import type { ReactNode } from "react";

interface MobileLayoutProps {
  projectId: string;
  seriesId: string; // Required - series-first architecture
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
  // Slot components - avoid cross-feature imports
  renderSidebar: () => ReactNode;
  renderSnippetEditor: (props: {
    snippetId: string;
    onClose: () => void;
  }) => ReactNode;
}

/**
 * Mobile Layout using Sheets for sidebars.
 * Series-first: requires seriesId for editor features
 */
export function MobileLayout({
  projectId,
  seriesId,
  activeScene,
  activeSnippetId,
  showSidebar,
  showTimeline,
  editorWordCount,
  onSetShowSidebar,
  onSetShowTimeline,
  onWordCountChange,
  onCloseSnippet,
  renderSidebar,
  renderSnippetEditor,
}: MobileLayoutProps) {
  const hasActiveScene = !!activeScene && activeScene.type === "scene";

  return (
    <div className="h-full flex flex-col relative bg-background/95 backdrop-blur-sm">
      {/* Mobile Header / Toggles */}
      <div className="flex items-center justify-between p-2 border-b border-border/50 bg-background/80 backdrop-blur-md z-30">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onSetShowSidebar(true)}
        >
          <PanelLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate max-w-truncate-sm">
            {activeScene?.title || "No Scene Selected"}
          </span>
          <FocusModeToggle hasActiveScene={hasActiveScene} />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onSetShowTimeline(true)}
        >
          <PanelRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {activeSnippetId ? (
          renderSnippetEditor({
            snippetId: activeSnippetId,
            onClose: onCloseSnippet,
          })
        ) : activeScene && activeScene.type === "scene" ? (
          <TiptapEditor
            sceneId={activeScene.id}
            projectId={projectId}
            seriesId={seriesId}
            content={
              "content" in activeScene
                ? activeScene.content
                : { type: "doc", content: [] }
            }
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
        <SheetContent side="left" className="p-0 w-[85vw] max-w-mobile-sheet">
          {renderSidebar()}
        </SheetContent>
      </Sheet>

      {/* Right Timeline Sheet */}
      <Sheet open={showTimeline} onOpenChange={onSetShowTimeline}>
        <SheetContent side="right" className="p-0 w-[85vw] max-w-mobile-sheet">
          <StoryTimeline
            projectId={projectId}
            activeSceneWordCount={editorWordCount}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
