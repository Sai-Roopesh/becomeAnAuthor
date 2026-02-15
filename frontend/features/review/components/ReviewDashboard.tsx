"use client";

import { useState } from "react";
import { useLiveQuery } from "@/hooks/use-live-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PlayCircle,
  Clock,
  FileText,
  Sparkles,
  BarChart3,
  Layers,
  ChevronRight,
  Users,
} from "lucide-react";
import { VersionWarning } from "./VersionWarning";
import { AnalysisRunDialog } from "./AnalysisRunDialog";
import { AnalysisDetailDialog } from "./AnalysisDetailDialog";
import { useManuscriptVersion } from "../hooks/use-manuscript-version";
import { useAnalysisRepository } from "../hooks/use-analysis-repository";
import type { StoryAnalysis } from "@/domain/entities/types";
import { ViewHeader } from "@/components/layout/view-header";
import { DecorativeGrid } from "@/components/ui/decorative-grid";

interface ReviewDashboardProps {
  projectId: string;
  /** Render prop for AI model selector - receives value and onChange for state management */
  renderModelSelector: (props: {
    value: string;
    onValueChange: (value: string) => void;
  }) => React.ReactNode;
}

export function ReviewDashboard({
  projectId,
  renderModelSelector,
}: ReviewDashboardProps) {
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] =
    useState<StoryAnalysis | null>(null);

  const analysisRepo = useAnalysisRepository();

  // Fetch all analyses for this project using repository hook
  const analyses = useLiveQuery(
    () => analysisRepo.getAll(projectId),
    [projectId, analysisRepo],
  );

  const latestAnalysis = analyses?.[0];
  const editsSinceAnalysis = useManuscriptVersion(latestAnalysis);

  return (
    <div className="h-full flex flex-col bg-background/95 backdrop-blur-sm relative">
      {/* Subtle background texture */}
      <DecorativeGrid />

      {/* Header - Using ViewHeader for consistency */}
      <ViewHeader
        title="Story Analysis"
        icon={<Sparkles className="h-5 w-5" />}
        subtitle="AI-powered developmental feedback for your manuscript"
        actions={
          <Button
            onClick={() => setRunDialogOpen(true)}
            size="lg"
            className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
          >
            <PlayCircle className="w-4 h-4 mr-2" />
            Run Analysis
          </Button>
        }
      />

      {/* Version Warning */}
      {editsSinceAnalysis > 0 && latestAnalysis && (
        <div className="px-6 pt-6">
          <VersionWarning
            lastAnalyzed={latestAnalysis.createdAt}
            scenesEdited={editsSinceAnalysis}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {!analyses || analyses.length === 0 ? (
          <EmptyState onRunAnalysis={() => setRunDialogOpen(true)} />
        ) : (
          <AnalysisOverview
            analyses={analyses}
            onSelectAnalysis={setSelectedAnalysis}
          />
        )}
      </div>

      {/* Run Analysis Dialog */}
      <AnalysisRunDialog
        projectId={projectId}
        open={runDialogOpen}
        onClose={() => setRunDialogOpen(false)}
        renderModelSelector={renderModelSelector}
      />

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
    <div className="flex flex-col items-center justify-center h-full space-y-6 text-center animate-in fade-in zoom-in duration-500">
      <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center relative group">
        <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
        <Sparkles className="w-12 h-12 text-primary relative z-10" />
      </div>
      <div className="space-y-2 max-w-md">
        <h2 className="text-2xl font-heading font-bold">No Analyses Yet</h2>
        <p className="text-muted-foreground">
          Run your first story analysis to get AI-powered insights on plot
          threads, character arcs, timeline consistency, and more.
        </p>
      </div>
      <Button onClick={onRunAnalysis} size="lg" className="rounded-full px-8">
        <PlayCircle className="w-4 h-4 mr-2" />
        Run Your First Analysis
      </Button>
    </div>
  );
}

function AnalysisOverview({
  analyses,
  onSelectAnalysis,
}: {
  analyses: StoryAnalysis[];
  onSelectAnalysis: (analysis: StoryAnalysis) => void;
}) {
  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card border-border/50 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Total Analyses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-heading">
              {analyses.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Completed analyses
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Latest Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-heading">
              {analyses[0] &&
                new Date(analyses[0].createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analyses[0]?.scenesAnalyzedCount} scenes analyzed
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analysis Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-heading">
              {new Set(analyses.map((a) => a.analysisType)).size}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Different types run
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Analyses */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-heading font-semibold flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Recent Analyses
          </h2>
        </div>

        <div className="space-y-3">
          {analyses.slice(0, 5).map((analysis, index) => (
            <div
              key={analysis.id}
              className="group flex flex-col gap-3 p-4 bg-card/50 hover:bg-card border border-border/50 hover:border-primary/20 rounded-xl cursor-pointer transition-all shadow-sm hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
              onClick={() => onSelectAnalysis(analysis)}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  {getAnalysisIcon(analysis.analysisType)}
                </div>
                <div>
                  <div className="font-medium capitalize text-foreground group-hover:text-primary transition-colors">
                    {analysis.analysisType.replace("-", " ")}
                  </div>
                  <div className="text-sm text-muted-foreground line-clamp-1 max-w-md">
                    {analysis.results.summary ||
                      `${analysis.results.insights.length} insights found`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-xs font-medium text-foreground">
                    {new Date(analysis.createdAt).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(analysis.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getAnalysisIcon(type: string) {
  switch (type) {
    case "synopsis":
      return <FileText className="h-5 w-5" />;
    case "plot-threads":
      return <Layers className="h-5 w-5" />;
    case "character-arcs":
      return <Users className="h-5 w-5" />;
    default:
      return <Sparkles className="h-5 w-5" />;
  }
}
