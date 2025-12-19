import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useMigration } from '../hooks/use-migration';
import { WelcomeStep } from './WelcomeStep';
import { PreviewStep } from './PreviewStep';
import { ProgressStep } from './ProgressStep';
import { CompleteStep } from './CompleteStep';

interface MigrationWizardProps {
    isOpen: boolean;
    onClose: () => void;
}

export function MigrationWizard({ isOpen, onClose }: MigrationWizardProps) {
    const { step, setStep, progress, status, result, error, runMigration } = useMigration();

    // Prevent closing during migration
    const handleOpenChange = (open: boolean) => {
        if (status === 'running' && !open) return;
        if (!open) onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[600px] gap-0">
                <div className="p-6">
                    {step === 1 && <WelcomeStep onNext={() => setStep(2)} />}
                    {step === 2 && <PreviewStep onNext={runMigration} onBack={() => setStep(1)} />}
                    {step === 3 && <ProgressStep progress={progress} status={status} error={error} />}
                    {step === 4 && <CompleteStep result={result} onClose={onClose} />}
                </div>
            </DialogContent>
        </Dialog>
    );
}
