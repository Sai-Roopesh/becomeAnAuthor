'use client';

import { useEffect, useState } from 'react';
import { useProjectStore } from '@/store/use-project-store';
import { getTabCoordinator } from '@/core/tab-coordinator';
import { EditorContainer } from '@/features/editor/components/EditorContainer';
import { PlanView } from '@/features/plan/components/plan-view';
import { ChatInterface } from '@/features/chat/components/chat-interface';
import { ReviewDashboard } from '@/features/review/components/ReviewDashboard';
import { MultiTabWarning } from '@/components/multi-tab-warning';
import { SearchPalette } from '@/features/search/components/SearchPalette';
import { TopNavigation } from '@/features/navigation/components/TopNavigation';
import { useLiveQuery } from '@/hooks/use-live-query';
import { useAppServices } from '@/infrastructure/di/AppContext';

export function ProjectPageClient({ id }: { id: string }) {
    const { viewMode } = useProjectStore();
    const [multiTabCount, setMultiTabCount] = useState(0);
    const [searchOpen, setSearchOpen] = useState(false);
    const { projectRepository: projectRepo } = useAppServices();

    // Fetch project to get seriesId
    const project = useLiveQuery(() => projectRepo.get(id), [id, projectRepo]);

    useEffect(() => {
        const coordinator = getTabCoordinator();

        // Notify that this tab opened the project
        coordinator.notifyProjectOpened(id);

        // Listen for multi-tab scenarios
        coordinator.onMultiTab((projectId, tabCount) => {
            if (projectId === id) {
                setMultiTabCount(tabCount);
            }
        });

        // Cleanup on unmount
        return () => {
            coordinator.notifyProjectClosed(id);
        };
    }, [id]);

    // ✅ Cmd+K / Ctrl+K keyboard shortcut for search
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setSearchOpen(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Wait for project to load
    if (!project) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground">
                Loading project...
            </div>
        );
    }

    return (
        <div className="h-full overflow-hidden flex flex-col">
            <TopNavigation projectId={id} />

            {/* Multi-tab warning banner */}
            {multiTabCount > 1 && (
                <MultiTabWarning
                    projectId={id}
                    tabCount={multiTabCount}
                    onDismiss={() => setMultiTabCount(0)}
                />
            )}

            {/* Search Palette (Cmd+K) */}
            <SearchPalette
                projectId={id}
                seriesId={project.seriesId}
                open={searchOpen}
                onOpenChange={setSearchOpen}
            />

            <div className="flex-1 overflow-hidden">
                {viewMode === 'plan' ? (
                    <PlanView projectId={id} />
                ) : viewMode === 'write' ? (
                    <EditorContainer projectId={id} />
                ) : viewMode === 'chat' ? (
                    <ChatInterface projectId={id} />
                ) : viewMode === 'review' ? (
                    <ReviewDashboard projectId={id} />
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        Unknown view mode
                    </div>
                )}
            </div>
        </div>
    );
}
