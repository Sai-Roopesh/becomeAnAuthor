'use client';

import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ReviewPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-8">
            <div className="max-w-md text-center space-y-6">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Sparkles className="h-10 w-10 text-primary" />
                </div>
                <h1 className="text-2xl font-heading font-bold">Story Analysis</h1>
                <p className="text-muted-foreground">
                    To run story analysis, please open a project first. Analysis is available
                    in the Review tab within any project.
                </p>
                <Link href="/">
                    <Button variant="outline" className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Go to Projects
                    </Button>
                </Link>
            </div>
        </div>
    );
}

