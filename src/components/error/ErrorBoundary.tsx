'use client';

/**
 * Generic Error Boundary
 * Catches React errors and displays a fallback UI
 */

import { Component, ReactNode, ErrorInfo } from 'react';
import { createLogger } from '@/lib/logger';

const log = createLogger('ErrorBoundary');

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to structured logger
    log.error('React error caught', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  reset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
          <div className="max-w-2xl w-full mx-4">
            <div className="bg-red-50/50 dark:bg-red-950/20 border border-red-300 dark:border-red-800 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <svg
                    className="w-6 h-6 text-red-600 dark:text-red-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-red-700 dark:text-red-400 mb-2">
                    Something went wrong
                  </h2>
                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                    An unexpected error occurred while rendering this component.
                  </p>
                  <details className="mb-4">
                    <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300">
                      Show error details
                    </summary>
                    <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-900 rounded border border-gray-300 dark:border-gray-800">
                      <p className="text-sm text-red-700 dark:text-red-400 font-mono break-all">
                        {this.state.error.message}
                      </p>
                      {this.state.error.stack && (
                        <pre className="mt-2 text-xs text-gray-600 dark:text-gray-500 overflow-x-auto">
                          {this.state.error.stack}
                        </pre>
                      )}
                    </div>
                  </details>
                  <button
                    onClick={this.reset}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-md transition-colors"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
