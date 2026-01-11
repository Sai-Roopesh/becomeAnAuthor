"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createNodeSchema,
  type CreateNodeFormData,
} from "@/shared/schemas/forms";
import { useAppServices } from "@/infrastructure/di/AppContext";
import { invalidateQueries } from "@/hooks/use-live-query";
import { logger } from "@/shared/utils/logger";
import { toast } from "@/shared/utils/toast-service";

const log = logger.scope("CreateNodeDialog");

interface CreateNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  parentId: string | null;
  type: "act" | "chapter" | "scene";
}

export function CreateNodeDialog({
  open,
  onOpenChange,
  projectId,
  parentId,
  type,
}: CreateNodeDialogProps) {
  const { nodeRepository: nodeRepo } = useAppServices();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<CreateNodeFormData>({
    resolver: zodResolver(createNodeSchema),
    mode: "onChange",
    defaultValues: {
      type,
      parentId,
    },
  });

  const onSubmit = async (data: CreateNodeFormData) => {
    try {
      const siblings = await nodeRepo.getByParent(projectId, parentId);
      const maxOrder = siblings.reduce((max, n) => Math.max(max, n.order), 0);
      const newOrder = maxOrder + 100;

      await nodeRepo.create({
        projectId,
        parentId,
        title: data.title,
        order: newOrder,
        type,
        ...(type === "scene"
          ? {
              content: { type: "doc", content: [] },
              summary: "",
              status: "draft",
              wordCount: 0,
            }
          : {}),
      });

      invalidateQueries();
      reset();
      onOpenChange(false);
    } catch (error) {
      log.error("Failed to create node:", error);
      toast.error(`Failed to create ${type}`, {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:w-dialog-sm">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>
              Add {type.charAt(0).toUpperCase() + type.slice(1)}
            </DialogTitle>
            <DialogDescription>
              Enter a title for your new {type}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Title
              </Label>
              <Input
                id="title"
                {...register("title")}
                className="col-span-3"
                placeholder={`New ${type}`}
              />
            </div>
            {errors.title && (
              <p className="text-sm text-destructive text-right">
                {errors.title.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!isValid}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
