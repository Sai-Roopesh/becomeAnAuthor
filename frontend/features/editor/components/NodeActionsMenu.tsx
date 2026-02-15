"use client";

import { useLiveQuery } from "@/hooks/use-live-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MoreVertical,
  Eye,
  EyeOff,
  FileText,
  Copy,
  FileDown,
  Archive,
  History,
  Trash2,
  Pencil,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  nodeActionsSchema,
  type NodeActionsFormData,
} from "@/shared/schemas/forms";
import { useAI } from "@/hooks/use-ai";
import { toast } from "@/shared/utils/toast-service";
import { isScene } from "@/domain/entities/types";
import { extractTextFromTiptapJSON } from "@/shared/utils/editor";
import { useAppServices } from "@/infrastructure/di/AppContext";
import { logger } from "@/shared/utils/logger";

const log = logger.scope("NodeActionsMenu");

interface NodeActionsMenuProps {
  nodeId: string;
  nodeType: "act" | "chapter" | "scene";
  onDelete?: (nodeId: string, nodeType: "act" | "chapter" | "scene") => void;
}

export function NodeActionsMenu({
  nodeId,
  nodeType,
  onDelete,
}: NodeActionsMenuProps) {
  const { nodeRepository: nodeRepo } = useAppServices();
  const node = useLiveQuery(() => nodeRepo.get(nodeId), [nodeId, nodeRepo]);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isPovDialogOpen, setIsPovDialogOpen] = useState(false);
  const [isSubtitleDialogOpen, setIsSubtitleDialogOpen] = useState(false);
  const [isActionBusy, setIsActionBusy] = useState(false);

  const renameForm = useForm<NodeActionsFormData>({
    resolver: zodResolver(nodeActionsSchema),
    mode: "onChange",
  });

  const povForm = useForm<{ pov: string }>({
    defaultValues: { pov: "" },
  });

  const subtitleForm = useForm<{ subtitle: string }>({
    defaultValues: { subtitle: "" },
  });

  const { generate, isGenerating } = useAI({
    defaultSystem: `You are an expert story analyst specializing in scene summarization.

SUMMARIZATION FRAMEWORK:
1. Goal: What does the POV character want in this scene?
2. Conflict: What obstacles or opposition do they face?
3. Outcome: How does the scene end? (Success, failure, complication?)
4. Value Change: What shifts emotionally or situationally?

STYLE:
- Concise: 2-3 sentences maximum
- Present tense: "Sarah confronts..." not "Sarah confronted..."
- Focus on action and change, not description
- Highlight turning points

EXAMPLE:
"Marcus infiltrates the gala to steal classified files. Security recognizes him from surveillance footage, forcing an improvised escape through the kitchen. He escapes but without the files—and now they know he's onto them."`,
    operationName: "Scene Summarization",
  });

  if (!node) return null;

  const handleSetPOV = async () => {
    if (!isScene(node)) return;
    povForm.reset({ pov: node.pov || "" });
    setIsPovDialogOpen(true);
  };

  const executePovUpdate = async (data: { pov: string }) => {
    if (!isScene(node)) return;
    try {
      await nodeRepo.updateMetadata(nodeId, { pov: data.pov || "" });
      const { invalidateQueries } = await import("@/hooks/use-live-query");
      invalidateQueries();
      toast.success(data.pov ? `POV set to "${data.pov}"` : "POV cleared");
      setIsPovDialogOpen(false);
    } catch (error) {
      log.error("Failed to update POV", error);
      toast.error("Failed to update POV");
    }
  };

  const handleAddSubtitle = async () => {
    if (!isScene(node)) return;
    subtitleForm.reset({ subtitle: node.subtitle || "" });
    setIsSubtitleDialogOpen(true);
  };

  const executeSubtitleUpdate = async (data: { subtitle: string }) => {
    if (!isScene(node)) return;
    try {
      await nodeRepo.updateMetadata(nodeId, { subtitle: data.subtitle || "" });
      const { invalidateQueries } = await import("@/hooks/use-live-query");
      invalidateQueries();
      toast.success(
        data.subtitle
          ? `Subtitle set to "${data.subtitle}"`
          : "Subtitle cleared",
      );
      setIsSubtitleDialogOpen(false);
    } catch (error) {
      log.error("Failed to update subtitle", error);
      toast.error("Failed to update subtitle");
    }
  };

  const handleToggleAIExclusion = async () => {
    if (!isScene(node)) return;
    try {
      const current = node.excludeFromAI || false;
      await nodeRepo.updateMetadata(nodeId, { excludeFromAI: !current });
      const { invalidateQueries } = await import("@/hooks/use-live-query");
      invalidateQueries("nodes");
      toast.success(
        current ? "Included in AI context" : "Excluded from AI context",
      );
    } catch (error) {
      log.error("Failed to update AI context flag", error);
      toast.error("Failed to update AI context flag");
    }
  };

  const handleSummarizeScene = async () => {
    if (!isScene(node)) return;
    if (isGenerating || isActionBusy) return;

    const text = extractTextFromTiptapJSON(node.content);
    if (!text.trim()) {
      toast.error("Cannot summarize an empty scene");
      return;
    }

    setIsActionBusy(true);
    try {
      const result = await generate({
        messages: [
          {
            role: "user",
            content: `Summarize this scene using the framework:
1. Goal (what character wants)
2. Conflict (what opposes them)
3. Outcome (success/failure/complication)
4. Value Change (what shifts)

SCENE TEXT:
${text}

SUMMARY (2-3 sentences, present tense):`,
          },
        ],
        maxTokens: 300,
      });

      if (result) {
        await nodeRepo.updateMetadata(nodeId, { summary: result });
        const { invalidateQueries } = await import("@/hooks/use-live-query");
        invalidateQueries("nodes");
        toast.success("Scene summary updated");
      }
    } catch (error) {
      log.error("Failed to summarize scene", error);
      toast.error("Failed to summarize scene");
    } finally {
      setIsActionBusy(false);
    }
  };

  const handleDuplicate = async () => {
    if (!isScene(node)) return;
    try {
      await nodeRepo.create({
        ...node,
        title: `${node.title} (Copy)`,
        order: (node.order || 0) + 0.5,
        type: "scene",
        projectId: node.projectId,
      });
      const { invalidateQueries } = await import("@/hooks/use-live-query");
      invalidateQueries("nodes");
      toast.success("Scene duplicated");
    } catch (error) {
      log.error("Failed to duplicate scene", error);
      toast.error("Failed to duplicate scene");
    }
  };

  const handleCopyProse = async () => {
    if (!isScene(node)) return;
    try {
      const text = extractTextFromTiptapJSON(node.content);
      await navigator.clipboard.writeText(text);
      toast.success("Prose copied to clipboard");
    } catch (error) {
      log.error("Failed to copy prose", error);
      toast.error("Failed to copy prose");
    }
  };

  const handleExport = () => {
    if (!isScene(node)) return;
    const text = extractTextFromTiptapJSON(node.content);
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${node.title}.txt`;
    a.click();
    toast.success("Scene exported");
  };

  const handleArchive = async () => {
    if (!isScene(node)) return;
    setIsArchiveDialogOpen(true);
  };

  const executeArchive = async () => {
    if (!isScene(node)) return;
    try {
      await nodeRepo.updateMetadata(nodeId, { archived: !node.archived });
      const { invalidateQueries } = await import("@/hooks/use-live-query");
      invalidateQueries("nodes");
      toast.success(
        node.archived
          ? "Scene restored from archive"
          : "Scene archived. You can restore it from the sidebar archive section.",
      );
      setIsArchiveDialogOpen(false);
    } catch (error) {
      log.error("Failed to update archive state", error);
      toast.error("Failed to update archive state");
    }
  };

  const handleRename = () => {
    log.debug("Opening rename dialog", { nodeId, nodeType });
    renameForm.reset({ name: node.title, pov: "", subtitle: "" });
    setIsRenameDialogOpen(true);
  };

  const executeRename = async (data: NodeActionsFormData) => {
    try {
      log.debug("executeRename called", { name: data.name });

      if (data.name && data.name !== node.title) {
        await nodeRepo.update(nodeId, { title: data.name });
        const { invalidateQueries } = await import("@/hooks/use-live-query");
        invalidateQueries("nodes");
        toast.success(
          `${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)} renamed`,
        );
        setIsRenameDialogOpen(false);
      }
    } catch (error) {
      log.error("Rename failed", error);
      toast.error(
        `Failed to rename ${nodeType}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  const handleDeleteClick = () => {
    if (onDelete) {
      onDelete(nodeId, nodeType);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={handleRename}>
            <Pencil className="h-4 w-4 mr-2" />
            Rename
          </DropdownMenuItem>

          {nodeType === "scene" && isScene(node) && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSetPOV}>
                <Eye className="h-4 w-4 mr-2" />
                Set Custom POV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggleAIExclusion}>
                <EyeOff className="h-4 w-4 mr-2" />
                {node.excludeFromAI
                  ? "Include in AI Context"
                  : "Exclude from AI Context"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAddSubtitle}>
                <FileText className="h-4 w-4 mr-2" />
                Add Subtitle
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel>AI Actions</DropdownMenuLabel>

              <DropdownMenuItem
                onClick={handleSummarizeScene}
                disabled={isGenerating}
              >
                <FileText className="h-4 w-4 mr-2" />
                {isGenerating ? "Summarizing..." : "Summarize Scene"}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate Scene
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel>History</DropdownMenuLabel>

              <DropdownMenuItem>
                <History className="h-4 w-4 mr-2" />
                Scene Summary
              </DropdownMenuItem>
              <DropdownMenuItem>
                <History className="h-4 w-4 mr-2" />
                Scene Contents
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={handleCopyProse}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Scene Prose
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExport}>
                <FileDown className="h-4 w-4 mr-2" />
                Export Scene as TXT
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleArchive}>
                <Archive className="h-4 w-4 mr-2" />
                {node.archived ? "Restore Scene" : "Archive Scene"}
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleDeleteClick}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Scene</DialogTitle>
            <DialogDescription>
              {node.archived
                ? "Restore this scene to the active manuscript list."
                : "Archive this scene. It will move to the archived scenes section in the sidebar."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsArchiveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={executeArchive}>
              {node.archived ? "Restore" : "Archive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <form onSubmit={renameForm.handleSubmit(executeRename)}>
            <DialogHeader>
              <DialogTitle>
                Rename {nodeType.charAt(0).toUpperCase() + nodeType.slice(1)}
              </DialogTitle>
              <DialogDescription>
                Enter a new name for this {nodeType}.
              </DialogDescription>
            </DialogHeader>
            <Input
              {...renameForm.register("name")}
              placeholder={`${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)} name`}
              autoFocus
              className="my-4"
            />
            {renameForm.formState.errors.name && (
              <p className="text-sm text-destructive mb-4">
                {renameForm.formState.errors.name.message}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRenameDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!renameForm.formState.isValid}>
                Rename
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isPovDialogOpen} onOpenChange={setIsPovDialogOpen}>
        <DialogContent>
          <form onSubmit={povForm.handleSubmit(executePovUpdate)}>
            <DialogHeader>
              <DialogTitle>Set POV Character</DialogTitle>
              <DialogDescription>
                Enter the point-of-view character for this scene. Leave empty to
                use the default.
              </DialogDescription>
            </DialogHeader>
            <Input
              {...povForm.register("pov")}
              placeholder="e.g., John Smith, Narrator, etc."
              autoFocus
              className="my-4"
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPovDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isSubtitleDialogOpen}
        onOpenChange={setIsSubtitleDialogOpen}
      >
        <DialogContent>
          <form onSubmit={subtitleForm.handleSubmit(executeSubtitleUpdate)}>
            <DialogHeader>
              <DialogTitle>Set Subtitle</DialogTitle>
              <DialogDescription>
                Add a subtitle or description for this scene.
              </DialogDescription>
            </DialogHeader>
            <Input
              {...subtitleForm.register("subtitle")}
              placeholder="e.g., Three days later, In the abandoned warehouse..."
              autoFocus
              className="my-4"
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSubtitleDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
