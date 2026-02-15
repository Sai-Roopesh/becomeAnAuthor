"use client";

import { Suspense } from "react";
import { EditorContainer } from "@/features/editor/components/EditorContainer";
import { PlanView } from "@/features/plan/components/plan-view";
import { ChatInterface } from "@/features/chat/components/chat-interface";
import { ReviewDashboard } from "@/features/review/components/ReviewDashboard";
import { SearchPalette } from "@/features/search/components/SearchPalette";
import { TopNavigation } from "@/features/navigation";
import { ModelSelector } from "@/features/ai";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useProjectStore } from "@/store/use-project-store";

import { useLiveQuery } from "@/hooks/use-live-query";
import { useAppServices } from "@/infrastructure/di/AppContext";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

function ProjectContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("id") || "";
  const { projectRepository: projectRepo } = useAppServices();

  const { viewMode, setActiveProjectId } = useProjectStore();
  const [searchOpen, setSearchOpen] = useState(false);

  // Fetch project to get seriesId
  const project = useLiveQuery(
    () => (projectId ? projectRepo.get(projectId) : Promise.resolve(undefined)),
    [projectId, projectRepo],
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

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-screen text-muted-foreground">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold">No Project Selected</h2>
          <p className="text-muted-foreground">
            Please select a project from the dashboard.
          </p>
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-screen text-muted-foreground">
        Loading project...
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <TopNavigation />

      <SearchPalette
        projectId={projectId}
        seriesId={project.seriesId}
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
        ) : viewMode === "review" ? (
          <ReviewDashboard
            projectId={projectId}
            renderModelSelector={(props) => (
              <ModelSelector
                value={props.value}
                onValueChange={props.onValueChange}
              />
            )}
          />
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
    <div className="flex items-center justify-center h-screen">
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
