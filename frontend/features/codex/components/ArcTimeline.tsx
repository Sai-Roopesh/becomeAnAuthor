'use client';

import type { CodexEntry, ArcPoint } from '@/domain/entities/types';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useState } from 'react';
import { ArcPointEditor } from './ArcPointEditor';

interface ArcTimelineProps {
    entry: CodexEntry;
    seriesId: string;
    onAddPoint: (point: Omit<ArcPoint, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    onUpdatePoint: (pointId: string, updates: Partial<ArcPoint>) => Promise<void>;
    onDeletePoint: (pointId: string) => Promise<void>;
}

/**
 * Arc Timeline Component
 * Visualizes character evolution across series with:
 * - Stats graph (using Recharts)
 * - Timeline visualization
 * - Arc point creation/editing
 */
export function ArcTimeline({
    entry,
    seriesId,
    onAddPoint,
    onUpdatePoint,
    onDeletePoint
}: ArcTimelineProps) {
    const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
    const [editorOpen, setEditorOpen] = useState(false);

    const arcPoints = [...(entry.arcPoints || [])].sort((a, b) => a.timestamp - b.timestamp);
    const selectedPoint = arcPoints.find(p => p.id === selectedPointId);

    // Prepare data for chart
    const chartData = arcPoints.map((point) => ({
        name: point.eventLabel,
        ...point.stats,
        age: point.age
    }));

    // Get all unique stat names for graph lines
    const statNames = Array.from(
        new Set(arcPoints.flatMap(p => Object.keys(p.stats ?? {})))
    );

    // Colors for graph lines
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    if (arcPoints.length === 0) {
        return (
            <div className="text-center py-12">
                <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                    No arc points yet. Track how this character evolves across the series.
                </p>
                <Button onClick={() => setEditorOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Add First Milestone
                </Button>

                <ArcPointEditor
                    seriesId={seriesId}
                    entryId={entry.id}
                    entryName={entry.name}
                    open={editorOpen}
                    onClose={() => setEditorOpen(false)}
                    onSave={onAddPoint}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Graph */}
            {chartData.length > 1 && statNames.length > 0 && (
                <div className="bg-card p-4 rounded-lg border">
                    <h4 className="text-sm font-semibold mb-4">Stats Over Time</h4>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={chartData}>
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 12 }}
                                angle={-45}
                                textAnchor="end"
                                height={80}
                            />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            {statNames.map((stat, idx) => (
                                <Line
                                    key={stat}
                                    type="monotone"
                                    dataKey={stat}
                                    stroke={colors[idx % colors.length] || '#888888'}
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Timeline */}
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <h4 className="text-sm font-semibold">Character Evolution</h4>
                    <Button size="sm" onClick={() => {
                        setSelectedPointId(null);
                        setEditorOpen(true);
                    }}>
                        <Plus className="mr-2 h-3 w-3" /> Add Milestone
                    </Button>
                </div>

                {arcPoints.map((point, idx) => (
                    <div
                        key={point.id}
                        className="relative pl-6 pb-6 last:pb-0 border-l-2 border-primary/20"
                    >
                        {/* Marker */}
                        <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-primary border-4 border-background" />

                        {/* Content */}
                        <div className="bg-card p-3 rounded-lg border hover:border-primary/50 transition-colors cursor-pointer"
                            onClick={() => {
                                setSelectedPointId(point.id);
                                setEditorOpen(true);
                            }}>
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <div className="font-semibold">{point.eventLabel}</div>
                                    {point.age && (
                                        <div className="text-xs text-muted-foreground">Age {point.age}</div>
                                    )}
                                </div>
                                {point.status && (
                                    <span className="text-xs px-2 py-1 bg-primary/10 rounded">
                                        {point.status}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{point.description}</p>

                            {/* Phase 5: Show key context */}
                            {point.knowledgeState?.knows && point.knowledgeState.knows.length > 0 && (
                                <div className="text-xs mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                                    <strong className="text-blue-700 dark:text-blue-400">Knows:</strong> {point.knowledgeState.knows.join(', ')}
                                </div>
                            )}
                            {point.emotionalState?.primaryEmotion && (
                                <div className="text-xs mt-2 p-2 bg-red-50 dark:bg-red-950/20 rounded">
                                    <strong className="text-red-700 dark:text-red-400">Emotion:</strong> {point.emotionalState.primaryEmotion}
                                    {point.emotionalState.intensity && ` (${point.emotionalState.intensity}/10)`}
                                </div>
                            )}
                            {point.goalsAndMotivations?.primaryGoal && (
                                <div className="text-xs mt-2 p-2 bg-green-50 dark:bg-green-950/20 rounded">
                                    <strong className="text-green-700 dark:text-green-400">Goal:</strong> {point.goalsAndMotivations.primaryGoal}
                                </div>
                            )}

                            {point.location && (
                                <div className="text-xs text-muted-foreground mt-2">
                                    📍 {point.location}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Editor for selected/new point */}
            {editorOpen && (
                <ArcPointEditor
                    seriesId={seriesId}
                    entryId={entry.id}
                    entryName={entry.name}
                    existingPoint={selectedPoint}
                    open={editorOpen}
                    onClose={() => {
                        setEditorOpen(false);
                        setSelectedPointId(null);
                    }}
                    onSave={async (updates) => {
                        if (selectedPoint) {
                            await onUpdatePoint(selectedPoint.id, updates);
                        } else {
                            await onAddPoint(updates);
                        }
                    }}
                />
            )}
        </div>
    );
}
