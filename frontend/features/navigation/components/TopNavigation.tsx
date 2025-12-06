'use client';

import { Button } from '@/components/ui/button';
import { useProjectStore, ViewMode } from '@/store/use-project-store';
import { LayoutTemplate, PenTool, MessageSquare, Eye, Home } from 'lucide-react';
import { SettingsDialog } from '../../settings/components/SettingsDialog';
import Link from 'next/link';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

export function TopNavigation({ projectId }: { projectId: string }) {
    const { viewMode, setViewMode } = useProjectStore();

    const modes: { id: ViewMode; label: string; icon: React.ElementType }[] = [
        { id: 'plan', label: 'Plan', icon: LayoutTemplate },
        { id: 'write', label: 'Write', icon: PenTool },
        { id: 'chat', label: 'Chat', icon: MessageSquare },
        { id: 'review', label: 'Review', icon: Eye },
    ];

    return (
        <TooltipProvider delayDuration={300}>
            <div className="h-12 border-b flex items-center justify-between px-4 bg-background">
                <div className="flex items-center gap-1">
                    {/* Home Button */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Link href="/">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="mr-2"
                                >
                                    <Home className="h-4 w-4" />
                                    <span className="hidden sm:inline ml-2">Home</span>
                                </Button>
                            </Link>
                        </TooltipTrigger>
                        <TooltipContent>Back to Dashboard</TooltipContent>
                    </Tooltip>

                    <div className="h-6 w-px bg-border mr-2" />

                    {modes.map((mode) => (
                        <Button
                            key={mode.id}
                            variant={viewMode === mode.id ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode(mode.id)}
                            className="gap-2"
                        >
                            <mode.icon className="h-4 w-4" />
                            <span className="hidden sm:inline">{mode.label}</span>
                        </Button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => { }}
                        className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent"
                        aria-label="Open search"
                    >
                        <span>Search</span>
                        <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">⌘K</kbd>
                    </button>
                    <SettingsDialog />
                </div>
            </div>
        </TooltipProvider>
    );
}


