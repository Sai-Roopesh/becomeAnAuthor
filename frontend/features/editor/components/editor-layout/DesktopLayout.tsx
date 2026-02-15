"use client";

import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  PanelLeft,
  PanelLeftClose,
  PanelRight,
  PanelRightClose,
  PenTool,
  PinOff,
} from "lucide-react";
import { TiptapEditor } from "../tiptap-editor";
import { WriteRightPanel } from "../write-right-panel";
import { FocusModeToggle } from "../FocusModeToggle";
import type { DocumentNode, Snippet } from "@/domain/entities/types";
import type { ISnippetRepository } from "@/domain/repositories/ISnippetRepository";
import { isElementNode } from "@/shared/types/tiptap";
import type { ReactNode } from "react";
import { DecorativeGrid } from "@/components/ui/decorative-grid";

interface DesktopLayoutProps {
  projectId: string;
  seriesId: string; // Required - series-first architecture
  activeScene: DocumentNode | undefined;
  activeSnippetId: string | null;
  showSidebar: boolean;
  showTimeline: boolean;
  hasActiveScene: boolean;
  editorWordCount: number;
  pinnedSnippets: Snippet[] | undefined;
  snippetRepo: ISnippetRepository;
  onToggleSidebar: () => void;
  onToggleTimeline: () => void;
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
 * Desktop Layout using ResizablePanels for multi-column layout.
 * Series-first: requires seriesId for editor features
 */
export function DesktopLayout({
  projectId,
  seriesId,
  activeScene,
  activeSnippetId,
  showSidebar,
  showTimeline,
  hasActiveScene,
  editorWordCount,
  pinnedSnippets,
  snippetRepo,
  onToggleSidebar,
  onToggleTimeline,
  onWordCountChange,
  onCloseSnippet,
  renderSidebar,
  renderSnippetEditor,
}: DesktopLayoutProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-full flex overflow-hidden bg-background/95 backdrop-blur-sm">
        {/* Subtle background texture */}
        <DecorativeGrid />

        {/* Toggle buttons - fixed position */}
        <div className="absolute top-2 left-2 z-30 flex gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 bg-background/80 backdrop-blur-sm border border-border/50"
                onClick={onToggleSidebar}
              >
                {showSidebar ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeft className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {showSidebar ? "Hide Sidebar" : "Show Sidebar"}
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
                onClick={onToggleTimeline}
              >
                {showTimeline ? (
                  <PanelRightClose className="h-4 w-4" />
                ) : (
                  <PanelRight className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {showTimeline ? "Hide Timeline" : "Show Timeline"}
            </TooltipContent>
          </Tooltip>
        </div>

        <ResizablePanelGroup direction="horizontal">
          {showSidebar && (
            <>
              <ResizablePanel
                defaultSize={20}
                minSize={15}
                maxSize={30}
                className="min-w-0 bg-background/50 backdrop-blur-sm border-r border-border/50"
              >
                {renderSidebar()}
              </ResizablePanel>
              <ResizableHandle className="w-1 bg-transparent hover:bg-primary/20 transition-colors" />
            </>
          )}

          <ResizablePanel defaultSize={showSidebar ? 60 : 80}>
            <ResizablePanelGroup direction="horizontal">
              {/* Main Editor */}
              <ResizablePanel
                defaultSize={showTimeline ? 78 : 100}
                className="bg-background/30"
              >
                <div className="h-full flex flex-col min-w-0 relative">
                  {activeSnippetId ? (
                    renderSnippetEditor({
                      snippetId: activeSnippetId,
                      onClose: onCloseSnippet,
                    })
                  ) : activeScene && activeScene.type === "scene" ? (
                    <div className="flex-1 flex flex-col h-full overflow-hidden">
                      <div className="flex-1 overflow-hidden relative">
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
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground animate-in fade-in zoom-in duration-500">
                      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <PenTool className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-xl font-heading font-bold text-foreground mb-2">
                        Ready to Write?
                      </h3>
                      <p className="text-sm max-w-xs text-center">
                        Select a scene from the{" "}
                        {!showSidebar && (
                          <button
                            onClick={onToggleSidebar}
                            className="text-primary underline"
                          >
                            sidebar
                          </button>
                        )}
                        {showSidebar && "left sidebar"} or create a new one to
                        start your masterpiece.
                      </p>
                    </div>
                  )}
                </div>
              </ResizablePanel>

              {/* Right Panel (Timeline, Notes, Comments, Analysis) */}
              {!activeSnippetId && showTimeline && (
                <>
                  <ResizableHandle className="w-1 bg-transparent hover:bg-primary/20 transition-colors" />
                  <ResizablePanel defaultSize={22} minSize={18} maxSize={30}>
                    <WriteRightPanel
                      projectId={projectId}
                      activeSceneId={activeScene?.id || null}
                      activeSceneWordCount={editorWordCount}
                    />
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </ResizablePanel>

          {pinnedSnippets && pinnedSnippets.length > 0 && (
            <>
              <ResizableHandle className="w-1 bg-transparent hover:bg-primary/20 transition-colors" />
              <ResizablePanel
                defaultSize={20}
                minSize={15}
                maxSize={35}
                className="bg-background/50 backdrop-blur-sm border-l border-border/50"
              >
                <div className="h-full flex flex-col">
                  <div className="p-3 border-b border-border/50 font-heading font-semibold text-sm text-foreground bg-muted/20">
                    Pinned Snippets
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-3 p-3">
                    {pinnedSnippets.map((snippet) => (
                      <div
                        key={snippet.id}
                        className="border border-border/50 rounded-xl p-3 bg-card/50 hover:bg-card hover:shadow-sm transition-all max-h-[30vh] overflow-hidden group"
                      >
                        <div className="font-medium text-sm mb-2 flex items-center justify-between">
                          <span className="truncate text-foreground">
                            {snippet.title}
                          </span>
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
                          {(() => {
                            const firstNode = snippet.content?.content?.[0];
                            if (!firstNode || !isElementNode(firstNode))
                              return "Empty snippet";
                            // Now TypeScript knows firstNode has content property
                            const firstContent = firstNode.content?.[0];
                            if (!firstContent || !("text" in firstContent))
                              return "Empty snippet";
                            return firstContent.text;
                          })()}
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
