import { BookOpen, Sparkles } from 'lucide-react';
import { CreateProjectDialog } from '@/features/project/components/CreateProjectDialog';
import { RestoreProjectDialog } from '@/features/data-management/components/RestoreProjectDialog';

export function EmptyState() {
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
                    Your journey begins here. Create your first novel or restore a backup to continue where you left off.
                </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm items-center justify-center">
                <CreateProjectDialog />
                <RestoreProjectDialog />
            </div>
        </div>
    );
}
