'use client';

import React from 'react';
import type { Series, Project } from '@/domain/entities/types';
import { useSeriesRepository } from '@/hooks/use-series-repository';
import { invalidateQueries } from '@/hooks/use-live-query';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreHorizontal, Pencil, Trash2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { EditSeriesDialog } from './EditSeriesDialog';

interface SeriesCardProps {
    series: Series;
    projects: Project[];
}

export function SeriesCard({ series, projects }: SeriesCardProps) {
    const seriesRepo = useSeriesRepository();
    const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
    const [showEditDialog, setShowEditDialog] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await seriesRepo.delete(series.id);
            toast.success(`Series "${series.title}" deleted`);
            invalidateQueries();
        } catch (error: any) {
            // Backend will reject if projects still reference it
            toast.error(error?.message || 'Failed to delete series');
        } finally {
            setIsDeleting(false);
            setShowDeleteDialog(false);
        }
    };

    const projectCount = projects.length;
    const statusLabel = series.status === 'in-progress' ? 'In Progress' :
        series.status === 'completed' ? 'Completed' :
            series.status === 'planned' ? 'Planned' : null;

    return (
        <>
            <Card className="group hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                            <CardTitle className="truncate">{series.title}</CardTitle>
                            <CardDescription className="mt-1 flex items-center gap-2 flex-wrap">
                                <span>
                                    {projectCount === 0 ? 'No books yet' :
                                        projectCount === 1 ? '1 book' :
                                            `${projectCount} books`}
                                </span>
                                {series.genre && (
                                    <Badge variant="secondary" className="text-xs">{series.genre}</Badge>
                                )}
                                {statusLabel && (
                                    <Badge
                                        variant={series.status === 'completed' ? 'default' : 'outline'}
                                        className="text-xs"
                                    >
                                        {statusLabel}
                                    </Badge>
                                )}
                            </CardDescription>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <MoreHorizontal className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                                    <Pencil className="w-4 h-4 mr-2" />
                                    Edit Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => setShowDeleteDialog(true)}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </CardHeader>
                <CardContent>
                    {projects.length > 0 ? (
                        <ul className="space-y-2">
                            {projects.slice(0, 5).map((project, index) => (
                                <li
                                    key={project.id}
                                    className="flex items-center gap-2 text-sm text-muted-foreground"
                                >
                                    <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
                                    <span className="font-medium text-foreground/80">
                                        {project.seriesIndex || `#${index + 1}`}:
                                    </span>
                                    <span className="truncate">{project.title}</span>
                                </li>
                            ))}
                            {projects.length > 5 && (
                                <li className="text-sm text-muted-foreground italic">
                                    ...and {projects.length - 5} more
                                </li>
                            )}
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground italic">
                            Create a project and add it to this series
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete "{series.title}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {projectCount > 0 ? (
                                <div className="space-y-3">
                                    <p>
                                        This series contains <strong>{projectCount} book(s)</strong>:
                                    </p>
                                    <ul className="list-disc pl-5 text-sm">
                                        {projects.slice(0, 5).map(p => (
                                            <li key={p.id}>{p.title}</li>
                                        ))}
                                        {projects.length > 5 && (
                                            <li className="italic">...and {projects.length - 5} more</li>
                                        )}
                                    </ul>
                                    <p className="font-medium text-destructive">
                                        You must remove all books from this series before deleting it.
                                    </p>
                                </div>
                            ) : (
                                <p>This action cannot be undone.</p>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        {projectCount === 0 && (
                            <AlertDialogAction
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                {isDeleting ? 'Deleting...' : 'Delete Series'}
                            </AlertDialogAction>
                        )}
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Edit Series Dialog */}
            <EditSeriesDialog
                series={series as any}
                open={showEditDialog}
                onOpenChange={setShowEditDialog}
            />
        </>
    );
}
