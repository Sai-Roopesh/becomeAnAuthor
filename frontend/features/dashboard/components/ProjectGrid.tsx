"use client";

import { Project } from "@/domain/entities/types";
import { ProjectCard } from "./ProjectCard";

interface ProjectGridProps {
  projects: Project[];
  seriesMap: Map<string, string>;
  onDeleteProject: (e: React.MouseEvent, projectId: string) => void;
  renderExportButton?: (projectId: string) => React.ReactNode;
}

export function ProjectGrid({
  projects,
  seriesMap,
  onDeleteProject,
  renderExportButton,
}: ProjectGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {projects.map((project, index) => (
        <div
          key={project.id}
          className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-backwards"
          style={{ animationDelay: `${index * 100}ms` }}
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
