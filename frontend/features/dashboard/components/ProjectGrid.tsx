import { Project } from '@/lib/config/types';
import { ProjectCard } from './ProjectCard';
import { CreateProjectDialog } from '@/features/project';
import { Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface ProjectGridProps {
    projects: Project[];
    onDeleteProject: (e: React.MouseEvent, projectId: string) => void;
}

export function ProjectGrid({ projects, onDeleteProject }: ProjectGridProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {/* New Project Card - Always first */}
            <div className="animate-in fade-in zoom-in duration-500 fill-mode-backwards" style={{ animationDelay: '0ms' }}>
                <CreateProjectDialog
                    trigger={
                        <div className="h-full cursor-pointer group">
                            <Card className="h-full flex flex-col items-center justify-center border-dashed border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all duration-300 min-h-[300px]">
                                <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300 mb-4">
                                    <Plus className="w-8 h-8 text-primary" />
                                </div>
                                <h3 className="font-heading font-semibold text-lg text-primary">Create New Novel</h3>
                                <p className="text-sm text-muted-foreground mt-2">Start your next masterpiece</p>
                            </Card>
                        </div>
                    }
                />
            </div>

            {projects.map((project, index) => (
                <div
                    key={project.id}
                    className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-backwards"
                    style={{ animationDelay: `${(index + 1) * 100}ms` }}
                >
                    <ProjectCard project={project} onDelete={onDeleteProject} />
                </div>
            ))}
        </div>
    );
}
