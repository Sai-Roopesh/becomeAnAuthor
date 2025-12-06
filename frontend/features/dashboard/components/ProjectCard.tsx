import Link from 'next/link';
import { MoreVertical, Trash2, BookOpen, Clock, Globe, User } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ExportProjectButton } from '@/components/data-management/export-project-button';
import type { Project } from '@/lib/config/types';

interface ProjectCardProps {
    project: Project;
    onDelete: (e: React.MouseEvent, projectId: string) => void;
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
    return (
        <Link href={`/project?id=${project.id}`} className="group block h-full">
            <Card className="h-full flex flex-col overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 hover:border-primary/30 group-hover:ring-1 group-hover:ring-primary/20">
                <div className="aspect-[1.8/1] bg-muted relative overflow-hidden">
                    {project.coverImage ? (
                        <img
                            src={project.coverImage}
                            alt={project.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 text-primary/20 group-hover:text-primary/30 transition-colors">
                            <BookOpen className="h-16 w-16" />
                        </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-60" />

                    {project.archived && (
                        <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md text-white text-[10px] font-medium px-2 py-1 rounded-full uppercase tracking-wider border border-white/10">
                            Archived
                        </div>
                    )}
                </div>

                <CardContent className="p-5 relative flex-grow">
                    <div className="mb-1 flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-wider">
                        {project.seriesIndex ? `Book ${project.seriesIndex}` : 'Novel'}
                    </div>
                    <h2 className="font-heading font-bold text-xl leading-tight mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {project.title}
                    </h2>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <User className="w-3 h-3" />
                        {project.author || 'Unknown Author'}
                    </p>
                </CardContent>

                <CardFooter className="p-4 text-xs text-muted-foreground flex justify-between items-center border-t border-border/30 bg-muted/20">
                    <div className="flex gap-3">
                        <span className="flex items-center gap-1" title="Language">
                            <Globe className="w-3 h-3" />
                            {project.language || 'EN'}
                        </span>
                        <span className="flex items-center gap-1" title="Last Updated">
                            <Clock className="w-3 h-3" />
                            {new Date(project.updatedAt).toLocaleDateString()}
                        </span>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 -mr-2 text-muted-foreground hover:text-foreground"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                }}
                            >
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <ExportProjectButton projectId={project.id} />
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                onClick={(e) => onDelete(e, project.id)}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Project
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </CardFooter>
            </Card>
        </Link>
    );
}
