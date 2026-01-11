"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "@/shared/utils/toast-service";
import { logger } from "@/shared/utils/logger";

const log = logger.scope("ErrorBoundary");

interface Props {
  children: ReactNode;
  /** Custom fallback UI */
  fallback?: ReactNode;
  /** Maximum number of auto-retry attempts (default: 3) */
  maxRetries?: number;
  /** Delay between retries in ms (default: 1000, with exponential backoff) */
  retryDelay?: number;
  /** Name of the component being wrapped (for logging) */
  name?: string;
  /** Callback when error occurs */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
  isRetrying: boolean;
}

/**
 * ErrorBoundary with Auto-Retry
 *
 * Catches errors in child components and automatically retries
 * up to maxRetries times before showing a fallback UI.
 *
 * @example
 * <ErrorBoundary name="Editor" maxRetries={3}>
 *   <EditorContainer />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  static defaultProps = {
    maxRetries: 3,
    retryDelay: 1000,
  };

  public override state: State = {
    hasError: false,
    error: null,
    retryCount: 0,
    isRetrying: false,
  };

  private retryTimeout: NodeJS.Timeout | null = null;

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { name, onError, maxRetries = 3, retryDelay = 1000 } = this.props;
    const { retryCount } = this.state;

    log.error(`Error in ${name || "component"}:`, error, errorInfo);
    onError?.(error, errorInfo);

    // Auto-retry with exponential backoff
    if (retryCount < maxRetries) {
      const delay = retryDelay * Math.pow(2, retryCount);
      log.info(
        `Auto-retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`,
      );

      this.setState({ isRetrying: true });

      this.retryTimeout = setTimeout(() => {
        this.setState((prev) => ({
          hasError: false,
          error: null,
          retryCount: prev.retryCount + 1,
          isRetrying: false,
        }));
      }, delay);
    } else {
      // Max retries exceeded, show error UI
      toast.error("Component failed to load", {
        description: "Please try refreshing the page.",
      });
    }
  }

  public override componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  private handleManualRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      retryCount: 0,
      isRetrying: false,
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public override render() {
    const { hasError, error, retryCount, isRetrying } = this.state;
    const { children, fallback, maxRetries = 3, name } = this.props;

    // Show retrying state
    if (isRetrying) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">
            Retrying... (attempt {retryCount + 1}/{maxRetries})
          </p>
        </div>
      );
    }

    // Show error state only after all retries exhausted
    if (hasError && retryCount >= maxRetries) {
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

/**
 * Hook-based error boundary for functional components
 */
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
