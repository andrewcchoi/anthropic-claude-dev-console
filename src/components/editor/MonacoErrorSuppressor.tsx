'use client';

import { useEffect } from 'react';

/**
 * Suppresses Monaco Editor cancelation errors globally.
 * These errors occur when:
 * - Tracking prevention blocks Monaco's CDN storage access
 * - Component unmounts while Monaco is still loading
 *
 * The @monaco-editor/react library internally catches these but
 * the promise rejection still propagates as "unhandledrejection".
 */
export function MonacoErrorSuppressor() {
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      // Check for Monaco cancelation error: {type: 'cancelation', msg: '...'}
      if (event.reason && typeof event.reason === 'object') {
        const reason = event.reason as { type?: string };
        if (reason.type === 'cancelation') {
          event.preventDefault(); // Suppress the error
        }
      }
    };

    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, []);

  return null; // Renders nothing
}
