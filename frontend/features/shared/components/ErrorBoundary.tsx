"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "@/shared/utils/toast-service";
import { logger } from "@/shared/utils/logger";

const log = logger.scope("ErrorBoundary");

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
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

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { name, onError } = this.props;

    log.error(`Error in ${name || "component"}:`, error, errorInfo);
    onError?.(error, errorInfo);

    toast.error("Component failed to load", {
      description: "Please try refreshing the page.",
    });
  }

  private handleManualRetry = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public override render() {
    const { hasError, error } = this.state;
    const { children, fallback, name } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center border rounded-lg bg-muted/30">
          <div className="bg-destructive/10 p-4 rounded-full mb-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {name ? `${name} failed to load` : "Something went wrong"}
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            {error?.message || "An unexpected error occurred."}
          </p>
          <div className="flex gap-3">
            <Button
              onClick={this.handleManualRetry}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
            <Button
              onClick={this.handleReload}
              variant="default"
              className="gap-2"
            >
              Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return children;
  }
}

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<Props, "children">,
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...options}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}
