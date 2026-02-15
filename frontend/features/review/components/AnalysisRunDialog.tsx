"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertTriangle,
  Loader2,
  FileText,
  Layers,
  Users,
  Clock,
  AlertCircle,
} from "lucide-react";
import { useAnalysisRunner } from "../hooks/use-analysis-runner";
import { ManuscriptTreeSelector } from "./ManuscriptTreeSelector";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { getEnabledConnections } from "@/lib/ai";

interface AnalysisRunDialogProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
  /** Render prop for AI model selector - receives value and onChange for state management */
  renderModelSelector: (props: {
    value: string;
    onValueChange: (value: string) => void;
  }) => React.ReactNode;
}

export function AnalysisRunDialog({
  projectId,
  open,
  onClose,
  renderModelSelector,
}: AnalysisRunDialogProps) {
  const { runAnalysis, estimateTokens, isRunning, progress, phase } =
    useAnalysisRunner();

  const [scope, setScope] = useState<"full" | "custom">("full");
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [estimatedTokens, setEstimatedTokens] = useState<number>(0);
  const [isEstimating, setIsEstimating] = useState(false);
  const [analysisTypes, setAnalysisTypes] = useState({
    synopsis: true,
    "plot-threads": false,
    "character-arcs": false,
    timeline: false,
    contradictions: false,
  });

  const enabledTypes = Object.entries(analysisTypes)
    .filter(([, enabled]) => enabled)
    .map(([type]) => type);
  const hasAIConnection = getEnabledConnections().length > 0;

  useEffect(() => {
    if (!open) return;
    if (enabledTypes.length === 0) {
      setEstimatedTokens(0);
      return;
    }

    let cancelled = false;
    const selectedScope = scope === "full" ? [] : selectedNodes;

    const runEstimate = async () => {
      try {
        setIsEstimating(true);
        const estimate = await estimateTokens(selectedScope, enabledTypes);
        if (!cancelled) setEstimatedTokens(estimate);
      } catch {
        if (!cancelled) setEstimatedTokens(0);
      } finally {
        if (!cancelled) setIsEstimating(false);
      }
    };

    runEstimate();
    return () => {
      cancelled = true;
    };
  }, [open, scope, selectedNodes, enabledTypes, estimateTokens]);

  const handleRunAnalysis = async () => {
    if (!selectedModel) {
      return; // Early return if no model selected
    }

    try {
      await runAnalysis(
        projectId,
        scope === "full" ? [] : selectedNodes,
        enabledTypes,
        selectedModel,
      );
      onClose();
    } catch {
      // Error is already toasted by the hook
    }
  };

  const toggleAnalysisType = (type: keyof typeof analysisTypes) => {
    setAnalysisTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[85dvh] flex flex-col overflow-hidden bg-background/95 backdrop-blur-xl border-border/50">
        <DialogHeader>
          <DialogTitle className="text-2xl font-heading font-bold">
            Run Story Analysis
          </DialogTitle>
          <DialogDescription>
            Select the scope and types of analysis to run on your manuscript
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8 py-4">
          {/* Scope Selection */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Analysis Scope</Label>
            <RadioGroup
              value={scope}
              onValueChange={(v) => setScope(v as "full" | "custom")}
              className="grid grid-cols-2 gap-4"
            >
              <div
                className={cn(
                  "flex items-center space-x-3 p-4 rounded-xl border transition-all cursor-pointer",
                  scope === "full"
                    ? "bg-primary/10 border-primary"
                    : "hover:bg-muted/50 border-border",
                )}
              >
                <RadioGroupItem value="full" id="full" />
                <Label htmlFor="full" className="font-medium cursor-pointer">
                  Full Manuscript
                </Label>
              </div>
              <div
                className={cn(
                  "flex items-center space-x-3 p-4 rounded-xl border transition-all cursor-pointer",
                  scope === "custom"
                    ? "bg-primary/10 border-primary"
                    : "hover:bg-muted/50 border-border",
                )}
              >
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom" className="font-medium cursor-pointer">
                  Selected Scenes
                </Label>
              </div>
            </RadioGroup>

            {scope === "custom" && (
              <div className="mt-4 p-4 border rounded-xl bg-muted/30">
                <ManuscriptTreeSelector
                  projectId={projectId}
                  selected={selectedNodes}
                  onSelect={setSelectedNodes}
                />
              </div>
            )}
          </div>

          {/* Model Selection */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">AI Model</Label>
            {renderModelSelector({
              value: selectedModel,
              onValueChange: setSelectedModel,
            })}
          </div>

          {/* Analysis Types */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Analysis Types</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <AnalysisTypeCheckbox
                id="synopsis"
                label="Synopsis Generation"
                icon={<FileText className="h-4 w-4" />}
                checked={analysisTypes.synopsis}
                onCheckedChange={() => toggleAnalysisType("synopsis")}
              />
              <AnalysisTypeCheckbox
                id="plot-threads"
                label="Plot Thread Tracking"
                icon={<Layers className="h-4 w-4" />}
                checked={analysisTypes["plot-threads"]}
                onCheckedChange={() => toggleAnalysisType("plot-threads")}
              />
              <AnalysisTypeCheckbox
                id="character-arcs"
                label="Character Arc Analysis"
                icon={<Users className="h-4 w-4" />}
                checked={analysisTypes["character-arcs"]}
                onCheckedChange={() => toggleAnalysisType("character-arcs")}
              />
              <AnalysisTypeCheckbox
                id="timeline"
                label="Timeline Analysis"
                icon={<Clock className="h-4 w-4" />}
                checked={analysisTypes.timeline}
                onCheckedChange={() => toggleAnalysisType("timeline")}
              />
              <AnalysisTypeCheckbox
                id="contradictions"
                label="Contradiction Detection"
                icon={<AlertCircle className="h-4 w-4" />}
                checked={analysisTypes.contradictions}
                onCheckedChange={() => toggleAnalysisType("contradictions")}
              />
            </div>
          </div>

          {!hasAIConnection && (
            <Alert className="bg-destructive/5 border-destructive/20">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive/80">
                No AI connection is configured. Add one in Settings before
                running analysis.
              </AlertDescription>
            </Alert>
          )}

          {/* Token Warning */}
          <Alert className="bg-primary/5 border-primary/20">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <AlertDescription className="text-primary/80">
              <strong>
                Estimated tokens:{" "}
                {isEstimating
                  ? "Calculating..."
                  : `~${estimatedTokens.toLocaleString()}`}
              </strong>
              <br />
              Estimate is based on selected scope and analysis types.
            </AlertDescription>
          </Alert>

          {isRunning && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{phase}</span>
                <span className="text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose} disabled={isRunning}>
            Cancel
          </Button>
          <Button
            onClick={handleRunAnalysis}
            disabled={
              isRunning ||
              enabledTypes.length === 0 ||
              !selectedModel ||
              !hasAIConnection
            }
            className="min-w-btn"
          >
            {isRunning && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isRunning ? "Running..." : "Run Analysis"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface AnalysisTypeCheckboxProps {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

function AnalysisTypeCheckbox({
  id,
  label,
  icon,
  badge,
  checked,
  onCheckedChange,
  disabled,
}: AnalysisTypeCheckboxProps) {
  return (
    <div
      className={cn(
        "flex items-center space-x-3 p-3 border rounded-xl transition-all cursor-pointer",
        checked
          ? "bg-primary/5 border-primary shadow-sm"
          : "hover:bg-muted/50 border-border",
        disabled && "opacity-60 cursor-not-allowed hover:bg-transparent",
      )}
      onClick={() => !disabled && onCheckedChange(!checked)}
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
      />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          {icon && (
            <span
              className={cn("text-muted-foreground", checked && "text-primary")}
            >
              {icon}
            </span>
          )}
          <Label
            htmlFor={id}
            className={cn(
              "font-medium cursor-pointer",
              disabled && "cursor-not-allowed",
            )}
          >
            {label}
          </Label>
        </div>
        {badge && (
          <span className="mt-1 inline-block text-2xs px-1.5 py-0.5 bg-muted rounded-full text-muted-foreground font-medium">
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}
