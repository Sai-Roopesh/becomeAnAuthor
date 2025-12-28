'use client';

/**
 * World Timeline View
 * 
 * Chronological timeline of world history events (separate from story timeline).
 * Groups events by era and displays them on a horizontal timeline.
 */

import { useState, useMemo } from 'react';
// useLiveQuery removed - unused
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Plus,
    Calendar,
    Edit,
    Trash2,
    Crown,
    Leaf,
    Mountain,
    Wand2,
    Cpu,
    Swords,
    MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorldTimeline } from '../hooks/use-world-timeline';
// useAppServices removed - unused
import type { WorldEvent, WorldEventCategory } from '@/domain/entities/types';

interface WorldTimelineViewProps {
    projectId: string;
    seriesId: string;
}

const CATEGORY_CONFIG: Record<WorldEventCategory, { label: string; icon: React.ElementType; color: string }> = {
    political: { label: 'Political', icon: Crown, color: 'text-purple-500 bg-purple-500/10' },
    cultural: { label: 'Cultural', icon: Leaf, color: 'text-green-500 bg-green-500/10' },
    natural: { label: 'Natural', icon: Mountain, color: 'text-blue-500 bg-blue-500/10' },
    magical: { label: 'Magical', icon: Wand2, color: 'text-amber-500 bg-amber-500/10' },
    technological: { label: 'Technological', icon: Cpu, color: 'text-cyan-500 bg-cyan-500/10' },
    military: { label: 'Military', icon: Swords, color: 'text-red-500 bg-red-500/10' },
    other: { label: 'Other', icon: MoreHorizontal, color: 'text-muted-foreground bg-muted' },
};

const IMPORTANCE_COLORS = {
    'minor': 'border-l-muted-foreground',
    'moderate': 'border-l-blue-500',
    'major': 'border-l-amber-500',
    'world-changing': 'border-l-red-500',
};

const createEmptyEvent = (projectId: string): Omit<WorldEvent, 'year' | 'era'> & { year?: number; era?: string } => ({
    id: crypto.randomUUID(),
    projectId,
    title: '',
    description: '',
    date: '',
    category: 'other',
    importance: 'moderate',
    linkedCodexIds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
});

