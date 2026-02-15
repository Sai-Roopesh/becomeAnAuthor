"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  Plus,
  BookOpen,
  ChevronDown,
  FolderOpen,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAppServices } from "@/infrastructure/di/AppContext";
import { useSeriesRepository } from "@/hooks/use-series-repository";
import { invalidateQueries, useLiveQuery } from "@/hooks/use-live-query";
import { getProjectsPath } from "@/core/tauri/commands";
import { toast } from "@/shared/utils/toast-service";
import { logger } from "@/shared/utils/logger";

const log = logger.scope("CreateProjectDialog");
const DEFAULT_SERIES_INDEX = "Book 1";

function extractBookNumber(seriesIndex: string | undefined): number | null {
  if (!seriesIndex) return null;
  const match = seriesIndex.match(/\d+/);
  if (!match) return null;
  const parsed = parseInt(match[0], 10);
  if (!Number.isFinite(parsed) || parsed < 1) return null;
  return parsed;
}

function getNextSeriesIndex(
  seriesId: string,
  projects: Array<{ seriesId: string; seriesIndex: string }>,
): string {
  if (!seriesId) return DEFAULT_SERIES_INDEX;

  let maxBookNumber = 0;
  for (const project of projects) {
    if (project.seriesId !== seriesId) continue;
    const number = extractBookNumber(project.seriesIndex);
    if (number && number > maxBookNumber) {
      maxBookNumber = number;
    }
  }

  return `Book ${maxBookNumber + 1}`;
}

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
  seriesId?: string;
  seriesTitle?: string;
}

interface CreateFormData {
  title: string;
  author: string;
  language: string;
  seriesId: string;
  seriesIndex: string;
  savePath: string;
}

