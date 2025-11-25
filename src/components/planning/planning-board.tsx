'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/core/database';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GripVertical } from 'lucide-react';

export function PlanningBoard({ projectId }: { projectId: string }) {
    const nodes = useLiveQuery(
        () => db.nodes.where('projectId').equals(projectId).sortBy('order')
    );

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const [activeId, setActiveId] = useState<string | null>(null);

    const handleDragStart = (event: any) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = async (event: any) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            const oldIndex = nodes?.findIndex((n) => n.id === active.id);
            const newIndex = nodes?.findIndex((n) => n.id === over.id);

            if (oldIndex !== undefined && newIndex !== undefined && nodes) {
                const newOrder = arrayMove(nodes, oldIndex, newIndex);

                // Update orders in DB
                // This is a simplified reorder that updates ALL nodes. 
                // In a real app with hierarchy, we'd only reorder siblings.
                // For this "Board" view, let's assume we are just reordering top-level or flattened list for now,
                // OR we need a better strategy for hierarchy.

                // Let's stick to a simple list view of Scenes for the "Board" for now to demonstrate capability,
                // or maybe just reorder siblings if we group them.

                // For this iteration, let's just reorder the visual list and update the 'order' field of the moved item
                // to be between its new neighbors.

                // Actually, to support full reordering, we should probably update all affected items.
                // Let's just update the moved item's order for simplicity if possible, but arrayMove implies shifting.

                const updates = newOrder.map((node, index) => ({
                    key: node.id,
                    changes: { order: index * 100 }
                }));

                await Promise.all(updates.map(u => db.nodes.update(u.key, u.changes)));
            }
        }

        setActiveId(null);
    };

    // Filter to just Scenes for a "Scene Board" view initially
    const scenes = nodes?.filter(n => n.type === 'scene') || [];

    return (
        <div className="p-8 h-full overflow-y-auto bg-muted/10">
            <h2 className="text-2xl font-bold mb-6">Story Board (Scenes)</h2>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <SortableContext items={scenes.map(s => s.id)} strategy={verticalListSortingStrategy}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {scenes.map((scene) => (
                            <SortableItem key={scene.id} id={scene.id} scene={scene} />
                        ))}
                    </div>
                </SortableContext>
                <DragOverlay>
                    {activeId ? (
                        <div className="opacity-50">
                            <Card>
                                <CardHeader className="p-4">
                                    <CardTitle className="text-base">Dragging...</CardTitle>
                                </CardHeader>
                            </Card>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}

function SortableItem({ id, scene }: { id: string, scene: any }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <Card className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow">
                <CardHeader className="p-4 flex flex-row items-center space-y-0 gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">{scene.title}</CardTitle>
                    </div>
                    <Badge variant="outline">{scene.status || 'Draft'}</Badge>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-sm text-muted-foreground line-clamp-3">
                    {scene.summary || "No summary provided."}
                </CardContent>
            </Card>
        </div>
    );
}
