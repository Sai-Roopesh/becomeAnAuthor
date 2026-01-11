"use client";

import { useLiveQuery, invalidateQueries } from "@/hooks/use-live-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProjectStore } from "@/store/use-project-store";
import { cn } from "@/lib/utils";
import { DocumentNode } from "@/domain/entities/types";
import {
  Plus,
  FileText,
  Folder,
  Book,
  Users,
  MoreHorizontal,
} from "lucide-react";
import { logger } from "@/shared/utils/logger";

const log = logger.scope("ProjectNavigation");

import { useState, ReactNode } from "react";
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
  renderCodexList?: (props: { seriesId: string }) => ReactNode;
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
  const { activeSceneId, setActiveSceneId } = useProjectStore();
  // expanded state removed - unused

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

  if (!project) return null;

  // Build Tree
  const acts = nodes?.filter((n) => n.type === "act") || [];
  const getChildren = (parentId: string) =>
    nodes?.filter((n) => n.parentId === parentId) || [];

  const renderNode = (node: DocumentNode, level: number) => {
    const children = getChildren(node.id);
    const isScene = node.type === "scene";
    const Icon = isScene ? FileText : node.type === "chapter" ? Folder : Book;

    return (
      <div key={node.id} className="select-none">
        <div
          className={cn(
            "flex items-center gap-2 p-1 hover:bg-accent rounded cursor-pointer text-sm group pr-2",
            activeSceneId === node.id && "bg-accent font-medium",
          )}
          style={{ paddingLeft: `${level * 12 + 4}px` }}
          onClick={() => isScene && setActiveSceneId(node.id)}
        >
          <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="truncate flex-1">{node.title}</span>

          {/* Always show indicator, expand on hover */}
          <div className="flex items-center">
            {!isScene && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-40 group-hover:opacity-100 transition-opacity"
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

            <div className="opacity-40 group-hover:opacity-100 transition-opacity">
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

        {!isScene && children.map((child) => renderNode(child, level + 1))}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-muted/10 border-r">
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
        defaultValue="manuscript"
        className="flex-1 flex flex-col overflow-hidden"
      >
        <TabsList className="grid w-full grid-cols-3 rounded-none border-b bg-transparent p-0">
          <TabsTrigger
            value="manuscript"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2"
          >
            <Book className="h-4 w-4 mr-2" />{" "}
            <span className="hidden sm:inline">Manuscript</span>
          </TabsTrigger>
          <TabsTrigger
            value="codex"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2"
          >
            <Users className="h-4 w-4 mr-2" />{" "}
            <span className="hidden sm:inline">Codex</span>
          </TabsTrigger>
          <TabsTrigger
            value="snippets"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2"
          >
            <FileText className="h-4 w-4 mr-2" />{" "}
            <span className="hidden sm:inline">Snippets</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="manuscript"
          className="flex-1 overflow-hidden flex flex-col m-0"
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
          <ScrollArea className="flex-1">
            <div className="p-2">
              {acts.map((act) => renderNode(act, 0))}
              {acts.length === 0 && (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No acts yet. Click + to start.
                </div>
              )}
            </div>

            {/* Ideas Section - Collapsible below manuscript tree */}
            <div className="border-t mt-2">
              <IdeasSection projectId={projectId} defaultOpen={false} />
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="codex" className="flex-1 overflow-hidden m-0">
          {renderCodexList ? (
            renderCodexList({ seriesId: project.seriesId })
          ) : (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Codex component not provided
            </div>
          )}
        </TabsContent>

        <TabsContent value="snippets" className="flex-1 overflow-hidden m-0">
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
