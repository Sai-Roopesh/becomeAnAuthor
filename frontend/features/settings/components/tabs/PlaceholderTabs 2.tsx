'use client';

import { Share2, Lock, CreditCard } from 'lucide-react';

/**
 * Placeholder Tabs
 * 
 * Simple placeholder tabs for features not yet implemented.
 */

export function SharedTab() {
    return (
        <div className="flex flex-col items-center justify-center flex-1 p-6 bg-background min-h-0">
            <Share2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Shared with me</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
                Projects shared with you by other writers will appear here.
            </p>
        </div>
    );
}

export function AccountTab() {
    return (
        <div className="flex flex-col items-center justify-center flex-1 p-6 bg-background min-h-0">
            <Lock className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Account & Security</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
                Manage your account settings, password, and security preferences.
            </p>
        </div>
    );
}

export function SubscriptionTab() {
    return (
        <div className="flex flex-col items-center justify-center flex-1 p-6 bg-background min-h-0">
            <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Manage Subscription</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
                View and manage your subscription plan, billing, and payment methods.
            </p>
        </div>
    );
}
