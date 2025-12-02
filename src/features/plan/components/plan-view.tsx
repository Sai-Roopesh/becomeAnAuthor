'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useNodeRepository } from '@/hooks/use-node-repository';
import { useRepository } from '@/hooks/use-repository';
import type { IProjectRepository } from '@/domain/repositories/IProjectRepository';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LayoutGrid, List, Table, Search, Settings, Plus } from 'lucide-react';
import { GridView } from './grid-view';
import { OutlineView } from './outline-view';
import { MatrixView } from './matrix-view';

type PlanViewType = 'grid' | 'outline' | 'matrix';

export function PlanView({ projectId }: { projectId: string }) {
    const nodeRepo = useNodeRepository();
    const projectRepo = useRepository<IProjectRepository>('projectRepository');
    const [viewType, setViewType] = useState<PlanViewType>('grid');
    const [search, setSearch] = useState('');

    const project = useLiveQuery(() => projectRepo.get(projectId), [projectId, projectRepo]);
    const nodes = useLiveQuery(
        () => nodeRepo.getByProject(projectId),
        [projectId, nodeRepo]
    );

    if (!project || !nodes) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-muted-foreground">Loading...</div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Toolbar */}
            <div className="sticky top-0 z-10 border-b p-4 flex flex-col sm:flex-row items-center gap-4 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
                {/* View Switcher - Segmented Control */}
                <div className="flex p-1 bg-muted/50 rounded-lg border border-border/50 shadow-inner">
                    {(['grid', 'outline', 'matrix'] as const).map((type) => (
                        <button
                            key={type}
                            onClick={() => setViewType(type)}
                            className={`
                                flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200
                                ${viewType === type
                                    ? 'bg-background text-primary shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'}
                            `}
                        >
                            {type === 'grid' && <LayoutGrid className="h-4 w-4" />}
                            {type === 'outline' && <List className="h-4 w-4" />}
                            {type === 'matrix' && <Table className="h-4 w-4" />}
                            <span className="capitalize">{type}</span>
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="flex-1 w-full max-w-md relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="Search scenes, characters, plot points..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 bg-muted/30 border-border/50 focus:bg-background transition-all"
                    />
                </div>

                {/* Settings & Actions */}
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-2 hidden sm:flex">
                        <Settings className="h-4 w-4" />
                        <span>View Options</span>
                    </Button>
                    <Button variant="ghost" size="icon" className="sm:hidden">
                        <Settings className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Main View */}
            <div className="flex-1 overflow-auto p-6">
                {viewType === 'grid' && <GridView projectId={projectId} nodes={nodes} searchQuery={search} />}
                {viewType === 'outline' && <OutlineView projectId={projectId} nodes={nodes} searchQuery={search} />}
                {viewType === 'matrix' && <MatrixView projectId={projectId} nodes={nodes} searchQuery={search} />}
            </div>
        </div>
    );
}