export function CreateProjectDialog({
  trigger,
  open: controlledOpen,
  onOpenChange,
  seriesId: lockedSeriesId,
  seriesTitle,
}: CreateProjectDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (value: boolean) => {
    if (onOpenChange) onOpenChange(value);
    else setInternalOpen(value);
  };

  const { projectRepository: projectRepo, nodeRepository: nodeRepo } =
    useAppServices();
  const seriesRepo = useSeriesRepository();
  const isSeriesLocked = Boolean(lockedSeriesId);

  const existingSeries = useLiveQuery(() => seriesRepo.getAll(), [seriesRepo], {
    keys: ["series", "projects"],
  });
  const existingProjects = useLiveQuery(
    () => projectRepo.getAll(),
    [projectRepo],
    {
      keys: "projects",
    },
  );

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [isCreatingNewSeries, setIsCreatingNewSeries] = useState(false);
  const [seriesIndexManuallyEdited, setSeriesIndexManuallyEdited] =
    useState(false);
  const [newSeriesName, setNewSeriesName] = useState("");
  const [defaultSavePath, setDefaultSavePath] = useState("");

  const initialFormData = useMemo<CreateFormData>(
    () => ({
      title: "",
      author: "",
      language: "English (US)",
      seriesId: lockedSeriesId ?? "",
      seriesIndex: DEFAULT_SERIES_INDEX,
      savePath: "",
    }),
    [lockedSeriesId],
  );

  const [formData, setFormData] = useState<CreateFormData>(initialFormData);

  const uniqueAuthors: string[] = useMemo(
    () =>
      Array.from(
        new Set(
          (existingProjects ?? [])
            .map((p) => p.author)
            .filter((author): author is string => Boolean(author?.trim())),
        ),
      ).sort(),
    [existingProjects],
  );

  useEffect(() => {
    if (lockedSeriesId) {
      setFormData((prev) => ({ ...prev, seriesId: lockedSeriesId }));
    }
  }, [lockedSeriesId]);

  const selectedSeriesId = lockedSeriesId ?? formData.seriesId;
  const suggestedSeriesIndex = useMemo(() => {
    return getNextSeriesIndex(selectedSeriesId, existingProjects ?? []);
  }, [selectedSeriesId, existingProjects]);

  useEffect(() => {
    if (!open || !selectedSeriesId || seriesIndexManuallyEdited) return;
    setFormData((prev) => {
      if (prev.seriesIndex === suggestedSeriesIndex) return prev;
      return { ...prev, seriesIndex: suggestedSeriesIndex };
    });
  }, [open, selectedSeriesId, suggestedSeriesIndex, seriesIndexManuallyEdited]);

  useEffect(() => {
    if (!open || defaultSavePath || formData.savePath) return;
    let cancelled = false;

    const loadDefaultPath = async () => {
      try {
        const path = await getProjectsPath();
        if (!cancelled && path) setDefaultSavePath(path);
      } catch (error) {
        log.warn("Failed to get default project path", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    void loadDefaultPath();
    return () => {
      cancelled = true;
    };
  }, [open, defaultSavePath, formData.savePath]);

  useEffect(() => {
    if (isSeriesLocked || formData.seriesId) return;
    if (!existingSeries || existingSeries.length === 0) return;
    const firstSeries = existingSeries[0];
    if (firstSeries) {
      setFormData((prev) => ({ ...prev, seriesId: firstSeries.id }));
    }
  }, [existingSeries, formData.seriesId, isSeriesLocked]);

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
      log.error("Failed to open directory picker", error);
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
      toast.error("Enter a series name");
      return;
    }

    try {
      const existing = await seriesRepo.getByName(newSeriesName.trim());
      const newId = existing
        ? existing.id
        : await seriesRepo.create({ title: newSeriesName.trim() });

      setFormData((prev) => ({ ...prev, seriesId: newId }));
      setSeriesIndexManuallyEdited(false);
      setIsCreatingNewSeries(false);
      setNewSeriesName("");
      invalidateQueries(["series", "projects"]);
      toast.success("Series ready");
    } catch (error) {
      log.error("Failed to create series", error);
      toast.error("Failed to create series");
    }
  };

  const resolveSeriesForCreate = async (): Promise<string> => {
    if (lockedSeriesId) return lockedSeriesId;
    if (formData.seriesId) return formData.seriesId;

    if (existingSeries && existingSeries.length > 0) {
      const firstSeries = existingSeries[0];
      if (firstSeries) return firstSeries.id;
    }

    const generatedSeriesName = formData.title.trim()
      ? `${formData.title.trim()} Series`
      : "My First Series";

    const existing = await seriesRepo.getByName(generatedSeriesName);
    if (existing) return existing.id;

    return seriesRepo.create({ title: generatedSeriesName });
  };

  const handleCreate = async () => {
    if (!formData.title.trim()) {
      toast.error("Please enter a title for your novel");
      return;
    }

    try {
      const seriesId = await resolveSeriesForCreate();
      const projectsInSeries = await projectRepo.getBySeries(seriesId);
      const nextSeriesIndex = getNextSeriesIndex(seriesId, projectsInSeries);
      const submittedSeriesIndex = seriesIndexManuallyEdited
        ? formData.seriesIndex.trim() || nextSeriesIndex
        : nextSeriesIndex;
      const savePath =
        formData.savePath || defaultSavePath || (await getProjectsPath());

      const projectId = await projectRepo.create({
        title: formData.title.trim(),
        author: formData.author.trim() || "Unknown",
        language: formData.language,
        seriesId,
        seriesIndex: submittedSeriesIndex,
        customPath: savePath,
      });

      const act = await nodeRepo.create({
        projectId,
        type: "act",
        title: "Act 1",
        order: 0,
        parentId: null,
        expanded: true,
      });

      const chapter = await nodeRepo.create({
        projectId,
        type: "chapter",
        title: "Chapter 1",
        order: 0,
        parentId: act.id,
        expanded: true,
      });

      await nodeRepo.create({
        projectId,
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

      invalidateQueries(["projects", "nodes", "series"]);
      toast.success(`Created "${formData.title.trim()}"`);

      setOpen(false);
      setAdvancedOpen(false);
      setIsCreatingNewSeries(false);
      setSeriesIndexManuallyEdited(false);
      setNewSeriesName("");
      setFormData(initialFormData);
      window.location.href = `/project?id=${projectId}`;
    } catch (error) {
      log.error("Failed to create project", error);
      const message =
        error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Failed to create project: ${message}`);
    }
  };

  const selectedSeriesTitle = useMemo(() => {
    if (seriesTitle) return seriesTitle;
    if (!formData.seriesId || !existingSeries)
      return "Auto-assign at create time";
    return (
      existingSeries.find((series) => series.id === formData.seriesId)?.title ||
      "Auto-assign at create time"
    );
  }, [seriesTitle, formData.seriesId, existingSeries]);

  const resolvedSavePath = formData.savePath || defaultSavePath;
  const isFormValid = Boolean(formData.title.trim());

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setAdvancedOpen(false);
          setIsCreatingNewSeries(false);
          setSeriesIndexManuallyEdited(false);
          setNewSeriesName("");
          setFormData(initialFormData);
        }
      }}
    >
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
                  Start in 30 seconds
                </p>
              </Card>
            </div>
          )}
        </DialogTrigger>
      )}

      <DialogContent className="sm:w-dialog-md max-h-[85dvh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {isSeriesLocked && selectedSeriesTitle
              ? `Create a New Novel in ${selectedSeriesTitle}`
              : "Create a New Novel"}
          </DialogTitle>
          <DialogDescription>
            Start with a title. We will create the structure automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-4">
          <div className="space-y-2">
            <Label>Title *</Label>
            <div className="flex gap-2">
              <Input
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="My Awesome Novel"
                autoFocus
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleSurpriseMe}
                title="Surprise Me"
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
              Quick Start Defaults
            </p>
            <p className="text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Series: <span className="font-medium">{selectedSeriesTitle}</span>
            </p>
            <p className="text-sm flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-primary" />
              Save location:
              <span className="font-medium truncate" title={resolvedSavePath}>
                {resolvedSavePath || "Loading default location..."}
              </span>
            </p>
          </div>

          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-between"
              >
                Advanced Options
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${advancedOpen ? "rotate-180" : ""}`}
                />
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent className="space-y-4 pt-3">
              <div className="space-y-2">
                <Label>Series</Label>

                {isSeriesLocked ? (
                  <div className="rounded-md border bg-background/50 p-3 text-sm">
                    {selectedSeriesTitle || "Selected series"}
                  </div>
                ) : !isCreatingNewSeries ? (
                  <div className="space-y-2">
                    <Select
                      value={formData.seriesId}
                      onValueChange={(val) => {
                        setSeriesIndexManuallyEdited(false);
                        setFormData((prev) => ({ ...prev, seriesId: val }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Auto-select first series" />
                      </SelectTrigger>
                      <SelectContent>
                        {(existingSeries ?? []).map((series) => (
                          <SelectItem key={series.id} value={series.id}>
                            {series.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setIsCreatingNewSeries(true)}
                    >
                      <Plus className="mr-2 h-3 w-3" />
                      Create New Series
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

              <div className="space-y-2">
                <Label>Book Number</Label>
                <Input
                  value={formData.seriesIndex}
                  onChange={(e) => {
                    setSeriesIndexManuallyEdited(true);
                    setFormData((prev) => ({
                      ...prev,
                      seriesIndex: e.target.value,
                    }));
                  }}
                  placeholder="Book 1"
                />
              </div>

              <div className="space-y-2">
                <Label>Author / Pen Name</Label>
                <Input
                  value={formData.author}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, author: e.target.value }))
                  }
                  placeholder="e.g. J.K. Rowling"
                  list="project-author-suggestions"
                />
                <datalist id="project-author-suggestions">
                  {uniqueAuthors.map((author) => (
                    <option key={author} value={author} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-2">
                <Label>Save Location</Label>
                <div className="flex gap-2">
                  <Input
                    value={resolvedSavePath}
                    readOnly
                    placeholder="Loading default location..."
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleChooseLocation}
                  >
                    Choose Folder
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Language</Label>
                <Select
                  value={formData.language}
                  onValueChange={(val) =>
                    setFormData((prev) => ({ ...prev, language: val }))
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
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4">
          <Button onClick={handleCreate} disabled={!isFormValid}>
            Create Novel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
