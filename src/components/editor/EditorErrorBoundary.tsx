'use client';

import React from 'react';
import { serializeError, isMonacoCancelation } from '@/lib/utils/errorUtils';

interface EditorErrorBoundaryProps {
  children: React.ReactNode;
  content: string;
  language?: string;
}

interface EditorErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary specifically for Monaco Editor
 * Falls back to a plain <pre> element if Monaco fails to load or render
 */
export class EditorErrorBoundary extends React.Component<
  EditorErrorBoundaryProps,
  EditorErrorBoundaryState
> {
  constructor(props: EditorErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: unknown): EditorErrorBoundaryState {
    // Monaco cancelation errors are transient - don't treat as fatal
    if (isMonacoCancelation(error)) {
      return { hasError: false };
    }
    return { hasError: true, error: error instanceof Error ? error : new Error(serializeError(error)) };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    // Skip logging for cancelation errors - they're expected during initialization
    if (!isMonacoCancelation(error)) {
      console.error('Monaco Editor error:', serializeError(error), errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error ? serializeError(this.state.error) : 'Unknown error';
      return (
        <div className="w-full h-full flex flex-col">
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-200 px-3 py-2 text-sm flex items-center justify-between">
            <span>⚠️ Editor failed to load: {errorMessage}</span>
            <button
              onClick={this.handleRetry}
              className="px-2 py-1 text-xs bg-amber-500/20 hover:bg-amber-500/30 rounded transition-colors"
            >
              Retry
            </button>
          </div>
          <pre className="flex-1 overflow-auto bg-gray-800 text-gray-200 p-4 text-sm font-mono">
            {this.props.content}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}
