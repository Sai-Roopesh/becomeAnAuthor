'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useAnalysisRunner } from '../hooks/use-analysis-runner';
import { ManuscriptTreeSelector } from './ManuscriptTreeSelector';
import { ModelCombobox } from '@/features/ai/components/model-combobox';

interface AnalysisRunDialogProps {
    projectId: string;
    open: boolean;
    onClose: () => void;
}

export function AnalysisRunDialog({ projectId, open, onClose }: AnalysisRunDialogProps) {
    const { runAnalysis, isRunning } = useAnalysisRunner();

    const [scope, setScope] = useState<'full' | 'custom'>('full');
    const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
    const [selectedModel, setSelectedModel] = useState<string>('');
    const [analysisTypes, setAnalysisTypes] = useState({
        synopsis: true,
        'plot-threads': false,
        'character-arcs': false,
        timeline: false,
        contradictions: false,
        foreshadowing: false,
        pacing: false,
        'genre-fit': false,
    });

    const enabledTypes = Object.entries(analysisTypes)
        .filter(([_, enabled]) => enabled)
        .map(([type]) => type);

    const estimatedTokens = enabledTypes.length * 10000; // Rough estimate

    const handleRunAnalysis = async () => {
        if (!selectedModel) {
            return; // Early return if no model selected
        }

        try {
            await runAnalysis(
                projectId,
                scope === 'full' ? [] : selectedNodes,
                enabledTypes,
                selectedModel
            );
            onClose();
        } catch (error) {
            // Error is already toasted by the hook
        }
    };

    const toggleAnalysisType = (type: keyof typeof analysisTypes) => {
        setAnalysisTypes(prev => ({ ...prev, [type]: !prev[type] }));
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Run Story Analysis</DialogTitle>
                    <DialogDescription>
                        Select the scope and types of analysis to run on your manuscript
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Scope Selection */}
                    <div className="space-y-3">
                        <Label>Analysis Scope</Label>
                        <RadioGroup value={scope} onValueChange={(v) => setScope(v as 'full' | 'custom')}>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="full" id="full" />
                                <Label htmlFor="full" className="font-normal cursor-pointer">
                                    Full Manuscript
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="custom" id="custom" />
                                <Label htmlFor="custom" className="font-normal cursor-pointer">
                                    Selected Acts/Chapters/Scenes
                                </Label>
                            </div>
                        </RadioGroup>

                        {scope === 'custom' && (
                            <ManuscriptTreeSelector
                                projectId={projectId}
                                selected={selectedNodes}
                                onSelect={setSelectedNodes}
                            />
                        )}
                    </div>

                    {/* Model Selection - Using existing ModelCombobox */}
                    <div className="space-y-2">
                        <Label>AI Model</Label>
                        <ModelCombobox
                            value={selectedModel}
                            onValueChange={setSelectedModel}
                        />
                    </div>
                </div>

                {/* Analysis Types */}
                <div className="space-y-3">
                    <Label>Analysis Types</Label>
                    <div className="grid grid-cols-2 gap-3">
                        <AnalysisTypeCheckbox
                            id="synopsis"
                            label="Synopsis Generation"
                            checked={analysisTypes.synopsis}
                            onCheckedChange={() => toggleAnalysisType('synopsis')}
                        />
                        <AnalysisTypeCheckbox
                            id="plot-threads"
                            label="Plot Thread Tracking"
                            checked={analysisTypes['plot-threads']}
                            onCheckedChange={() => toggleAnalysisType('plot-threads')}
                        />
                        <AnalysisTypeCheckbox
                            id="character-arcs"
                            label="Character Arc Analysis"
                            checked={analysisTypes['character-arcs']}
                            onCheckedChange={() => toggleAnalysisType('character-arcs')}
                        />
                        <AnalysisTypeCheckbox
                            id="timeline"
                            label="Timeline Analysis"
                            checked={analysisTypes.timeline}
                            onCheckedChange={() => toggleAnalysisType('timeline')}
                        />
                        <AnalysisTypeCheckbox
                            id="contradictions"
                            label="Contradiction Detection"
                            badge="Coming Soon"
                            checked={analysisTypes.contradictions}
                            onCheckedChange={() => toggleAnalysisType('contradictions')}
                            disabled
                        />
                        <AnalysisTypeCheckbox
                            id="foreshadowing"
                            label="Foreshadowing Tracker"
                            badge="Coming Soon"
                            checked={analysisTypes.foreshadowing}
                            onCheckedChange={() => toggleAnalysisType('foreshadowing')}
                            disabled
                        />
                    </div>
                </div>

                {/* Token Warning */}
                <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        <strong>Estimated tokens: ~{estimatedTokens.toLocaleString()}</strong>
                        <br />
                        This will use your AI quota. Make sure you have an AI connection configured in settings.
                    </AlertDescription>
                </Alert>
            </DialogContent>

            <DialogFooter>
                <Button variant="outline" onClick={onClose} disabled={isRunning}>
                    Cancel
                </Button>
                <Button onClick={handleRunAnalysis} disabled={isRunning || enabledTypes.length === 0 || !selectedModel}>
                    {isRunning && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {isRunning ? 'Running Analysis...' : 'Run Analysis'}
                </Button>
            </DialogFooter>
        </Dialog>
    );
}

interface AnalysisTypeCheckboxProps {
    id: string;
    label: string;
    badge?: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
}

function AnalysisTypeCheckbox({ id, label, badge, checked, onCheckedChange, disabled }: AnalysisTypeCheckboxProps) {
    return (
        <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
            <Checkbox id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
            <div className="flex-1">
                <Label htmlFor={id} className={`font-normal cursor-pointer ${disabled ? 'text-muted-foreground' : ''}`}>
                    {label}
                </Label>
                {badge && (
                    <span className="ml-2 text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                        {badge}
                    </span>
                )}
            </div>
        </div>
    );
}
