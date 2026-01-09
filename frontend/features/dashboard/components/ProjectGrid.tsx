"use client";

import { useRouter } from "next/navigation";
import { Project } from "@/domain/entities/types";
import { ProjectCard } from "./ProjectCard";
import { Plus, FolderOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useOpenProject } from "@/hooks/use-open-project";
import { toast } from "@/shared/utils/toast-service";

interface ProjectGridProps {
  projects: Project[];
  seriesMap: Map<string, string>;
  onDeleteProject: (e: React.MouseEvent, projectId: string) => void;
  createProjectSlot?: React.ReactNode;
  restoreProjectSlot?: React.ReactNode;
  renderExportButton?: (projectId: string) => React.ReactNode;
}

export function ProjectGrid({
  projects,
  seriesMap,
  onDeleteProject,
  createProjectSlot,
  restoreProjectSlot,
  renderExportButton,
}: ProjectGridProps) {
  const router = useRouter();
  const { openFromPicker, isOpening } = useOpenProject();

  const handleOpenNovel = async () => {
    const project = await openFromPicker();
    if (project) {
      router.push(`/project?id=${project.id}`);
      toast.success(`Opened "${project.title}"`);
    }
  };

  // Default create project card content
  const defaultCreateCard = (
    <div className="h-full cursor-pointer group">
      <Card className="h-full min-h-72 flex flex-col items-center justify-center border-dashed border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all duration-300">
        <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300 mb-4">
          <Plus className="w-8 h-8 text-primary" />
        </div>
        <h3 className="font-heading font-semibold text-lg text-primary">
          Create New Novel
        </h3>
        <p className="text-sm text-muted-foreground mt-2">
          Start your next masterpiece
        </p>
      </Card>
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {/* New Project Card */}
      <div
        className="animate-in fade-in zoom-in duration-500 fill-mode-backwards"
        style={{ animationDelay: "0ms" }}
      >
        {createProjectSlot || defaultCreateCard}
      </div>

      {/* Open Existing Project Card */}
      <div
        className="animate-in fade-in zoom-in duration-500 fill-mode-backwards"
        style={{ animationDelay: "50ms" }}
      >
        <div className="h-full cursor-pointer group" onClick={handleOpenNovel}>
          <Card className="h-full min-h-72 flex flex-col items-center justify-center border-dashed border-2 border-muted-foreground/20 bg-muted/5 hover:bg-muted/10 hover:border-muted-foreground/50 transition-all duration-300">
            <div className="p-4 rounded-full bg-muted/10 group-hover:bg-muted/20 group-hover:scale-110 transition-all duration-300 mb-4">
              <FolderOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-heading font-semibold text-lg text-muted-foreground">
              {isOpening ? "Opening..." : "Open Novel..."}
            </h3>
            <p className="text-sm text-muted-foreground/70 mt-2">
              Browse to an existing project
            </p>
          </Card>
        </div>
      </div>

      {/* Restore Project Card - only shown if slot provided */}
      {restoreProjectSlot && (
        <div
          className="animate-in fade-in zoom-in duration-500 fill-mode-backwards"
          style={{ animationDelay: "100ms" }}
        >
          {restoreProjectSlot}
        </div>
      )}

      {projects.map((project, index) => (
        <div
          key={project.id}
          className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-backwards"
          style={{ animationDelay: `${(index + 2) * 100}ms` }}
        >
          <ProjectCard
            project={project}
            seriesName={seriesMap.get(project.seriesId)}
            onDelete={onDeleteProject}
            renderExportButton={renderExportButton}
          />
        </div>
      ))}
    </div>
  );
}
