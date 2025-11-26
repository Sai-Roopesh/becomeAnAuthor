'use client';

import { Button } from '@/components/ui/button';
import { useProjectStore, ViewMode } from '@/store/use-project-store';
import { LayoutTemplate, PenTool, MessageSquare, Eye, Settings, Zap } from 'lucide-react';
import { ProjectSettingsDialog } from './project-settings-dialog';
import { SettingsDialog } from './settings-dialog';

export function TopNavigation({ projectId }: { projectId: string }) {
    const { viewMode, setViewMode } = useProjectStore();

    const modes: { id: ViewMode; label: string; icon: React.ElementType }[] = [
        { id: 'plan', label: 'Plan', icon: LayoutTemplate },
        { id: 'write', label: 'Write', icon: PenTool },
        { id: 'chat', label: 'Chat', icon: MessageSquare },
        { id: 'review', label: 'Review', icon: Eye },
    ];

    return (
        <div className="h-12 border-b flex items-center justify-between px-4 bg-background">
            <div className="flex items-center gap-1">
                {modes.map((mode) => (
                    <Button
                        key={mode.id}
                        variant={viewMode === mode.id ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode(mode.id)}
                        className="gap-2"
                    >
                        <mode.icon className="h-4 w-4" />
                        {mode.label}
                    </Button>
                ))}
            </div>
            <div className="flex items-center gap-2">
                <SettingsDialog />
                <ProjectSettingsDialog projectId={projectId} />
            </div>
        </div>
    );
}
