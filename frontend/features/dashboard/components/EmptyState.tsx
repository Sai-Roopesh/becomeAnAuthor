"use client";

import { useRouter } from 'next/navigation';
import { BookOpen, Sparkles, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateProjectDialog } from '@/features/project';
import { RestoreProjectDialog } from '@/features/data-management';
import { useOpenProject } from '@/hooks/use-open-project';
import { toast } from 'sonner';

export function EmptyState() {
    const router = useRouter();
    const { openFromPicker, isOpening, error } = useOpenProject();

    const handleOpenNovel = async () => {
        const project = await openFromPicker();
        if (project) {
            router.push(`/project?id=${project.id}`);
            toast.success(`Opened "${project.title}"`);
        } else if (error) {
            toast.error(error);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                <div className="relative bg-background p-8 rounded-full shadow-2xl border border-border/50">
                    <BookOpen className="h-16 w-16 text-primary" />
                </div>
                <div className="absolute -top-2 -right-2 p-2 bg-accent rounded-full animate-bounce delay-700">
                    <Sparkles className="h-4 w-4 text-accent-foreground" />
                </div>
            </div>

            <div className="space-y-4 max-w-md">
                <h2 className="text-3xl font-heading font-bold">Welcome to your Writing Studio</h2>
                <p className="text-muted-foreground text-lg leading-relaxed">
                    Your journey begins here. Create a new novel, open an existing one, or restore from backup.
                </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md items-center justify-center">
                <Button
                    onClick={handleOpenNovel}
                    disabled={isOpening}
                    variant="outline"
                    size="lg"
                    className="min-w-40"
                >
                    <FolderOpen className="mr-2 h-4 w-4" />
                    {isOpening ? 'Opening...' : 'Open Novel...'}
                </Button>
                <CreateProjectDialog />
                <RestoreProjectDialog />
            </div>
        </div>
    );
}