export function WorldTimelineView({ projectId }: WorldTimelineViewProps) {
    // worldTimelineRepository removed - unused

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    // Use a type that allows year to be undefined for the editing form
    type EditableWorldEvent = Omit<WorldEvent, 'year' | 'era'> & { year?: number; era?: string };
    const [editingEvent, setEditingEvent] = useState<EditableWorldEvent | null>(null);
    const [selectedEra, setSelectedEra] = useState<string | null>(null);

    const {
        events,
        // loading removed - unused
        saveEvent,
        deleteEvent
    } = useWorldTimeline({ projectId });

    // Group events by era
    const eventsByEra = useMemo(() => {
        if (!events) return new Map<string, WorldEvent[]>();

        const grouped = new Map<string, WorldEvent[]>();
        const sortedEvents = [...events].sort((a, b) => (a.year ?? 0) - (b.year ?? 0));

        for (const event of sortedEvents) {
            const era = event.era || 'Unknown Era';
            if (!grouped.has(era)) {
                grouped.set(era, []);
            }
            grouped.get(era)!.push(event);
        }

        return grouped;
    }, [events]);

    const eras = Array.from(eventsByEra.keys());

    const handleAddEvent = () => {
        setEditingEvent(createEmptyEvent(projectId));
        setIsDialogOpen(true);
    };

    const handleEditEvent = (event: WorldEvent) => {
        setEditingEvent({ ...event });
        setIsDialogOpen(true);
    };

    const handleSaveEvent = async () => {
        if (!editingEvent) return;

        await saveEvent(editingEvent as WorldEvent);
        setIsDialogOpen(false);
        setEditingEvent(null);
    };

    const handleDeleteEvent = async (eventId: string) => {
        await deleteEvent(eventId);
    };

    if (!events) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-muted-foreground">Loading world timeline...</div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 p-4 border-b bg-background/80 backdrop-blur-md">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-primary" />
                        <h2 className="text-lg font-semibold">World Timeline</h2>
                        <Badge variant="outline">{events.length} events</Badge>
                    </div>
                    <Button onClick={handleAddEvent} size="sm" className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Event
                    </Button>
                </div>

                {/* Era Filter */}
                {eras.length > 1 && (
                    <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                        <Badge
                            variant={selectedEra === null ? 'default' : 'outline'}
                            className="cursor-pointer whitespace-nowrap"
                            onClick={() => setSelectedEra(null)}
                        >
                            All Eras
                        </Badge>
                        {eras.map(era => (
                            <Badge
                                key={era}
                                variant={selectedEra === era ? 'default' : 'outline'}
                                className="cursor-pointer whitespace-nowrap"
                                onClick={() => setSelectedEra(era)}
                            >
                                {era}
                            </Badge>
                        ))}
                    </div>
                )}
            </div>

            {/* Timeline Content */}
            <div className="flex-1 min-h-0 overflow-y-auto p-6">
                {events.length === 0 ? (
                    <EmptyState
                        icon={<Calendar className="h-12 w-12" />}
                        title="No World Events Yet"
                        description="Create historical events that shaped your world. Track wars, discoveries, natural disasters, and more."
                        action={{
                            label: 'Add First Event',
                            onClick: handleAddEvent,
                        }}
                    />
                ) : (
                    <div className="space-y-8">
                        {Array.from(eventsByEra.entries())
                            .filter(([era]) => selectedEra === null || era === selectedEra)
                            .map(([era, eraEvents]) => (
                                <div key={era}>
                                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-primary" />
                                        {era}
                                        <span className="text-sm text-muted-foreground font-normal">
                                            ({eraEvents.length} events)
                                        </span>
                                    </h3>
                                    <div className="relative pl-6 border-l-2 border-border space-y-4">
                                        {eraEvents.map(event => {
                                            const categoryConfig = CATEGORY_CONFIG[event.category];
                                            const Icon = categoryConfig.icon;

                                            return (
                                                <Card
                                                    key={event.id}
                                                    className={cn(
                                                        'p-4 relative border-l-4 ml-4',
                                                        IMPORTANCE_COLORS[event.importance]
                                                    )}
                                                >
                                                    {/* Timeline dot */}
                                                    <div className="absolute -left-[2.35rem] top-4 h-3 w-3 rounded-full bg-primary border-2 border-background" />

                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <Badge className={cn('gap-1', categoryConfig.color)}>
                                                                    <Icon className="h-3 w-3" />
                                                                    {categoryConfig.label}
                                                                </Badge>
                                                                {event.date && (
                                                                    <span className="text-sm text-muted-foreground">
                                                                        {event.date}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <h4 className="font-semibold">{event.title}</h4>
                                                            <p className="text-sm text-muted-foreground mt-1">
                                                                {event.description}
                                                            </p>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                onClick={() => handleEditEvent(event)}
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-destructive"
                                                                onClick={() => handleDeleteEvent(event.id)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                    </div>
                )}
            </div>

            {/* Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {editingEvent?.createdAt === editingEvent?.updatedAt ? 'Add World Event' : 'Edit World Event'}
                        </DialogTitle>
                    </DialogHeader>

                    {editingEvent && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Title</label>
                                <Input
                                    value={editingEvent.title}
                                    onChange={e => setEditingEvent({ ...editingEvent, title: e.target.value })}
                                    placeholder="The Great War, Discovery of Magic..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Era</label>
                                    <Input
                                        value={editingEvent.era || ''}
                                        onChange={e => setEditingEvent({ ...editingEvent, era: e.target.value })}
                                        placeholder="Age of Dragons..."
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Date</label>
                                    <Input
                                        value={editingEvent.date}
                                        onChange={e => setEditingEvent({ ...editingEvent, date: e.target.value })}
                                        placeholder="Year 450..."
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Category</label>
                                    <Select
                                        value={editingEvent.category}
                                        onValueChange={v => setEditingEvent({ ...editingEvent, category: v as WorldEventCategory })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                                                <SelectItem key={key} value={key}>
                                                    {config.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Importance</label>
                                    <Select
                                        value={editingEvent.importance}
                                        onValueChange={v => setEditingEvent({ ...editingEvent, importance: v as WorldEvent['importance'] })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="minor">Minor</SelectItem>
                                            <SelectItem value="moderate">Moderate</SelectItem>
                                            <SelectItem value="major">Major</SelectItem>
                                            <SelectItem value="world-changing">World-Changing</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-1 block">Year (for sorting)</label>
                                <Input
                                    type="number"
                                    value={editingEvent.year ?? ''}
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (val) {
                                            setEditingEvent({
                                                ...editingEvent,
                                                year: parseInt(val, 10)
                                            });
                                        } else {
                                            // Remove year property to avoid undefined assignment
                                            // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                            const { year: _year, ...rest } = editingEvent;
                                            setEditingEvent(rest as typeof editingEvent);
                                        }
                                    }}
                                    placeholder="450"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-1 block">Description</label>
                                <Textarea
                                    value={editingEvent.description}
                                    onChange={e => setEditingEvent({ ...editingEvent, description: e.target.value })}
                                    placeholder="Describe what happened..."
                                    rows={3}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveEvent} disabled={!editingEvent?.title}>
                            Save Event
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
