"use client";

import { useLiveQuery, invalidateQueries } from "@/hooks/use-live-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProjectStore } from "@/store/use-project-store";
import type { LeftSidebarTab } from "@/store/use-project-store";
import { cn } from "@/lib/utils";
import { DocumentNode } from "@/domain/entities/types";
import {
  Plus,
  FileText,
  Folder,
  Book,
  ChevronRight,
  ChevronDown,
  Users,
  MoreHorizontal,
  RotateCcw,
} from "lucide-react";
import { logger } from "@/shared/utils/logger";

const log = logger.scope("ProjectNavigation");

import { useState, useEffect, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { CreateNodeDialog } from "@/features/shared/components";
import { IdeasSection } from "../components/ideas-section";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/shared/utils/toast-service";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProjectSettingsDialog } from "../../project/components/ProjectSettingsDialog";
import { useAppServices } from "@/infrastructure/di/AppContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProjectNavigationProps {
  projectId: string;
  onSelectSnippet?: (id: string) => void;
  // Slot props for cross-feature components
  renderSnippetList?: (props: {
    projectId: string;
    onSelect: (id: string) => void;
  }) => ReactNode;
  renderCodexList?: (props: {
    seriesId: string;
    selectedEntityId: string | null;
    onSelectedEntityIdChange: (id: string | null) => void;
  }) => ReactNode;
  renderNodeActionsMenu?: (props: {
    nodeId: string;
    nodeType: "act" | "chapter" | "scene";
    onDelete: (id: string, type: "act" | "chapter" | "scene") => void;
  }) => ReactNode;
}

