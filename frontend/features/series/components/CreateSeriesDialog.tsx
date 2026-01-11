"use client";

import { useSeriesRepository } from "@/hooks/use-series-repository";
import { invalidateQueries } from "@/hooks/use-live-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createSeriesSchema,
  type CreateSeriesFormData,
} from "@/shared/schemas/forms";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "@/shared/utils/toast-service";
import { useState } from "react";

interface CreateSeriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (seriesId: string) => void;
}

export function CreateSeriesDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateSeriesDialogProps) {
  const seriesRepo = useSeriesRepository();
  const [isCreating, setIsCreating] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isValid },
  } = useForm<CreateSeriesFormData>({
    resolver: zodResolver(createSeriesSchema),
    mode: "onChange",
  });

  const onSubmit = async (data: CreateSeriesFormData) => {
    setIsCreating(true);

    try {
      const seriesId = await seriesRepo.create({ title: data.title });
      toast.success(`Series "${data.title}" created`);
      invalidateQueries();
      reset();
      onOpenChange(false);
      onCreated?.(seriesId);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create series";
      if (message.toLowerCase().includes("already exists")) {
        setError("title", {
          message: `A series named "${data.title}" already exists`,
        });
      } else {
        setError("title", { message });
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Create New Series</DialogTitle>
            <DialogDescription>
              Group related books together in a series (e.g., trilogies, sagas).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="series-title">Series Title</Label>
              <Input
                id="series-title"
                placeholder="e.g., The Lord of the Rings"
                {...register("title")}
                autoFocus
              />
              {errors.title && (
                <p className="text-sm text-destructive">
                  {errors.title.message}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating || !isValid}>
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Series"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
