"use client";

import { Suspense } from "react";
import { EditorContainer } from "@/features/editor/components/EditorContainer";
import { PlanView } from "@/features/plan/components/plan-view";
import { ChatInterface } from "@/features/chat/components/chat-interface";
import { SearchPalette } from "@/features/search/components/SearchPalette";
import { TopNavigation } from "@/features/navigation";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useProjectStore } from "@/store/use-project-store";
import { useLiveQuery } from "@/hooks/use-live-query";
import { useAppServices } from "@/infrastructure/di/AppContext";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FolderOpen, Loader2 } from "lucide-react";
import { listRecentProjects, type RecentProject } from "@/core/tauri/commands";
import { useOpenProject } from "@/hooks/use-open-project";
import { toast } from "@/shared/utils/toast-service";

function ProjectRecovery({
  title,
  description,
  projects,
  recents,
  isOpening,
  onOpenRecent,
  onOpenPicker,
}: {
  title: string;
  description: string;
  projects: Array<{ id: string; title: string; path?: string }>;
  recents: RecentProject[];
  isOpening: boolean;
  onOpenRecent: (path: string, projectId?: string) => Promise<void>;
  onOpenPicker: () => Promise<void>;
}) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center text-muted-foreground p-4">
      <div className="w-full max-w-xl rounded-xl border bg-card p-6 space-y-5">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          <p>{description}</p>
        </div>

        {recents.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              Recent Projects
            </p>
            <div className="space-y-2 max-h-56 overflow-auto pr-1">
              {recents.map((recent) => {
                const known = projects.find((p) => p.path === recent.path);
                return (
                  <button
                    key={`${recent.path}-${recent.lastOpened}`}
                    className="w-full rounded-lg border p-3 text-left hover:bg-muted/40 transition-colors"
                    onClick={() => onOpenRecent(recent.path, known?.id)}
                  >
                    <p className="font-medium text-foreground truncate">
                      {known?.title || recent.title || "Untitled Project"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {recent.path}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={onOpenPicker} disabled={isOpening} className="gap-2">
            {isOpening ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FolderOpen className="h-4 w-4" />
            )}
            Open Project Folder
          </Button>
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function ProjectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("id") || "";
  const { projectRepository: projectRepo } = useAppServices();
  const { openFromPicker, openByPath, isOpening } = useOpenProject();

  const { viewMode, setActiveProjectId } = useProjectStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const [autoRecoveryAttempted, setAutoRecoveryAttempted] = useState(false);
  const [openingRecentPath, setOpeningRecentPath] = useState<string | null>(
    null,
  );

  const allProjects = useLiveQuery(() => projectRepo.getAll(), [projectRepo], {
    keys: "projects",
  });
  const recentProjects = useLiveQuery(() => listRecentProjects(), [], {
    keys: "projects",
  });

  const projectsWithPath = useMemo(() => {
    return (allProjects ?? []).map((project) => {
      const withPath = project as typeof project & { _tauriPath?: string };
      return {
        id: project.id,
        title: project.title,
        ...(withPath._tauriPath ? { path: withPath._tauriPath } : {}),
      };
    });
  }, [allProjects]);

  const recentProjectId = useMemo(() => {
    if (!recentProjects || !allProjects) return "";
    const byPath = new Map(
      projectsWithPath
        .filter((project) => project.path)
        .map((project) => [project.path as string, project.id]),
    );

    for (const recent of recentProjects) {
      const id = byPath.get(recent.path);
      if (id) return id;
    }

    if (allProjects.length > 0) {
      const fallback = [...allProjects].sort(
        (a, b) => b.updatedAt - a.updatedAt,
      );
      return fallback[0]?.id ?? "";
    }

    return "";
  }, [allProjects, recentProjects, projectsWithPath]);

  useEffect(() => {
    if (projectId || autoRecoveryAttempted) return;
    if (!allProjects || !recentProjects) return;
    setAutoRecoveryAttempted(true);

    if (recentProjectId) {
      router.replace(`/project?id=${recentProjectId}`);
    }
  }, [
    allProjects,
    autoRecoveryAttempted,
    projectId,
    recentProjectId,
    recentProjects,
    router,
  ]);

  const project = useLiveQuery(
    () => (projectId ? projectRepo.get(projectId) : Promise.resolve(undefined)),
    [projectId, projectRepo],
    { keys: "projects" },
  );

  // Dynamic document title based on project name and view mode
  useEffect(() => {
    if (project?.title) {
      const modeLabel = viewMode.charAt(0).toUpperCase() + viewMode.slice(1);
      document.title = `${project.title} - ${modeLabel} | Novel Writer`;
    } else {
      document.title = "Project | Novel Writer";
    }

    return () => {
      document.title = "OpenSource Novel Writer";
    };
  }, [project?.title, viewMode]);

  useEffect(() => {
    if (!projectId) return;
    setActiveProjectId(projectId);
    return () => {
      setActiveProjectId(null);
    };
  }, [projectId, setActiveProjectId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleOpenFromPicker = async () => {
    const opened = await openFromPicker();
    if (opened) {
      router.push(`/project?id=${opened.id}`);
      toast.success(`Opened "${opened.title}"`);
    }
  };

  const handleOpenRecent = async (path: string, knownProjectId?: string) => {
    if (knownProjectId) {
      router.push(`/project?id=${knownProjectId}`);
      return;
    }

    try {
      setOpeningRecentPath(path);
      const opened = await openByPath(path);
      if (opened) {
        router.push(`/project?id=${opened.id}`);
        toast.success(`Opened "${opened.title}"`);
      }
    } finally {
      setOpeningRecentPath(null);
    }
  };

  const projectsLoaded =
    allProjects !== undefined && recentProjects !== undefined;
  const projectMissing = Boolean(projectId) && projectsLoaded && !project;

  if (!projectId) {
    return (
      <ProjectRecovery
        title="No Project Selected"
        description="Pick a recent project or open one from disk."
        projects={projectsWithPath}
        recents={recentProjects ?? []}
        isOpening={isOpening || Boolean(openingRecentPath)}
        onOpenRecent={handleOpenRecent}
        onOpenPicker={handleOpenFromPicker}
      />
    );
  }

  if (!project && !projectMissing) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center text-muted-foreground">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading project...
        </div>
      </div>
    );
  }

  if (projectMissing) {
    return (
      <ProjectRecovery
        title="Project Not Found"
        description="This project link is outdated or the project was moved. Open a recent project instead."
        projects={projectsWithPath}
        recents={recentProjects ?? []}
        isOpening={isOpening || Boolean(openingRecentPath)}
        onOpenRecent={handleOpenRecent}
        onOpenPicker={handleOpenFromPicker}
      />
    );
  }

  if (!project) {
    return (
      <ProjectRecovery
        title="Project Unavailable"
        description="This project could not be loaded. Open a recent project or choose one from disk."
        projects={projectsWithPath}
        recents={recentProjects ?? []}
        isOpening={isOpening || Boolean(openingRecentPath)}
        onOpenRecent={handleOpenRecent}
        onOpenPicker={handleOpenFromPicker}
      />
    );
  }

  return (
    <div className="h-[100dvh] min-h-[100dvh] overflow-hidden flex flex-col">
      <TopNavigation />

      <SearchPalette
        projectId={projectId}
        open={searchOpen}
        onOpenChange={setSearchOpen}
      />

      <div className="flex-1 overflow-hidden">
        {viewMode === "plan" ? (
          <PlanView projectId={projectId} />
        ) : viewMode === "write" ? (
          <EditorContainer projectId={projectId} />
        ) : viewMode === "chat" ? (
          <ChatInterface projectId={projectId} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Unknown view mode
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center">
      <div className="text-muted-foreground">Loading project...</div>
    </div>
  );
}

export default function ProjectPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ProjectContent />
    </Suspense>
  );
}
