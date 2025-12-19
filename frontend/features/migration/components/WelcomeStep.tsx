import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, ArrowRight, BookOpen, Layers, Sparkles } from 'lucide-react';

interface WelcomeStepProps {
    onNext: () => void;
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
    return (
        <div className="space-y-6">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">Welcome to Series-First Mode!</h2>
                <p className="text-muted-foreground">
                    We're upgrading your writing environment with powerful new capabilities.
                </p>
            </div>

            <div className="grid gap-4 py-4">
                <FeatureItem
                    icon={<Layers className="w-5 h-5 text-blue-500" />}
                    title="Series Organization"
                    description="Group related novels together automatically."
                />
                <FeatureItem
                    icon={<BookOpen className="w-5 h-5 text-green-500" />}
                    title="Shared Codex"
                    description="Characters and lore are now shared across all books in a series."
                />
                <FeatureItem
                    icon={<Sparkles className="w-5 h-5 text-purple-500" />}
                    title="Character Arcs"
                    description="Track how your characters evolve throughout their journey."
                />
            </div>

            <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground border">
                <p className="font-medium text-foreground mb-1">What this migration does:</p>
                <ul className="list-disc list-inside space-y-1">
                    <li>Creates a "Standalone Works" series for single novels</li>
                    <li>Moves existing projects into the new structure</li>
                    <li>Migrates codex entries to series-level storage</li>
                </ul>
            </div>

            <Button onClick={onNext} className="w-full" size="lg">
                Get Started <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
        </div>
    );
}

function FeatureItem({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
    return (
        <div className="flex items-start gap-3 p-3 rounded-lg border bg-card/50">
            <div className="mt-0.5">{icon}</div>
            <div>
                <h3 className="font-medium leading-none mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
        </div>
    );
}
