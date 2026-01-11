"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Settings, Trash2, Archive, Upload, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLiveQuery } from "@/hooks/use-live-query";
import { useRouter } from "next/navigation";
import { useAppServices } from "@/infrastructure/di/AppContext";
import { useSeriesRepository } from "@/hooks/use-series-repository";

const projectSettingsSchema = z.object({
  title: z.string().min(1, "Title is required"),
  author: z.string().default(""),
  language: z.string().default("English (US)"),
  coverImage: z.string().default(""),
  seriesId: z.string().min(1, "Series is required"),
  seriesIndex: z.string().default(""),
});

type ProjectSettingsFormData = z.infer<typeof projectSettingsSchema>;

export function ProjectSettingsDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  const { projectRepository: projectRepo } = useAppServices();
  const seriesRepo = useSeriesRepository();
  const project = useLiveQuery(
    () => projectRepo.get(projectId),
    [projectId, projectRepo],
  );
  const allSeries = useLiveQuery(() => seriesRepo.getAll(), [seriesRepo]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProjectSettingsFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(projectSettingsSchema) as any,
    defaultValues: {
      title: "",
      author: "",
      language: "English (US)",
      coverImage: "",
      seriesId: "",
      seriesIndex: "",
    },
  });

  const coverImage = watch("coverImage");

  useEffect(() => {
    if (project && open) {
      reset({
        title: project.title,
        author: project.author || "",
        language: project.language || "English (US)",
        coverImage: project.coverImage || "",
        seriesId: project.seriesId || "",
        seriesIndex: project.seriesIndex || "",
      });
    }
  }, [project, open, reset]);

  const onSubmit = async (data: ProjectSettingsFormData) => {
    if (!project) return;
    setIsSaving(true);
    try {
      await projectRepo.update(projectId, {
        title: data.title,
        author: data.author,
        language: data.language,
        coverImage: data.coverImage,
        seriesId: data.seriesId,
        seriesIndex: data.seriesIndex,
      });
      setOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setValue("coverImage", reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const [confirmationAction, setConfirmationAction] = useState<
    "archive" | "delete" | null
  >(null);

  const handleArchive = () => {
    setConfirmationAction("archive");
  };

  const handleDelete = () => {
    setConfirmationAction("delete");
  };

  const executeAction = async () => {
    if (confirmationAction === "archive") {
      await projectRepo.archive(projectId);
      setOpen(false);
      router.push("/");
    } else if (confirmationAction === "delete") {
      await projectRepo.delete(projectId);
      setOpen(false);
      router.push("/");
    }
    setConfirmationAction(null);
  };

  if (!project) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:w-dialog-lg">
          <DialogHeader>
            <DialogTitle>Novel Settings</DialogTitle>
            <DialogDescription>
              Manage metadata, cover image, and danger zone.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input {...register("title")} />
                  {errors.title && (
                    <p className="text-xs text-destructive">
                      {errors.title.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Author</Label>
                  <Input {...register("author")} />
                </div>
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select
                    value={watch("language")}
                    onValueChange={(val) => setValue("language", val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English (US)">English (US)</SelectItem>
                      <SelectItem value="English (UK)">English (UK)</SelectItem>
                      <SelectItem value="Spanish">Spanish</SelectItem>
                      <SelectItem value="French">French</SelectItem>
                      <SelectItem value="German">German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Series</Label>
                  <Select
                    value={watch("seriesId")}
                    onValueChange={(val) => setValue("seriesId", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select series" />
                    </SelectTrigger>
                    <SelectContent>
                      {allSeries?.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Book Number</Label>
                  <Input
                    {...register("seriesIndex")}
                    placeholder="e.g., Book 1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cover Image</Label>
                <div className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center h-scroll-sm relative overflow-hidden bg-muted/50">
                  {coverImage ? (
                    <img
                      src={coverImage}
                      alt="Cover"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <Upload className="h-8 w-8 mx-auto mb-2" />
                      <span className="text-xs">Upload Cover (1.6:1)</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleImageUpload}
                  />
                </div>
                {coverImage && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setValue("coverImage", "")}
                  >
                    Remove Cover
                  </Button>
                )}
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-medium text-destructive mb-2">
                Danger Zone
              </h3>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={handleArchive}
                >
                  <Archive className="h-4 w-4 mr-2" /> Archive Novel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete Forever
                </Button>
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!confirmationAction}
        onOpenChange={(open) => !open && setConfirmationAction(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmationAction === "archive"
                ? "Archive Novel"
                : "Delete Novel"}
            </DialogTitle>
            <DialogDescription>
              {confirmationAction === "archive"
                ? "Are you sure you want to archive this novel? It will be moved to the archive list."
                : "Are you sure you want to DELETE this novel? This action cannot be undone and all data will be lost."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmationAction(null)}
            >
              Cancel
            </Button>
            <Button
              variant={
                confirmationAction === "delete" ? "destructive" : "default"
              }
              onClick={executeAction}
            >
              {confirmationAction === "archive" ? "Archive" : "Delete Forever"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
