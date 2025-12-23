import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface MigrationResult {
    totalProjects: number;
    migratedEntries: number;
    skippedEntries: number;
    seriesAffected: string[];
    errors: string[];
}

export function useMigration() {
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState<'idle' | 'running' | 'complete' | 'error'>('idle');
    const [result, setResult] = useState<MigrationResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const runMigration = async () => {
        setStatus('running');
        setError(null);
        setStep(3);

        try {
            // Step 1: Progress indicator (25%)
            setProgress(25);

            // Step 2: Reserved for future project migration (50%)
            setProgress(50);

            // Step 3: Migrate codex entries to series (75%)
            setProgress(75);
            const codexResult = await invoke<MigrationResult>('migrate_codex_to_series');

            // Step 4: Complete (100%)
            setProgress(100);
            setResult(codexResult);
            setStatus('complete');
            setTimeout(() => setStep(4), 500); // Small delay for UX
        } catch (err: unknown) {
            console.error('Migration failed:', err);
            setStatus('error');
            setError(err instanceof Error ? err.message : String(err));
        }
    };

    return { step, setStep, progress, status, result, error, runMigration };
}