export function ProjectNavigation({
  projectId,
  onSelectSnippet,
  renderSnippetList,
  renderCodexList,
  renderNodeActionsMenu,
}: ProjectNavigationProps) {
  const { projectRepository: projectRepo, nodeRepository: nodeRepo } =
    useAppServices();

  const project = useLiveQuery(
    () => projectRepo.get(projectId),
    [projectId, projectRepo],
  );
  const nodes = useLiveQuery(
    () => nodeRepo.getByProject(projectId),
    [projectId, nodeRepo],
  );
  const {
    activeSceneId,
    setActiveSceneId,
    leftSidebarTab,
    setLeftSidebarTab,
    activeCodexEntryId,
    setActiveCodexEntryId,
  } = useProjectStore();
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>(
    {},
  );

  const [dialogState, setDialogState] = useState<{
    open: boolean;
    parentId: string | null;
    type: "act" | "chapter" | "scene";
  }>({ open: false, parentId: null, type: "act" });

  const [nodeToDelete, setNodeToDelete] = useState<{
    id: string;
    type: "act" | "chapter" | "scene";
  } | null>(null);

  const openCreateDialog = (
    parentId: string | null,
    type: "act" | "chapter" | "scene",
  ) => {
    setDialogState({ open: true, parentId, type });
  };

  const confirmDeleteNode = (
    nodeId: string,
    type: "act" | "chapter" | "scene",
  ) => {
    setNodeToDelete({ id: nodeId, type });
  };

  const executeDeleteNode = async () => {
    if (!nodeToDelete) return;

    const { id: nodeId, type } = nodeToDelete;

    try {
      // Use repository's cascading delete method
      await nodeRepo.deleteCascade(nodeId, type);

      // Trigger all useLiveQuery hooks to refetch
      invalidateQueries();

      toast.success("Deleted successfully");
      if (activeSceneId === nodeId) {
        setActiveSceneId(null);
      }
    } catch (error) {
      log.error("Delete failed:", error);
      toast.error("Failed to delete node");
    } finally {
      setNodeToDelete(null);
    }
  };

  const allScenes =
    (nodes?.filter((node) => node.type === "scene") as Array<
      DocumentNode & { archived?: boolean }
    >) ?? [];
  const archivedScenes = allScenes.filter((scene) => Boolean(scene.archived));
  const visibleNodes = (nodes ?? []).filter(
    (node) =>
      node.type !== "scene" || !(node as { archived?: boolean }).archived,
  );

  // Build Tree
  const acts = visibleNodes.filter((n) => n.type === "act");
  const getChildren = (parentId: string) =>
    visibleNodes.filter((n) => n.parentId === parentId);

  useEffect(() => {
    setExpandedNodes((prev) => {
      let changed = false;
      const next: Record<string, boolean> = {};

      const branchNodeIds = new Set(
        visibleNodes
          .filter((node) => node.type !== "scene")
          .map((node) => node.id),
      );

      // Keep existing expansion state for nodes still visible
      for (const [nodeId, isExpanded] of Object.entries(prev)) {
        if (branchNodeIds.has(nodeId)) {
          next[nodeId] = isExpanded;
        } else {
          changed = true;
        }
      }

      // Initialize expansion state for newly visible nodes
      for (const node of visibleNodes) {
        if (node.type === "scene" || node.id in next) continue;
        next[node.id] = node.expanded ?? true;
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [visibleNodes]);

  const toggleExpanded = (nodeId: string) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [nodeId]: !(prev[nodeId] ?? true),
    }));
  };

  if (!project) {
    return (
      <div className="h-full flex items-center justify-center p-4 text-sm text-muted-foreground">
        Open a project to load manuscript navigation.
      </div>
    );
  }

  const restoreArchivedScene = async (sceneId: string) => {
    try {
      await nodeRepo.updateMetadata(sceneId, { archived: false });
      invalidateQueries("nodes");
      toast.success("Scene restored");
    } catch (error) {
      log.error("Failed to restore archived scene", error);
      toast.error("Failed to restore archived scene");
    }
  };

  const renderNode = (node: DocumentNode, level: number) => {
    const children = getChildren(node.id);
    const isScene = node.type === "scene";
    const isExpanded = isScene
      ? false
      : (expandedNodes[node.id] ?? node.expanded ?? true);
    const Icon = isScene ? FileText : node.type === "chapter" ? Folder : Book;

    return (
      <div key={node.id} className="select-none">
        <div
          className={cn(
            "relative min-w-0 p-1 hover:bg-accent rounded cursor-pointer text-sm group pr-2",
            activeSceneId === node.id && "bg-accent font-medium",
          )}
          style={{ paddingLeft: `${level * 12 + 4}px` }}
          onClick={() =>
            isScene ? setActiveSceneId(node.id) : toggleExpanded(node.id)
          }
        >
          <div className="flex min-w-0 items-center gap-2 pr-14">
            {!isScene &&
              (isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              ))}
            <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="block w-0 flex-1 truncate">{node.title}</span>
          </div>

          {/* Always show indicator, expand on hover */}
          <div
            className="absolute right-1 top-1/2 flex -translate-y-1/2 shrink-0 items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {!isScene && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-100 lg:opacity-40 lg:group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  openCreateDialog(
                    node.id,
                    node.type === "act" ? "chapter" : "scene",
                  );
                }}
                title={node.type === "act" ? "Add Chapter" : "Add Scene"}
              >
                <Plus className="h-3 w-3" />
              </Button>
            )}

            <div className="opacity-100 lg:opacity-40 lg:group-hover:opacity-100 transition-opacity">
              {renderNodeActionsMenu ? (
                renderNodeActionsMenu({
                  nodeId: node.id,
                  nodeType: node.type as "act" | "chapter" | "scene",
                  onDelete: confirmDeleteNode,
                })
              ) : (
                // Fallback minimal menu if no slot provided
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() =>
                        confirmDeleteNode(
                          node.id,
                          node.type as "act" | "chapter" | "scene",
                        )
                      }
                      className="text-destructive"
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>

        {!isScene &&
          isExpanded &&
          children.map((child) => renderNode(child, level + 1))}
      </div>
    );
  };

  return (
    <div className="h-full min-w-0 flex flex-col bg-muted/10 border-r">
      {/* Header - with left padding to avoid sidebar toggle button overlap */}
      <div className="p-4 pt-12 border-b flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold truncate" title={project.title}>
            {project.title}
          </h2>
          <p className="text-xs text-muted-foreground truncate">
            {project.author}
          </p>
        </div>
        <ProjectSettingsDialog projectId={projectId} />
      </div>

      <Tabs
        value={leftSidebarTab}
        onValueChange={(value) => setLeftSidebarTab(value as LeftSidebarTab)}
        className="flex-1 min-h-0 flex flex-col overflow-hidden"
      >
        <TabsList className="grid w-full grid-cols-3 rounded-none border-b bg-transparent p-0 overflow-hidden">
          <TabsTrigger
            value="manuscript"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1.5 min-w-0 gap-1"
          >
            <Book className="h-4 w-4 mr-0 lg:mr-2" />{" "}
            <span className="hidden lg:inline truncate">Manuscript</span>
          </TabsTrigger>
          <TabsTrigger
            value="codex"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1.5 min-w-0 gap-1"
          >
            <Users className="h-4 w-4 mr-0 lg:mr-2" />{" "}
            <span className="hidden lg:inline truncate">Codex</span>
          </TabsTrigger>
          <TabsTrigger
            value="snippets"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1.5 min-w-0 gap-1"
          >
            <FileText className="h-4 w-4 mr-0 lg:mr-2" />{" "}
            <span className="hidden lg:inline truncate">Snippets</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="manuscript"
          className="flex-1 min-h-0 overflow-hidden flex flex-col m-0"
        >
          <div className="p-2 border-b flex justify-between items-center bg-background/50">
            <span className="text-xs font-medium text-muted-foreground">
              Structure
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6"
              onClick={() => openCreateDialog(null, "act")}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-2">
              {acts.map((act) => renderNode(act, 0))}
              {acts.length === 0 && (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No acts yet. Click + to start.
                </div>
              )}
            </div>

            {archivedScenes.length > 0 && (
              <div className="mx-2 mb-2 rounded-md border bg-muted/30">
                <div className="px-3 py-2 border-b text-xs font-medium text-muted-foreground">
                  Archived Scenes ({archivedScenes.length})
                </div>
                <div className="divide-y">
                  {archivedScenes.map((scene) => (
                    <div
                      key={scene.id}
                      className="px-3 py-2 flex items-center gap-2 text-sm"
                    >
                      <span className="truncate flex-1">{scene.title}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => restoreArchivedScene(scene.id)}
                        title="Restore scene"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ideas Section - Collapsible below manuscript tree */}
            <div className="border-t mt-2">
              <IdeasSection
                projectId={projectId}
                sceneId={activeSceneId}
                defaultOpen={false}
              />
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent
          value="codex"
          className="flex-1 min-h-0 overflow-hidden m-0"
        >
          {renderCodexList ? (
            renderCodexList({
              seriesId: project.seriesId,
              selectedEntityId: activeCodexEntryId,
              onSelectedEntityIdChange: setActiveCodexEntryId,
            })
          ) : (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Codex component not provided
            </div>
          )}
        </TabsContent>

        <TabsContent
          value="snippets"
          className="flex-1 min-h-0 overflow-hidden m-0"
        >
          {renderSnippetList ? (
            renderSnippetList({
              projectId,
              onSelect: (id) => onSelectSnippet?.(id),
            })
          ) : (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Snippets component not provided
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CreateNodeDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState((prev) => ({ ...prev, open }))}
        projectId={projectId}
        parentId={dialogState.parentId}
        type={dialogState.type}
      />

      <Dialog
        open={!!nodeToDelete}
        onOpenChange={(open) => !open && setNodeToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {nodeToDelete?.type}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this {nodeToDelete?.type}? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNodeToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={executeDeleteNode}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
