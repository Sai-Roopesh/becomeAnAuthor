"use client";

import { DocumentNode } from "@/domain/entities/types";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown, ChevronRight, LayoutGrid } from "lucide-react";
import { SceneCard } from "./scene-card";
import { useState } from "react";
import { CreateNodeDialog } from "@/features/shared/components";

interface GridViewProps {
  projectId: string;
  seriesId: string; // Required - series-first architecture
  nodes: DocumentNode[];
}

export function GridView({ projectId, seriesId, nodes }: GridViewProps) {
  const [collapsedActs, setCollapsedActs] = useState<Set<string>>(new Set());
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    parentId: string | null;
    type: "act" | "chapter" | "scene";
  }>({ open: false, parentId: null, type: "act" });

  const acts = nodes.filter((n) => n.type === "act");
  const getChildren = (parentId: string) =>
    nodes.filter((n) => n.parentId === parentId);

  const toggleAct = (actId: string) => {
    const newCollapsed = new Set(collapsedActs);
    if (newCollapsed.has(actId)) {
      newCollapsed.delete(actId);
    } else {
      newCollapsed.add(actId);
    }
    setCollapsedActs(newCollapsed);
  };

  const openCreateDialog = (
    parentId: string | null,
    type: "act" | "chapter" | "scene",
  ) => {
    setDialogState({ open: true, parentId, type });
  };

  if (acts.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-in fade-in zoom-in duration-500">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
            <div className="relative bg-background p-6 rounded-full shadow-xl border border-border/50">
              <LayoutGrid className="h-12 w-12 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-heading font-bold">Start Planning</h3>
            <p className="text-muted-foreground max-w-sm">
              Create your first Act to begin structuring your masterpiece.
            </p>
          </div>
          <Button
            onClick={() => openCreateDialog(null, "act")}
            size="lg"
            className="shadow-lg shadow-primary/20"
          >
            <Plus className="h-5 w-5 mr-2" /> Create First Act
          </Button>
        </div>
        <CreateNodeDialog
          open={dialogState.open}
          onOpenChange={(open) => setDialogState((prev) => ({ ...prev, open }))}
          projectId={projectId}
          parentId={dialogState.parentId}
          type={dialogState.type}
        />
      </>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {acts.map((act, actIndex) => {
        const chapters = getChildren(act.id);
        const isExpanded = !collapsedActs.has(act.id);

        return (
          <div
            key={act.id}
            className="group relative animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-backwards"
            style={{ animationDelay: `${actIndex * 100}ms` }}
          >
            {/* Act Section Header - Swimlane Style */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 h-px bg-border" />
              <div className="flex items-center gap-3 bg-card border border-border/50 shadow-sm px-4 py-2 rounded-full">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                  onClick={() => toggleAct(act.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
                <h2 className="text-lg font-heading font-bold text-foreground tracking-tight">
                  {act.title}
                </h2>
                <span className="text-xs font-medium px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                  {chapters.length}{" "}
                  {chapters.length === 1 ? "Chapter" : "Chapters"}
                </span>
                <div className="w-px h-4 bg-border mx-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs hover:text-primary hover:bg-primary/5"
                  onClick={() => openCreateDialog(act.id, "chapter")}
                >
                  <Plus className="h-3 w-3 mr-1" /> Add Chapter
                </Button>
              </div>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Chapters Grid */}
            {isExpanded && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-4">
                {chapters.map((chapter) => {
                  const scenes = getChildren(chapter.id);
                  return (
                    <div
                      key={chapter.id}
                      className="flex flex-col bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all duration-300 group/chapter"
                    >
                      {/* Chapter Header */}
                      <div className="p-4 border-b border-border/50 bg-muted/20 flex items-center justify-between group-hover/chapter:bg-muted/40 transition-colors">
                        <h3
                          className="font-heading font-semibold text-foreground truncate"
                          title={chapter.title}
                        >
                          {chapter.title}
                        </h3>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover/chapter:opacity-100 transition-opacity"
                          onClick={() => openCreateDialog(chapter.id, "scene")}
                          title="Add Scene"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Scenes List - Index Card Style */}
                      <div className="p-3 space-y-2 flex-1">
                        {scenes.map((scene) => (
                          <div
                            key={scene.id}
                            className="transform transition-transform hover:-translate-y-0.5"
                          >
                            <SceneCard scene={scene} seriesId={seriesId} />
                          </div>
                        ))}

                        {scenes.length === 0 && (
                          <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50 py-8 border-2 border-dashed border-border/30 rounded-lg m-1">
                            <span className="text-xs font-medium">
                              Empty Chapter
                            </span>
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-2xs mt-1 text-primary/70"
                              onClick={() =>
                                openCreateDialog(chapter.id, "scene")
                              }
                            >
                              + Add Scene
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Footer Stats */}
                      <div className="px-4 py-2 bg-muted/10 border-t border-border/30 text-2xs text-muted-foreground flex justify-between">
                        <span>{scenes.length} Scenes</span>
                        <span>
                          {scenes.reduce(
                            (acc, s) =>
                              acc + (s.type === "scene" ? s.wordCount || 0 : 0),
                            0,
                          )}{" "}
                          words
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Add Chapter Card */}
                <button
                  onClick={() => openCreateDialog(act.id, "chapter")}
                  className="flex flex-col items-center justify-center h-full border-2 border-dashed border-border/40 rounded-xl hover:border-primary/40 hover:bg-primary/5 transition-all group/add aspect-[4/5]"
                >
                  <div className="p-3 rounded-full bg-muted group-hover/add:bg-primary/10 transition-colors mb-2">
                    <Plus className="h-6 w-6 text-muted-foreground group-hover/add:text-primary" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground group-hover/add:text-primary">
                    New Chapter
                  </span>
                </button>
              </div>
            )}
          </div>
        );
      })}

      <CreateNodeDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState((prev) => ({ ...prev, open }))}
        projectId={projectId}
        parentId={dialogState.parentId}
        type={dialogState.type}
      />
    </div>
  );
}
