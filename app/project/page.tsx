'use client';

import { Suspense } from 'react';
import { EditorContainer } from '@/features/editor/components/EditorContainer';
import { PlanView } from '@/features/plan/components/plan-view';
import { ChatInterface } from '@/features/chat/components/chat-interface';
import { ReviewDashboard } from '@/features/review/components/ReviewDashboard';
import { MultiTabWarning } from '@/components/multi-tab-warning';
import { SearchPalette } from '@/features/search/components/SearchPalette';
import { TopNavigation } from '@/components/top-navigation';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useProjectStore } from '@/store/use-project-store';
import { getTabCoordinator } from '@/core/tab-coordinator';
import { useLiveQuery } from '@/hooks/use-live-query';
import { useAppServices } from '@/infrastructure/di/AppContext';

function ProjectContent() {
    const searchParams = useSearchParams();
    const projectId = searchParams.get('id') || '';
    const { projectRepository: projectRepo } = useAppServices();

    const { viewMode } = useProjectStore();
    const [multiTabCount, setMultiTabCount] = useState(0);
    const [searchOpen, setSearchOpen] = useState(false);

    // Fetch project to get seriesId
    const project = useLiveQuery(() => projectId ? projectRepo.get(projectId) : Promise.resolve(undefined), [projectId, projectRepo]);

    useEffect(() => {
        if (!projectId) return;

        const coordinator = getTabCoordinator();
        coordinator.notifyProjectOpened(projectId);

        coordinator.onMultiTab((pid, tabCount) => {
            if (pid === projectId) {
                setMultiTabCount(tabCount);
            }
        });

        return () => {
            coordinator.notifyProjectClosed(projectId);
        };
    }, [projectId]);

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

    if (!projectId) {
        return (
            <div className="flex items-center justify-center h-screen text-muted-foreground">
                <div className="text-center">
                    <h2 className="text-xl font-semibold mb-2">No Project Selected</h2>
                    <p>Please select a project from the dashboard.</p>
                </div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="flex items-center justify-center h-screen text-muted-foreground">
                Loading project...
            </div>
        );
    }

    return (
        <div className="h-screen overflow-hidden flex flex-col">
            {/* Top Navigation Bar */}
            <TopNavigation projectId={projectId} />

            {/* Multi-tab warning banner */}
            {multiTabCount > 1 && (
                <MultiTabWarning
                    projectId={projectId}
                    tabCount={multiTabCount}
                    onDismiss={() => setMultiTabCount(0)}
                />
            )}

            <SearchPalette
                projectId={projectId}
                seriesId={project.seriesId}
                open={searchOpen}
                onOpenChange={setSearchOpen}
            />

            <div className="flex-1 overflow-hidden">
                {viewMode === 'plan' ? (
                    <PlanView projectId={projectId} />
                ) : viewMode === 'write' ? (
                    <EditorContainer projectId={projectId} />
                ) : viewMode === 'chat' ? (
                    <ChatInterface projectId={projectId} />
                ) : viewMode === 'review' ? (
                    <ReviewDashboard projectId={projectId} />
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        Unknown view mode
                    </div>
                )}
            </div>
        </div>
    );
}

function LoadingFallback() {
    return (
        <div className="flex items-center justify-center h-screen">
            <div className="text-muted-foreground">Loading project...</div>
        </div>
    );
}

export default function ProjectPage() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <ProjectContent />
        </Suspense>
    );
}
