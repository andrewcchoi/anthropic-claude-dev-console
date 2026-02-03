'use client';

/**
 * Terminal Error Boundary
 * Specialized error boundary for terminal components with terminal-themed fallback
 */

import { ErrorBoundary } from './ErrorBoundary';
import { ReactNode } from 'react';

interface TerminalErrorBoundaryProps {
  children: ReactNode;
}

export function TerminalErrorBoundary({ children }: TerminalErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <div className="h-full w-full bg-black text-green-400 font-mono p-4 overflow-auto">
          <div className="space-y-2">
            <div className="text-red-400">
              ╔═══════════════════════════════════════════════════════════╗
            </div>
            <div className="text-red-400">
              ║  TERMINAL ERROR                                           ║
            </div>
            <div className="text-red-400">
              ╚═══════════════════════════════════════════════════════════╝
            </div>
            <div className="mt-4">
              <span className="text-yellow-400">$</span> Error: {error.message}
            </div>
            <div className="mt-2 text-gray-500 text-sm">
              {error.stack?.split('\n').slice(0, 5).map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
            <div className="mt-4">
              <button
                onClick={reset}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-black font-bold rounded transition-colors"
              >
                ▶ Restart Terminal
              </button>
            </div>
            <div className="mt-2 text-gray-600 text-xs">
              Tip: Check the browser console for more details
            </div>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
