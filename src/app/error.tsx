'use client';

/**
 * Next.js Error Page
 * Global error boundary for the entire app
 */

import { useEffect } from 'react';
import { createLogger } from '@/lib/logger';

const log = createLogger('AppError');

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to structured logger
    log.error('App-level error', {
      error: error.message,
      stack: error.stack,
      digest: error.digest,
    });
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-950">
          <div className="max-w-2xl w-full mx-4">
            <div className="bg-red-950/20 border border-red-800 rounded-lg p-8">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <svg
                    className="w-8 h-8 text-red-500"
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
                  <h1 className="text-2xl font-bold text-red-400 mb-3">
                    Application Error
                  </h1>
                  <p className="text-gray-300 mb-4">
                    An unexpected error occurred. The application encountered a problem
                    and could not continue.
                  </p>

                  <details className="mb-6">
                    <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300 mb-2">
                      Technical details
                    </summary>
                    <div className="mt-3 p-4 bg-gray-900 rounded border border-gray-800">
                      <div className="mb-2">
                        <span className="text-xs text-gray-500 uppercase font-semibold">
                          Error Message
                        </span>
                        <p className="text-sm text-red-400 font-mono mt-1 break-all">
                          {error.message}
                        </p>
                      </div>
                      {error.digest && (
                        <div className="mb-2">
                          <span className="text-xs text-gray-500 uppercase font-semibold">
                            Error ID
                          </span>
                          <p className="text-sm text-gray-400 font-mono mt-1">
                            {error.digest}
                          </p>
                        </div>
                      )}
                      {error.stack && (
                        <div>
                          <span className="text-xs text-gray-500 uppercase font-semibold">
                            Stack Trace
                          </span>
                          <pre className="text-xs text-gray-500 overflow-x-auto mt-1 max-h-64">
                            {error.stack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>

                  <div className="flex gap-3">
                    <button
                      onClick={reset}
                      className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors"
                    >
                      Try again
                    </button>
                    <button
                      onClick={() => window.location.href = '/'}
                      className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-md transition-colors"
                    >
                      Go home
                    </button>
                  </div>

                  <div className="mt-6 p-3 bg-gray-900/50 rounded border border-gray-800">
                    <p className="text-xs text-gray-500">
                      <strong className="text-gray-400">Debugging tip:</strong> Open the
                      browser console (F12) for more details. You can also enable debug
                      mode by typing <code className="text-green-400">enableDebug()</code>{' '}
                      in the console.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
