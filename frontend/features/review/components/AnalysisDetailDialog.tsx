'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { StoryAnalysis } from '@/lib/config/types';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, BookOpen, Users, Activity, Layers, Trash2, Sparkles, Clock, FileText } from 'lucide-react';
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
import { cn } from '@/lib/utils';

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
                return <CheckCircle2 className="h-5 w-5 text-green-500" />;
            case 'warning':
                return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
            case 'error':
                return <AlertCircle className="h-5 w-5 text-red-500" />;
            default:
                return <Info className="h-5 w-5 text-blue-500" />;
        }
    };

    const getSeverityBadge = (severity: number) => {
        const variants = {
            1: 'secondary',
            2: 'outline',
            3: 'destructive',
        } as const;

        const labels = {
            1: 'Minor',
            2: 'Moderate',
            3: 'Critical',
        };

        const variant = severity === 2 ? "outline" : (variants[severity as keyof typeof variants] || 'default');
        const className = severity === 2 ? "border-yellow-500 text-yellow-500" : "";

        return (
            <Badge variant={variant} className={cn("uppercase text-[10px] font-bold tracking-wider", className)}>
                {labels[severity as keyof typeof labels] || 'Unknown'}
            </Badge>
        );
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0 bg-background/95 backdrop-blur-xl border-border/50 overflow-hidden">
                <div className="p-6 pb-4 border-b shrink-0 bg-muted/20">
                    <DialogHeader>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                                <DialogTitle className="capitalize flex items-center gap-3 text-2xl font-heading font-bold">
                                    {analysis.analysisType.replace('-', ' ')} Analysis
                                    <Badge variant="secondary" className="font-normal text-xs bg-primary/10 text-primary border-primary/20">
                                        {analysis.model}
                                    </Badge>
                                </DialogTitle>
                                <DialogDescription className="mt-2 flex items-center gap-4 text-sm">
                                    <span className="flex items-center gap-1">
                                        <Clock className="h-3.5 w-3.5" />
                                        {new Date(analysis.createdAt).toLocaleString()}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <FileText className="h-3.5 w-3.5" />
                                        {analysis.scenesAnalyzedCount} scenes analyzed
                                    </span>
                                </DialogDescription>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowDeleteConfirm(true)}
                                className="shrink-0 hover:bg-destructive/10 hover:text-destructive rounded-full"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </DialogHeader>
                </div>

                <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
                    <div className="px-6 pt-4 shrink-0 border-b bg-background/50">
                        <TabsList className="w-full justify-start bg-transparent p-0 h-auto gap-6">
                            <TabsTrigger
                                value="overview"
                                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 font-medium text-muted-foreground data-[state=active]:text-foreground transition-all"
                            >
                                Overview
                            </TabsTrigger>
                            <TabsTrigger
                                value="details"
                                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 font-medium text-muted-foreground data-[state=active]:text-foreground transition-all"
                            >
                                Detailed Results
                            </TabsTrigger>
                            <TabsTrigger
                                value="insights"
                                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 font-medium text-muted-foreground data-[state=active]:text-foreground transition-all"
                            >
                                Insights
                                <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px] bg-muted text-muted-foreground">
                                    {analysis.results.insights.length}
                                </Badge>
                            </TabsTrigger>
                            <TabsTrigger
                                value="metadata"
                                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 font-medium text-muted-foreground data-[state=active]:text-foreground transition-all"
                            >
                                Metadata
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="overview" className="flex-1 min-h-0 mt-0 bg-muted/5">
                        <ScrollArea className="h-full">
                            <div className="p-8 space-y-8 max-w-3xl mx-auto">
                                {/* Summary Card */}
                                {analysis.results.summary && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-heading font-semibold flex items-center gap-2">
                                            <BookOpen className="h-5 w-5 text-primary" />
                                            Executive Summary
                                        </h3>
                                        <div className="prose prose-sm dark:prose-invert max-w-none bg-card p-6 rounded-xl border shadow-sm leading-relaxed">
                                            {analysis.results.summary}
                                        </div>
                                    </div>
                                )}

                                {/* Critical Insights Preview */}
                                {analysis.results.insights.some(i => i.severity === 3) && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-heading font-semibold flex items-center gap-2 text-destructive">
                                            <AlertCircle className="h-5 w-5" />
                                            Critical Issues Detected
                                        </h3>
                                        <div className="grid gap-4">
                                            {analysis.results.insights
                                                .filter(i => i.severity === 3)
                                                .map(insight => (
                                                    <Card key={insight.id} className="border-destructive/30 bg-destructive/5 shadow-sm">
                                                        <CardContent className="pt-6">
                                                            <div className="flex items-start gap-4">
                                                                <div className="p-2 rounded-full bg-destructive/10 shrink-0">
                                                                    <AlertCircle className="h-5 w-5 text-destructive" />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <p className="font-medium text-base">{insight.message}</p>
                                                                    {insight.autoSuggest && (
                                                                        <div className="bg-background/50 p-3 rounded-lg text-sm border border-destructive/10">
                                                                            <span className="font-semibold text-destructive text-xs uppercase tracking-wide block mb-1">Suggestion</span>
                                                                            {insight.autoSuggest}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="details" className="flex-1 min-h-0 mt-0 bg-muted/5">
                        <ScrollArea className="h-full">
                            <div className="p-8 max-w-4xl mx-auto">
                                <DetailedResultsViewer analysis={analysis} />
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="insights" className="flex-1 min-h-0 mt-0 bg-muted/5">
                        <ScrollArea className="h-full">
                            <div className="p-8 max-w-3xl mx-auto space-y-4">
                                {analysis.results.insights.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                        <Sparkles className="h-12 w-12 mb-4 opacity-20" />
                                        <p>No specific insights found for this analysis.</p>
                                    </div>
                                ) : (
                                    analysis.results.insights.map((insight) => (
                                        <Card key={insight.id} className="border-border/50 shadow-sm hover:shadow-md transition-all">
                                            <CardContent className="pt-6">
                                                <div className="flex items-start gap-4">
                                                    <div className="mt-1">{getInsightIcon(insight.type)}</div>
                                                    <div className="flex-1 space-y-3">
                                                        <div className="flex items-start justify-between gap-4">
                                                            <p className="text-base font-medium leading-snug">{insight.message}</p>
                                                            {getSeverityBadge(insight.severity)}
                                                        </div>

                                                        {insight.autoSuggest && (
                                                            <div className="bg-muted/30 p-4 rounded-lg text-sm border border-border/50">
                                                                <span className="font-semibold text-primary text-xs uppercase tracking-wide block mb-1">Suggestion</span>
                                                                {insight.autoSuggest}
                                                            </div>
                                                        )}

                                                        {insight.sceneReferences && insight.sceneReferences.length > 0 && (
                                                            <div className="flex flex-wrap gap-2 pt-2">
                                                                {insight.sceneReferences.map((ref, idx) => (
                                                                    <Badge key={idx} variant="outline" className="text-[10px] bg-background">
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

                    <TabsContent value="metadata" className="flex-1 min-h-0 mt-0 bg-muted/5">
                        <ScrollArea className="h-full">
                            <div className="p-8 max-w-3xl mx-auto">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg font-heading">Analysis Metadata</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="grid grid-cols-2 gap-6 text-sm">
                                            <div className="space-y-1.5">
                                                <span className="text-muted-foreground text-xs uppercase tracking-wide block">Word Count</span>
                                                <span className="font-medium text-lg">{analysis.wordCountAtAnalysis.toLocaleString()}</span>
                                            </div>
                                            <div className="space-y-1.5">
                                                <span className="text-muted-foreground text-xs uppercase tracking-wide block">Scenes Analyzed</span>
                                                <span className="font-medium text-lg">{analysis.scenesAnalyzedCount}</span>
                                            </div>
                                            <div className="space-y-1.5">
                                                <span className="text-muted-foreground text-xs uppercase tracking-wide block">AI Model</span>
                                                <span className="font-medium text-lg">{analysis.model}</span>
                                            </div>
                                            <div className="space-y-1.5">
                                                <span className="text-muted-foreground text-xs uppercase tracking-wide block">Tokens Used</span>
                                                <span className="font-medium text-lg">{analysis.tokensUsed?.toLocaleString() || 'Unknown'}</span>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t">
                                            <h4 className="text-sm font-medium mb-3">Raw Data</h4>
                                            <pre className="text-xs bg-muted/50 p-4 rounded-lg overflow-auto max-h-60 font-mono border border-border/50">
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
    if (!data) return <div className="text-muted-foreground text-center py-8">No detailed data available.</div>;

    // Synopsis Analysis
    if (analysis.analysisType === 'synopsis') {
        return (
            <div className="space-y-8">
                {data.plotPoints && Array.isArray(data.plotPoints) && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-heading font-semibold flex items-center gap-2">
                            <Activity className="h-5 w-5 text-primary" />
                            Key Plot Points
                        </h3>
                        <div className="grid gap-4">
                            {data.plotPoints.map((point: string, idx: number) => (
                                <Card key={idx} className="border-border/50 shadow-sm">
                                    <CardContent className="p-5 flex gap-4">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                                            {idx + 1}
                                        </div>
                                        <p className="text-base leading-relaxed pt-1">{point}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {data.themes && Array.isArray(data.themes) && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-heading font-semibold flex items-center gap-2">
                            <Layers className="h-5 w-5 text-primary" />
                            Identified Themes
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {data.themes.map((theme: string, idx: number) => (
                                <Badge key={idx} variant="secondary" className="px-4 py-1.5 text-sm rounded-full bg-secondary/50 border border-border/50">
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
                    <Card key={idx} className="overflow-hidden border-border/50 shadow-sm">
                        <div className="h-1 bg-gradient-to-r from-primary/50 to-secondary/50" />
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg font-heading flex items-center justify-between">
                                {thread.name}
                                <Badge variant={thread.status === 'resolved' ? 'default' : 'outline'} className="uppercase text-[10px] tracking-wider">
                                    {thread.status}
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <p className="text-muted-foreground leading-relaxed">{thread.description}</p>
                            {thread.development && (
                                <div className="space-y-3 bg-muted/30 p-4 rounded-xl">
                                    <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Development Arc</h4>
                                    <div className="pl-4 border-l-2 border-primary/20 space-y-4">
                                        {thread.development.map((dev: any, i: number) => (
                                            <div key={i} className="relative">
                                                <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background" />
                                                <span className="font-medium text-xs text-primary block mb-1">
                                                    Scene {dev.sceneIndex + 1}
                                                </span>
                                                <p className="text-sm">{dev.note}</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {data.characters.map((char: any, idx: number) => (
                    <Card key={idx} className="border-border/50 shadow-sm hover:shadow-md transition-all">
                        <CardHeader className="pb-3 bg-muted/20 border-b border-border/50">
                            <CardTitle className="text-lg font-heading flex items-center justify-between">
                                {char.name}
                                <Badge variant="secondary" className="bg-background">{char.role || 'Character'}</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="bg-muted/30 p-3 rounded-lg">
                                    <span className="text-muted-foreground block text-xs uppercase tracking-wide mb-1">Arc Status</span>
                                    <span className="font-medium capitalize">{char.arcStatus}</span>
                                </div>
                                <div className="bg-muted/30 p-3 rounded-lg">
                                    <span className="text-muted-foreground block text-xs uppercase tracking-wide mb-1">Confidence</span>
                                    <span className="font-medium">{char.confidence || 'N/A'}</span>
                                </div>
                            </div>
                            <div>
                                <span className="text-muted-foreground block text-xs uppercase tracking-wide mb-2">Arc Description</span>
                                <p className="text-sm leading-relaxed">{char.arcDescription}</p>
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
