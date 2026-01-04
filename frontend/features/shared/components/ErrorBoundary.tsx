'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from '@/shared/utils/toast-service';
import { logger } from '@/shared/utils/logger';

const log = logger.scope('ErrorBoundary');

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public override state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        log.error('Uncaught error:', error, errorInfo);
        toast.error('Something went wrong', {
            description: error.message,
        });
    }

    private handleRetry = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    public override render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center border rounded-lg bg-muted/30">
                    <div className="bg-destructive/10 p-4 rounded-full mb-4">
                        <AlertTriangle className="h-8 w-8 text-destructive" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
                    <p className="text-muted-foreground mb-6 max-w-md">
                        {this.state.error?.message || 'An unexpected error occurred while rendering this component.'}
                    </p>
                    <Button onClick={this.handleRetry} variant="outline" className="gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Reload Application
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}
