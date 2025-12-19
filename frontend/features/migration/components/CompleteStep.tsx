import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Rocket } from 'lucide-react';
import { MigrationResult } from '../hooks/use-migration';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CompleteStepProps {
    result: MigrationResult | null;
    onClose: () => void;
}

export function CompleteStep({ result, onClose }: CompleteStepProps) {
    return (
        <div className="space-y-6 pt-4">
            <div className="text-center space-y-4">
                <div className="flex justify-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-green-700">Migration Complete!</h2>
                    <p className="text-muted-foreground">
                        Your library has been successfully upgraded.
                    </p>
                </div>
            </div>

            <div className="bg-muted/30 border rounded-lg p-6">
                <h3 className="font-semibold mb-3">Summary</h3>
                <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                    <Stat label="Total Projects" value={result?.totalProjects || 0} />
                    <Stat label="Migrated Entries" value={result?.migratedEntries || 0} />
                    <Stat label="Duplicates Skipped" value={result?.skippedEntries || 0} />
                    <Stat label="Series Updated" value={result?.seriesAffected?.length || 0} />
                </div>
            </div>

            {(result?.errors && result.errors.length > 0) && (
                <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-800 mb-2">Warnings</h4>
                    <ScrollArea className="h-20">
                        <ul className="text-sm text-yellow-700 space-y-1">
                            {result.errors.map((err, i) => <li key={i}>• {err}</li>)}
                        </ul>
                    </ScrollArea>
                </div>
            )}

            <div className="space-y-4">
                <p className="text-sm text-center text-muted-foreground">
                    You're all set to use Features like Series Analysis and Character Arcs!
                </p>
                <Button onClick={onClose} className="w-full" size="lg">
                    Start Writing <Rocket className="ml-2 w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}

function Stat({ label, value }: { label: string, value: number }) {
    return (
        <div>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-sm text-muted-foreground">{label}</div>
        </div>
    );
}
