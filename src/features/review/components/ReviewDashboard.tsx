'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/core/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, PlayCircle, Clock, FileText } from 'lucide-react';
import { VersionWarning } from './VersionWarning';
import { AnalysisRunDialog } from './AnalysisRunDialog';
import { AnalysisDetailDialog } from './AnalysisDetailDialog';
import { useManuscriptVersion } from '../hooks/use-manuscript-version';
import type { StoryAnalysis } from '@/lib/config/types';

interface ReviewDashboardProps {
    projectId: string;
}

export function ReviewDashboard({ projectId }: ReviewDashboardProps) {
    const [runDialogOpen, setRunDialogOpen] = useState(false);
    const [selectedAnalysis, setSelectedAnalysis] = useState<StoryAnalysis | null>(null);

    // Fetch all analyses for this project
    const analyses = useLiveQuery(
        () =>
            db.storyAnalyses
                .where('projectId')
                .equals(projectId)
                .reverse()
                .sortBy('createdAt'),
        [projectId]
    );

    const latestAnalysis = analyses?.[0];
    const editsSinceAnalysis = useManuscriptVersion(latestAnalysis);

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="border-b p-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Story Analysis</h1>
                    <p className="text-sm text-muted-foreground">
                        AI-powered developmental feedback for your manuscript
                    </p>
                </div>
                <Button onClick={() => setRunDialogOpen(true)} size="lg">
                    <PlayCircle className="w-4 h-4 mr-2" />
                    Run Analysis
                </Button>
            </div>

            {/* Version Warning */}
            {editsSinceAnalysis > 0 && latestAnalysis && (
                <VersionWarning lastAnalyzed={latestAnalysis.createdAt} scenesEdited={editsSinceAnalysis} />
            )}

            {/* Main Content */}
            <div className="flex-1 overflow-auto p-6">
                {!analyses || analyses.length === 0 ? (
                    <EmptyState onRunAnalysis={() => setRunDialogOpen(true)} />
                ) : (
                    <AnalysisOverview analyses={analyses} onSelectAnalysis={setSelectedAnalysis} />
                )}
            </div>

            {/* Run Analysis Dialog */}
            <AnalysisRunDialog projectId={projectId} open={runDialogOpen} onClose={() => setRunDialogOpen(false)} />

            {/* Analysis Detail Dialog */}
            <AnalysisDetailDialog
                analysis={selectedAnalysis}
                open={!!selectedAnalysis}
                onClose={() => setSelectedAnalysis(null)}
            />
        </div>
    );
}

function EmptyState({ onRunAnalysis }: { onRunAnalysis: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center h-full space-y-4 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
                <h2 className="text-xl font-semibold">No Analyses Yet</h2>
                <p className="text-muted-foreground max-w-md">
                    Run your first story analysis to get AI-powered insights on plot threads, character arcs,
                    timeline consistency, and more.
                </p>
            </div>
            <Button onClick={onRunAnalysis} size="lg">
                <PlayCircle className="w-4 h-4 mr-2" />
                Run Your First Analysis
            </Button>
        </div>
    );
}

function AnalysisOverview({ analyses, onSelectAnalysis }: { analyses: StoryAnalysis[]; onSelectAnalysis: (analysis: StoryAnalysis) => void }) {
    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Total Analyses</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analyses.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">Completed analyses</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Latest Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">
                                {new Date(analyses[0].createdAt).toLocaleDateString()}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {analyses[0].scenesAnalyzedCount} scenes analyzed
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Analysis Types</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Set(analyses.map(a => a.analysisType)).size}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Different types run</p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Analyses */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Analyses</CardTitle>
                    <CardDescription>Your most recent story analyses</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {analyses.slice(0, 5).map(analysis => (
                            <div
                                key={analysis.id}
                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                                onClick={() => onSelectAnalysis(analysis)}
                            >
                                <div className="flex-1">
                                    <div className="font-medium capitalize">
                                        {analysis.analysisType.replace('-', ' ')}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {analysis.results.summary?.substring(0, 100) ||
                                            `${analysis.results.insights.length} insights found`}
                                    </div>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {new Date(analysis.createdAt).toLocaleDateString()}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
