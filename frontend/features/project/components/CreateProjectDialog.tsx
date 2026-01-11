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
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { Sparkles, Plus, BookOpen, AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppServices } from "@/infrastructure/di/AppContext";
import { useSeriesRepository } from "@/hooks/use-series-repository";
import { useLiveQuery, invalidateQueries } from "@/hooks/use-live-query";
import { toast } from "@/shared/utils/toast-service";
import { logger } from "@/shared/utils/logger";

const log = logger.scope("CreateProjectDialog");

const TITLES = [
  "The Last Starship",
  "Whispers in the Dark",
  "The Clockwork Heart",
  "Echoes of Eternity",
  "The Silent Forest",
  "Beneath the Waves",
  "The Alchemist's Secret",
  "Shadows of the Past",
  "The Crimson Crown",
  "Beyond the Horizon",
  "The Forgotten City",
  "Starlight and Ash",
];

interface CreateProjectDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * CreateProjectDialog - Series-First Architecture
 *
 * CRITICAL: Every project MUST belong to a series. This is a core architectural requirement.
 * Users must either:
 * 1. Select an existing series, OR
 * 2. Create a new series inline
 *
 * The "Create Novel" button is DISABLED until a series is selected.
 */
export function CreateProjectDialog({
  trigger,
  open: controlledOpen,
  onOpenChange,
}: CreateProjectDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  // Support both controlled and uncontrolled modes
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (value: boolean) => {
    if (onOpenChange) {
      onOpenChange(value);
    } else {
      setInternalOpen(value);
    }
  };

  const { projectRepository: projectRepo, nodeRepository: nodeRepo } =
    useAppServices();
  const seriesRepo = useSeriesRepository();

  // Fetch existing series for the dropdown
  const existingSeries = useLiveQuery(() => seriesRepo.getAll(), [seriesRepo]);

  // Fetch existing projects to get unique author names
  const existingProjects = useLiveQuery(
    () => projectRepo.getAll(),
    [projectRepo],
  );

  // Extract unique author names from existing projects
  const uniqueAuthors: string[] = Array.from(
    new Set(
      (existingProjects || [])
        .map((p) => p.author)
        .filter((author): author is string => Boolean(author)),
    ),
  ).sort();

  const [formData, setFormData] = useState({
    title: "",
    author: "",
    language: "English (US)",
    seriesId: "", // REQUIRED - must select a series
    seriesIndex: "Book 1", // REQUIRED - default to "Book 1"
    savePath: "", // REQUIRED - user must choose location
  });

  // State for inline series creation
  const [isCreatingNewSeries, setIsCreatingNewSeries] = useState(false);
  const [newSeriesName, setNewSeriesName] = useState("");

  // State for inline author entry
  const [isCreatingNewAuthor, setIsCreatingNewAuthor] = useState(false);

  const handleChooseLocation = async () => {
    try {
      const { showOpenDialog } = await import("@/core/tauri/commands");
      const selected = await showOpenDialog({
        directory: true,
        title: "Choose where to save your novel",
      });

      if (selected && typeof selected === "string") {
        setFormData((prev) => ({ ...prev, savePath: selected }));
      }
    } catch (error) {
      log.error("Failed to open directory picker:", error);
      toast.error("Failed to open directory picker");
    }
  };

  const handleSurpriseMe = () => {
    const randomTitle = TITLES[Math.floor(Math.random() * TITLES.length)];
    setFormData((prev) => ({
      ...prev,
      ...(randomTitle && { title: randomTitle }),
    }));
  };

  const handleCreateNewSeries = async () => {
    if (!newSeriesName.trim()) {
      toast.error("Please enter a series name");
      return;
    }

    try {
      // Check if series already exists
      const existing = await seriesRepo.getByName(newSeriesName.trim());
      if (existing) {
        setFormData((prev) => ({ ...prev, seriesId: existing.id }));
        setIsCreatingNewSeries(false);
        setNewSeriesName("");
        return;
      }

      // Create new series
      const newSeriesId = await seriesRepo.create({
        title: newSeriesName.trim(),
      });

      // Invalidate queries to refresh series list
      invalidateQueries();

      // Select the new series
      setFormData((prev) => ({ ...prev, seriesId: newSeriesId }));
      setIsCreatingNewSeries(false);
      setNewSeriesName("");
    } catch (error) {
      log.error("Failed to create series:", error);
      toast.error("Failed to create series");
    }
  };

  const handleCreate = async () => {
    // Validate all required fields
    if (!formData.seriesId) {
      toast.error(
        "Please select a series. Every book must belong to a series.",
      );
      return;
    }
    if (!formData.seriesIndex.trim()) {
      toast.error('Please enter the book number (e.g., "Book 1")');
      return;
    }
    if (!formData.savePath) {
      toast.error("Please choose a save location for your project");
      return;
    }
    if (!formData.title.trim()) {
      toast.error("Please enter a title for your novel");
      return;
    }

    try {
      // ✅ Create project with REQUIRED seriesId and seriesIndex
      const projectId = await projectRepo.create({
        title: formData.title,
        author: formData.author,
        language: formData.language,
        seriesId: formData.seriesId, // REQUIRED
        seriesIndex: formData.seriesIndex, // REQUIRED
        customPath: formData.savePath,
      } as unknown as Omit<
        import("@/domain/entities/types").Project,
        "id" | "createdAt" | "updatedAt"
      > & { customPath: string });

      // Create initial manuscript structure using repository
      const act = await nodeRepo.create({
        projectId: projectId,
        type: "act",
        title: "Act 1",
        order: 0,
        parentId: null,
        expanded: true,
      });

      const chapter = await nodeRepo.create({
        projectId: projectId,
        type: "chapter",
        title: "Chapter 1",
        order: 0,
        parentId: act.id,
        expanded: true,
      });

      await nodeRepo.create({
        projectId: projectId,
        type: "scene",
        title: "Scene 1",
        order: 0,
        parentId: chapter.id,
        content: { type: "doc", content: [] },
        expanded: false,
        status: "draft",
        wordCount: 0,
        summary: "",
      });

      // Invalidate project list cache so new project appears
      invalidateQueries();

      toast.success(`Created "${formData.title}"`);

      // Navigate to the new project
      window.location.href = `/project?id=${projectId}`;

      setOpen(false);
      setFormData({
        title: "",
        author: "",
        language: "English (US)",
        seriesId: "",
        seriesIndex: "Book 1",
        savePath: "",
      });
    } catch (error) {
      log.error("Failed to create project:", error);
      const message =
        error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Failed to create project: ${message}`);
    }
  };

  // Form validation - all required fields must be filled
  const isFormValid =
    formData.title.trim() &&
    formData.seriesId &&
    formData.seriesIndex.trim() &&
    formData.savePath;

  // Get selected series name for display
  // selectedSeries removed - unused

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger !== undefined && (
        <DialogTrigger asChild>
          {trigger || (
            <div className="h-full cursor-pointer group">
              <Card className="h-full min-h-72 flex flex-col items-center justify-center border-dashed border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all duration-300">
                <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300 mb-4">
                  <Plus className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-lg text-primary">
                  New Novel
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Start your next masterpiece
                </p>
              </Card>
            </div>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:w-dialog-md max-h-[85dvh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Create a new Novel</DialogTitle>
          <DialogDescription>
            Let's get you started with your next masterpiece.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable content area - takes remaining space */}
        <div className="flex-1 min-h-0 overflow-y-auto py-4">
          <div className="grid gap-4">
            {/* SERIES SELECTION - REQUIRED */}
            <div className="space-y-2 p-3 rounded-lg border-2 border-primary/20 bg-primary/5">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <Label className="font-semibold">Series *</Label>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Every book belongs to a series. Choose an existing series or
                create a new one.
              </p>

              {!isCreatingNewSeries ? (
                <div className="space-y-2">
                  <Select
                    value={formData.seriesId}
                    onValueChange={(val) =>
                      setFormData({ ...formData, seriesId: val })
                    }
                  >
                    <SelectTrigger
                      className={
                        !formData.seriesId ? "border-destructive/50" : ""
                      }
                    >
                      <SelectValue placeholder="Select a series..." />
                    </SelectTrigger>
                    <SelectContent>
                      {existingSeries?.map((series) => (
                        <SelectItem key={series.id} value={series.id}>
                          {series.title}
                        </SelectItem>
                      ))}
                      {(!existingSeries || existingSeries.length === 0) && (
                        <SelectItem value="_none" disabled>
                          No series yet - create one below
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setIsCreatingNewSeries(true)}
                  >
                    <Plus className="mr-2 h-3 w-3" /> Create New Series
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={newSeriesName}
                      onChange={(e) => setNewSeriesName(e.target.value)}
                      placeholder="Enter series name..."
                      autoFocus
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleCreateNewSeries}
                      disabled={!newSeriesName.trim()}
                    >
                      Create
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsCreatingNewSeries(false);
                      setNewSeriesName("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>

            {/* Book Number */}
            <div className="space-y-2">
              <Label>Book Number *</Label>
              <Input
                value={formData.seriesIndex}
                onChange={(e) =>
                  setFormData({ ...formData, seriesIndex: e.target.value })
                }
                placeholder="e.g. Book 1, Book 2"
              />
              <p className="text-xs text-muted-foreground">
                Position in the series (e.g., "Book 1", "Book 2", "Prequel")
              </p>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label>Title *</Label>
              <div className="flex gap-2">
                <Input
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="My Awesome Novel"
                />
                <Button
                  variant="outline"
                  onClick={handleSurpriseMe}
                  title="Surprise Me"
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Author */}
            <div className="space-y-2">
              <Label>Author / Pen Name</Label>
              {!isCreatingNewAuthor ? (
                <div className="space-y-2">
                  <Select
                    value={formData.author}
                    onValueChange={(val) =>
                      setFormData({ ...formData, author: val })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select author..." />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueAuthors.map((author) => (
                        <SelectItem key={author} value={author}>
                          {author}
                        </SelectItem>
                      ))}
                      {uniqueAuthors.length === 0 && (
                        <SelectItem value="_none" disabled>
                          No authors yet - enter one below
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setIsCreatingNewAuthor(true)}
                  >
                    <Plus className="mr-2 h-3 w-3" /> Enter New Author
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    value={formData.author}
                    onChange={(e) =>
                      setFormData({ ...formData, author: e.target.value })
                    }
                    placeholder="e.g. J.K. Rowling"
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsCreatingNewAuthor(false);
                    }}
                  >
                    Back to Author List
                  </Button>
                </div>
              )}
            </div>

            {/* Save Location */}
            <div className="space-y-2">
              <Label>Save Location *</Label>
              <div className="flex gap-2">
                <Input
                  value={formData.savePath}
                  readOnly
                  placeholder="Click 'Choose Folder' to select location"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleChooseLocation}
                  className="shrink-0"
                >
                  📁 Choose Folder
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Your project will be saved in a folder named after your title at
                this location.
              </p>
            </div>

            {/* Language */}
            <div className="space-y-2">
              <Label>Language</Label>
              <Select
                value={formData.language}
                onValueChange={(val) =>
                  setFormData({ ...formData, language: val })
                }
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
              <p className="text-xs text-muted-foreground">
                Used for AI generation and spellcheck.
              </p>
            </div>

            {/* Validation Warning */}
            {!formData.seriesId && (
              <div className="flex items-center gap-2 p-2 rounded bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>Please select or create a series to continue</span>
              </div>
            )}
          </div>
        </div>

        {/* Fixed footer - always visible */}
        <DialogFooter className="flex-shrink-0 border-t pt-4">
          <Button onClick={handleCreate} disabled={!isFormValid}>
            Create Novel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
