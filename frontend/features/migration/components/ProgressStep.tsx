import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface ProgressStepProps {
    progress: number;
    status: 'idle' | 'running' | 'complete' | 'error';
    error?: string | null;
}

export function ProgressStep({ progress, status, error }: ProgressStepProps) {
    const steps = [
        { label: 'Initializing...', threshold: 0 },
        { label: 'Creating default series structure', threshold: 25 },
        { label: 'Migrating projects to series', threshold: 50 },
        { label: 'Migrating and merging codex', threshold: 75 },
        { label: 'Finalizing...', threshold: 100 },
    ];

    const currentStepLabel = steps.reverse().find(s => progress >= s.threshold)?.label || steps[0]?.label || 'Processing...';


    return (
        <div className="space-y-8 py-4">
            <div className="space-y-2 text-center">
                <h2 className="text-2xl font-bold">Migrating...</h2>
                <p className="text-muted-foreground">
                    Please do not close the application.
                </p>
            </div>

            <div className="space-y-6">
                <div className="flex justify-center">
                    {status === 'error' ? (
                        <div className="rounded-full bg-red-100 p-4">
                            <AlertCircle className="w-8 h-8 text-red-600" />
                        </div>
                    ) : (
                        <div className="rounded-full bg-primary/10 p-4 relative">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-[10px] font-bold">{Math.round(progress)}%</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="font-medium">{currentStepLabel}</span>
                        <span className="text-muted-foreground">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>

                <div className="space-y-2 pt-4">
                    {/* Visual step indicators */}
                    {[
                        "Setup Structure",
                        "Move Projects",
                        "Migrate Codex",
                        "Cleanup"
                    ].map((stepName, idx) => {
                        const stepProgress = (idx + 1) * 25;
                        const isComplete = progress >= stepProgress;
                        const isCurrent = progress < stepProgress && progress > (stepProgress - 25);

                        return (
                            <div key={idx} className="flex items-center gap-3 text-sm">
                                <div className={cn(
                                    "w-5 h-5 rounded-full flex items-center justify-center border",
                                    isComplete ? "bg-green-500 border-green-500 text-white" :
                                        isCurrent ? "border-primary text-primary" : "border-muted text-muted-foreground"
                                )}>
                                    {isComplete ? <CheckCircle2 className="w-3 h-3" /> : (idx + 1)}
                                </div>
                                <span className={cn(
                                    isComplete ? "text-foreground" :
                                        isCurrent ? "font-medium text-foreground" : "text-muted-foreground"
                                )}>
                                    {stepName}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {status === 'error' && (
                <Alert variant="destructive">
                    <AlertTitle>Migration Failed</AlertTitle>
                    <AlertDescription>
                        {error || "An unexpected error occurred. No changes were saved."}
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}
