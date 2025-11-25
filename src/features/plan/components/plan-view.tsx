'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/core/database';
import { useNodeRepository } from '@/hooks/use-node-repository';
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
    const [viewType, setViewType] = useState<PlanViewType>('grid');
    const [search, setSearch] = useState('');

    const project = useLiveQuery(() => db.projects.get(projectId));
    const nodes = useLiveQuery(
        () => nodeRepo.getByProject(projectId),
        [projectId]
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
            <div className="border-b p-3 flex items-center gap-4">
                {/* View Switcher */}
                <div className="flex gap-1 bg-muted rounded-lg p-1">
                    <Button
                        variant={viewType === 'grid' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewType('grid')}
                        className="gap-2"
                    >
                        <LayoutGrid className="h-4 w-4" />
                        Grid
                    </Button>
                    <Button
                        variant={viewType === 'outline' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewType('outline')}
                        className="gap-2"
                    >
                        <List className="h-4 w-4" />
                        Outline
                    </Button>
                    <Button
                        variant={viewType === 'matrix' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewType('matrix')}
                        className="gap-2"
                    >
                        <Table className="h-4 w-4" />
                        Matrix
                    </Button>
                </div>

                {/* Search */}
                <div className="flex-1 max-w-md relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search scenes..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>

                {/* Settings */}
                <Button variant="ghost" size="icon">
                    <Settings className="h-4 w-4" />
                </Button>
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
