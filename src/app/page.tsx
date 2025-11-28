'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/core/database';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CreateProjectDialog } from '@/features/project/components/CreateProjectDialog';
import { RestoreProjectDialog } from '@/features/data-management/components/RestoreProjectDialog';
import { BookOpen, MoreVertical, Trash2 } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { DataManagementMenu } from '@/components/data-management/data-management-menu';
import { ExportProjectButton } from '@/components/data-management/export-project-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useConfirmation } from '@/hooks/use-confirmation';

export default function Dashboard() {
  const projects = useLiveQuery(() => db.projects.toArray());
  const { confirm, ConfirmationDialog } = useConfirmation();

  if (!projects) return null;

  const hasProjects = projects.length > 0;

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const confirmed = await confirm({
      title: 'Delete Project',
      description: 'Are you sure you want to DELETE this novel? This will permanently delete all scenes, chapters, acts, and associated data. This cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive'
    });

    if (confirmed) {
      await db.projects.delete(projectId);
      await db.nodes.where('projectId').equals(projectId).delete();
      await db.codex.where('projectId').equals(projectId).delete();
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BookOpen className="h-8 w-8" /> NovelCrafter Clone
        </h1>
        <div className="flex gap-2">
          <DataManagementMenu />
          {hasProjects && (
            <>
              <RestoreProjectDialog />
              <CreateProjectDialog />
            </>
          )}
        </div>
      </div>

      {!hasProjects ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 border-2 border-dashed rounded-xl bg-muted/10 p-12">
          <div className="bg-background p-6 rounded-full shadow-sm">
            <BookOpen className="h-12 w-12 text-primary" />
          </div>
          <div className="space-y-2 max-w-md">
            <h2 className="text-2xl font-bold">Welcome to your Writing Studio!</h2>
            <p className="text-muted-foreground">
              Let's get you started. Create a new novel or restore an existing backup.
            </p>
          </div>
          <div className="flex gap-3">
            <CreateProjectDialog />
            <RestoreProjectDialog />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {projects.map((project) => (
            <Link key={project.id} href={`/project/${project.id}`} className="group">
              <Card className="h-full overflow-hidden hover:shadow-lg transition-all border-muted group-hover:border-primary/50">
                <div className="aspect-[1.6/1] bg-muted relative overflow-hidden">
                  {project.coverImage ? (
                    <img src={project.coverImage} alt={project.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50 text-muted-foreground">
                      <BookOpen className="h-12 w-12 opacity-20" />
                    </div>
                  )}
                  {project.archived && (
                    <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                      Archived
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <h2 className="font-bold text-lg leading-tight mb-1 group-hover:text-primary transition-colors">{project.title}</h2>
                  <p className="text-sm text-muted-foreground">{project.author || 'Unknown Author'}</p>
                  {project.seriesIndex && (
                    <p className="text-xs text-muted-foreground mt-2 bg-secondary/50 inline-block px-2 py-0.5 rounded">
                      {project.seriesIndex}
                    </p>
                  )}
                </CardContent>
                <CardFooter className="p-4 pt-0 text-xs text-muted-foreground flex justify-between items-center">
                  <div className="flex gap-2">
                    <span>{project.language || 'English'}</span>
                    <span>•</span>
                    <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 -mr-2"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <ExportProjectButton projectId={project.id} />
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={(e) => handleDeleteProject(e, project.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Project
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <ConfirmationDialog />
    </div>
  );
}
