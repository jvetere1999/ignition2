'use client';

import React, { ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
}

/**
 * Error Boundary Component
 *
 * Catches React component errors and displays graceful fallback UI.
 * Provides recovery options: reset, home navigation, or detailed error info.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 *
 * With custom fallback:
 * ```tsx
 * <ErrorBoundary fallback={(error, reset) => (
 *   <div>Custom error UI with {error.message}</div>
 * )}>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for monitoring/debugging
    console.error('Error caught by boundary:', {
      error: error.toString(),
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });

    // Could send to error tracking service here
    // e.g., Sentry.captureException(error);

    // Update error count to prevent infinite loops
    this.setState((prevState) => ({
      errorCount: prevState.errorCount + 1,
    }));
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  handleHomeNavigation = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      // Prevent infinite error loops - show static error after 3 consecutive errors
      if (this.state.errorCount > 3) {
        return (
          <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
                <h1 className="text-2xl font-bold text-red-900">Critical Error</h1>
              </div>
              <p className="text-gray-700 mb-4">
                The application encountered repeated errors and needs to restart. Please refresh the page or contact support if the problem persists.
              </p>
              <div className="bg-red-100 border border-red-300 rounded p-3 mb-6">
                <p className="text-sm font-mono text-red-900 break-words">
                  {this.state.error.message}
                </p>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded transition-colors"
              >
                Refresh Page
              </button>
            </div>
          </div>
        );
      }

      // Default error UI with recovery options
      return (
        <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-8 h-8 text-amber-600" />
              <h1 className="text-2xl font-bold text-amber-900">Oops!</h1>
            </div>
            <p className="text-gray-700 mb-4">
              Something went wrong. Don't worry, we've logged the error and our team will look into it.
            </p>

            {/* Error details section */}
            <details className="mb-6">
              <summary className="cursor-pointer text-sm font-semibold text-gray-600 hover:text-gray-900 mb-2">
                Error Details
              </summary>
              <div className="bg-gray-100 border border-gray-300 rounded p-3 mt-2">
                <p className="text-xs font-mono text-gray-800 break-words">
                  {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <p className="text-xs font-mono text-gray-700 mt-2 max-h-40 overflow-y-auto">
                    {this.state.error.stack}
                  </p>
                )}
              </div>
            </details>

            {/* Recovery actions */}
            <div className="space-y-3">
              <button
                onClick={this.handleReset}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 px-4 rounded transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={this.handleHomeNavigation}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded transition-colors flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                Go Home
              </button>
            </div>

            {/* Error count indicator for debugging */}
            {this.state.errorCount > 1 && (
              <p className="text-xs text-gray-500 mt-4 text-center">
                Error occurred {this.state.errorCount} times
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
