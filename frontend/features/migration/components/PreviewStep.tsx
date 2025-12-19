import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { invoke } from '@tauri-apps/api/core';
import { Loader2, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

interface PreviewStepProps {
    onNext: () => void;
    onBack: () => void;
}

export function PreviewStep({ onNext, onBack }: PreviewStepProps) {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ projects: 0, codexEntries: 0 });

    useEffect(() => {
        async function loadStats() {
            try {
                const projects = await invoke<any[]>('list_projects');
                let entryCount = 0;

                // Parallelize fetching if possible, or just loop
                for (const p of projects) {
                    try {
                        // Assuming we can list entries by path still (backward compat) or we iterate known dirs
                        // For now, let's just count projects to avoid breaking if list_codex is strict about series
                        const entries = await invoke<any[]>('list_codex_entries', { seriesId: p.series_id || "standalone-works" }).catch(() => []);
                        entryCount += entries.length;
                    } catch (e) {
                        // Check if old command signature works
                        try {
                            const entries = await invoke<any[]>('list_codex_entries', { projectPath: p.path }).catch(() => []);
                            entryCount += entries.length;
                        } catch { /* ignore */ }
                    }
                }

                setStats({
                    projects: projects.length,
                    codexEntries: entryCount // This might be approximate if migration hasn't run
                });
            } catch (e) {
                console.error("Failed to load stats", e);
            } finally {
                setLoading(false);
            }
        }
        loadStats();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-8 space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Analyzing your library...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h2 className="text-2xl font-bold">Migration Preview</h2>
                <p className="text-muted-foreground">
                    Here is what we found in your library.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <StatCard label="Novels" value={stats.projects} />
                <StatCard label="Codex Entries" value={stats.codexEntries} />
            </div>

            <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
                <h3 className="font-medium">The Plan</h3>
                <ul className="space-y-3 text-sm">
                    <PlanItem
                        text="Create 'Standalone Works' series"
                        subtext="Container for your single novels"
                    />
                    <PlanItem
                        text={`Move ${stats.projects} novels to series structure`}
                        subtext="File organization update"
                    />
                    <PlanItem
                        text="Consolidate codex entries"
                        subtext="Merge duplicates and enable sharing"
                    />
                </ul>
            </div>

            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Safety First</AlertTitle>
                <AlertDescription>
                    Your existing files will be backed up before any changes are made.
                </AlertDescription>
            </Alert>

            <div className="flex gap-4 pt-2">
                <Button variant="outline" onClick={onBack} className="flex-1">
                    <ArrowLeft className="mr-2 w-4 h-4" /> Back
                </Button>
                <Button onClick={onNext} className="flex-1">
                    Start Migration <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}

function StatCard({ label, value }: { label: string, value: number }) {
    return (
        <div className="bg-card p-4 rounded-lg border text-center">
            <div className="text-3xl font-bold text-primary">{value}</div>
            <div className="text-sm text-muted-foreground">{label}</div>
        </div>
    );
}

function PlanItem({ text, subtext }: { text: string, subtext: string }) {
    return (
        <li className="flex gap-3">
            <div className="flex flex-col items-center">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                <div className="w-0.5 h-full bg-border -mb-4 last:hidden" />
            </div>
            <div>
                <div className="font-medium">{text}</div>
                <div className="text-xs text-muted-foreground">{subtext}</div>
            </div>
        </li>
    );
}
