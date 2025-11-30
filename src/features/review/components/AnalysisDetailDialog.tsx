'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { StoryAnalysis } from '@/lib/config/types';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, BookOpen, Users, Activity, Layers, Trash2 } from 'lucide-react';
import { useAnalysisDelete } from '../hooks/use-analysis-delete';
import { useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface AnalysisDetailDialogProps {
    analysis: StoryAnalysis | null;
    open: boolean;
    onClose: () => void;
}

export function AnalysisDetailDialog({ analysis, open, onClose }: AnalysisDetailDialogProps) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const { deleteAnalysis } = useAnalysisDelete();

    if (!analysis) return null;

    const handleDelete = async () => {
        try {
            await deleteAnalysis(analysis.id);
            setShowDeleteConfirm(false);
            onClose();
        } catch (error) {
            // Error already toasted by hook
        }
    };

    const getInsightIcon = (type: string) => {
        switch (type) {
            case 'positive':
                return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            case 'warning':
                return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
            case 'error':
                return <AlertCircle className="h-4 w-4 text-red-500" />;
            default:
                return <Info className="h-4 w-4 text-blue-500" />;
        }
    };

    const getSeverityBadge = (severity: number) => {
        const variants = {
            1: 'default',
            2: 'secondary',
            3: 'destructive',
        } as const;

        const labels = {
            1: 'Minor',
            2: 'Moderate',
            3: 'Critical',
        };

        return (
            <Badge variant={variants[severity as keyof typeof variants] || 'default'}>
                {labels[severity as keyof typeof labels] || 'Unknown'}
            </Badge>
        );
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0">
                <div className="p-6 pb-4 border-b shrink-0">
                    <DialogHeader>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                                <DialogTitle className="capitalize flex items-center gap-2">
                                    {analysis.analysisType.replace('-', ' ')} Analysis
                                    <Badge variant="outline" className="ml-2 font-normal text-xs">
                                        {analysis.model}
                                    </Badge>
                                </DialogTitle>
                                <DialogDescription>
                                    Analyzed {new Date(analysis.createdAt).toLocaleString()} • {analysis.scenesAnalyzedCount} scenes
                                </DialogDescription>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowDeleteConfirm(true)}
                                className="shrink-0 hover:bg-destructive/10 hover:text-destructive"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </DialogHeader>
                </div>

                <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
                    <div className="px-6 pt-2 shrink-0">
                        <TabsList className="w-full justify-start">
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="details">Detailed Results</TabsTrigger>
                            <TabsTrigger value="insights">
                                Insights
                                <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
                                    {analysis.results.insights.length}
                                </Badge>
                            </TabsTrigger>
                            <TabsTrigger value="metadata">Metadata</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="overview" className="flex-1 min-h-0 mt-0">
                        <ScrollArea className="h-full">
                            <div className="p-6 space-y-6">
                                {/* Summary Card */}
                                {analysis.results.summary && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <BookOpen className="h-4 w-4 text-primary" />
                                                Executive Summary
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                {analysis.results.summary}
                                            </p>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Critical Insights Preview */}
                                {analysis.results.insights.some(i => i.severity === 3) && (
                                    <div className="space-y-3">
                                        <h3 className="font-semibold flex items-center gap-2 text-red-500">
                                            <AlertCircle className="h-4 w-4" />
                                            Critical Issues Detected
                                        </h3>
                                        {analysis.results.insights
                                            .filter(i => i.severity === 3)
                                            .map(insight => (
                                                <Card key={insight.id} className="border-red-200 dark:border-red-900/50">
                                                    <CardContent className="pt-6">
                                                        <div className="flex items-start gap-3">
                                                            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                                                            <div className="space-y-1">
                                                                <p className="font-medium text-sm">{insight.message}</p>
                                                                {insight.autoSuggest && (
                                                                    <p className="text-xs text-muted-foreground">
                                                                        Suggestion: {insight.autoSuggest}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="details" className="flex-1 min-h-0 mt-0">
                        <ScrollArea className="h-full">
                            <div className="p-6">
                                <DetailedResultsViewer analysis={analysis} />
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="insights" className="flex-1 min-h-0 mt-0">
                        <ScrollArea className="h-full">
                            <div className="p-6 space-y-4">
                                {analysis.results.insights.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No specific insights found for this analysis.
                                    </div>
                                ) : (
                                    analysis.results.insights.map((insight) => (
                                        <Card key={insight.id}>
                                            <CardContent className="pt-6">
                                                <div className="flex items-start gap-3">
                                                    <div className="mt-0.5">{getInsightIcon(insight.type)}</div>
                                                    <div className="flex-1 space-y-2">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <p className="text-sm font-medium">{insight.message}</p>
                                                            {getSeverityBadge(insight.severity)}
                                                        </div>

                                                        {insight.autoSuggest && (
                                                            <div className="bg-muted/50 p-3 rounded-md text-xs">
                                                                <span className="font-semibold block mb-1">Suggestion:</span>
                                                                {insight.autoSuggest}
                                                            </div>
                                                        )}

                                                        {insight.sceneReferences && insight.sceneReferences.length > 0 && (
                                                            <div className="flex flex-wrap gap-2 mt-2">
                                                                {insight.sceneReferences.map((ref, idx) => (
                                                                    <Badge key={idx} variant="outline" className="text-[10px]">
                                                                        {ref.sceneTitle}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="metadata" className="flex-1 min-h-0 mt-0">
                        <ScrollArea className="h-full">
                            <div className="p-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Analysis Metadata</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div className="space-y-1">
                                                <span className="text-muted-foreground block">Word Count</span>
                                                <span className="font-medium">{analysis.wordCountAtAnalysis.toLocaleString()}</span>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-muted-foreground block">Scenes Analyzed</span>
                                                <span className="font-medium">{analysis.scenesAnalyzedCount}</span>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-muted-foreground block">AI Model</span>
                                                <span className="font-medium">{analysis.model}</span>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-muted-foreground block">Tokens Used</span>
                                                <span className="font-medium">{analysis.tokensUsed?.toLocaleString() || 'Unknown'}</span>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t">
                                            <h4 className="text-sm font-medium mb-2">Raw Data</h4>
                                            <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-60">
                                                {JSON.stringify(analysis.results.metrics, null, 2)}
                                            </pre>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>

                {/* Delete Confirmation Dialog */}
                <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Analysis?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete this {analysis.analysisType.replace('-', ' ')} analysis?
                                This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDelete}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </DialogContent>
        </Dialog>
    );
}

function DetailedResultsViewer({ analysis }: { analysis: StoryAnalysis }) {
    const data = analysis.results.metrics;
    if (!data) return <div className="text-muted-foreground">No detailed data available.</div>;

    // Synopsis Analysis
    if (analysis.analysisType === 'synopsis') {
        return (
            <div className="space-y-6">
                {data.plotPoints && Array.isArray(data.plotPoints) && (
                    <div className="space-y-3">
                        <h3 className="font-semibold flex items-center gap-2">
                            <Activity className="h-4 w-4" />
                            Key Plot Points
                        </h3>
                        <div className="grid gap-3">
                            {data.plotPoints.map((point: string, idx: number) => (
                                <Card key={idx}>
                                    <CardContent className="p-4 flex gap-3">
                                        <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center p-0 shrink-0">
                                            {idx + 1}
                                        </Badge>
                                        <p className="text-sm">{point}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {data.themes && Array.isArray(data.themes) && (
                    <div className="space-y-3">
                        <h3 className="font-semibold flex items-center gap-2">
                            <Layers className="h-4 w-4" />
                            Identified Themes
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {data.themes.map((theme: string, idx: number) => (
                                <Badge key={idx} variant="secondary" className="px-3 py-1 text-sm">
                                    {theme}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Plot Threads Analysis
    if (analysis.analysisType === 'plot-threads' && data.threads) {
        return (
            <div className="space-y-6">
                {data.threads.map((thread: any, idx: number) => (
                    <Card key={idx}>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center justify-between">
                                {thread.name}
                                <Badge variant={thread.status === 'resolved' ? 'default' : 'outline'}>
                                    {thread.status}
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">{thread.description}</p>
                            {thread.development && (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-semibold uppercase text-muted-foreground">Development</h4>
                                    <div className="pl-4 border-l-2 space-y-3">
                                        {thread.development.map((dev: any, i: number) => (
                                            <div key={i} className="text-sm">
                                                <span className="font-medium text-xs text-muted-foreground block mb-1">
                                                    Scene {dev.sceneIndex + 1}
                                                </span>
                                                {dev.note}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    // Character Arcs Analysis
    if (analysis.analysisType === 'character-arcs' && data.characters) {
        return (
            <div className="space-y-6">
                {data.characters.map((char: any, idx: number) => (
                    <Card key={idx}>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center justify-between">
                                {char.name}
                                <Badge variant="secondary">{char.role || 'Character'}</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground block text-xs uppercase">Arc Status</span>
                                    <span className="font-medium capitalize">{char.arcStatus}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-xs uppercase">Confidence</span>
                                    <span className="font-medium">{char.confidence || 'N/A'}</span>
                                </div>
                            </div>
                            <div>
                                <span className="text-muted-foreground block text-xs uppercase mb-1">Arc Description</span>
                                <p className="text-sm">{char.arcDescription}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    // Default fallback for other types
    return (
        <Card>
            <CardContent className="p-4">
                <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-[500px]">
                    {JSON.stringify(data, null, 2)}
                </pre>
            </CardContent>
        </Card>
    );
}
