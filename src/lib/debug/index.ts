/**
 * Debug mode utilities
 * Controls verbose logging at runtime
 *
 * Console commands (available globally):
 * - enableDebug()  - Enable verbose logging + log saving
 * - disableDebug() - Disable verbose logging
 * - toggleDebug()  - Toggle debug mode
 * - exportLogs()   - Get all logs as JSONL string
 * - downloadLogs() - Download logs as .jsonl file
 * - clearLogs()    - Clear all saved logs
 * - getLogStats()  - Get log statistics
 *
 * Global error capture (always active):
 * - Uncaught exceptions (window.onerror)
 * - Unhandled promise rejections
 * - console.error() calls
 * - console.warn() calls
 */

import { exportLogs, downloadLogs, clearLogs, getLogStats } from '@/lib/logger';
import { addLogEntry } from '@/lib/logger/file-logger';

const DEBUG_KEY = 'DEBUG_MODE';

// Track if we've already installed global error handlers
let errorHandlersInstalled = false;

/**
 * Check if debug mode is enabled
 */
export function isDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(DEBUG_KEY) === 'true';
}

/**
 * Enable debug mode
 * Enables verbose logging and persists to localStorage
 */
export async function enableDebug(): Promise<void> {
  if (typeof window === 'undefined') return;

  localStorage.setItem(DEBUG_KEY, 'true');

  // Enable server-side debug mode
  try {
    await fetch('/api/debug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: true }),
    });
  } catch (e) {
    console.warn('Failed to enable server debug mode:', e);
  }

  console.log(
    '%c✓ Debug mode enabled',
    'background: #22c55e; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;'
  );
  console.log('%cDebug logs will appear immediately', 'color: #6b7280;');

  // Dispatch event for providers to react
  window.dispatchEvent(new CustomEvent('debug-mode-change', { detail: { enabled: true } }));
}

/**
 * Disable debug mode
 * Disables verbose logging and removes from localStorage
 */
export async function disableDebug(): Promise<void> {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(DEBUG_KEY);

  // Disable server-side debug mode
  try {
    await fetch('/api/debug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: false }),
    });
  } catch (e) {
    console.warn('Failed to disable server debug mode:', e);
  }

  console.log(
    '%c✓ Debug mode disabled',
    'background: #ef4444; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;'
  );
  console.log('%cDebug logs will stop appearing immediately', 'color: #6b7280;');

  // Dispatch event for providers to react
  window.dispatchEvent(new CustomEvent('debug-mode-change', { detail: { enabled: false } }));
}

/**
 * Toggle debug mode
 */
export async function toggleDebug(): Promise<void> {
  if (isDebugEnabled()) {
    await disableDebug();
  } else {
    await enableDebug();
  }
}

/**
 * Install global error handlers to capture errors to the log system
 * Captures: uncaught exceptions, unhandled promise rejections, console.error calls
 */
function installGlobalErrorHandlers(): void {
  if (typeof window === 'undefined' || errorHandlersInstalled) return;
  errorHandlersInstalled = true;

  // Capture uncaught exceptions
  window.addEventListener('error', (event) => {
    addLogEntry(
      'error',
      'GlobalError',
      event.message || 'Uncaught error',
      {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
      event.error?.stack
    );
  });

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason?.message || reason?.msg || String(reason) || 'Unhandled promise rejection';

    // Skip Monaco cancellation errors (these are normal)
    if (reason?.type === 'cancelation') return;

    addLogEntry(
      'error',
      'UnhandledRejection',
      message,
      { reason: typeof reason === 'object' ? JSON.stringify(reason) : reason },
      reason?.stack
    );
  });

  // Intercept console.error to also capture to logs
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    // Call original first
    originalConsoleError.apply(console, args);

    // Extract message and data
    const message = args.map(arg =>
      typeof arg === 'string' ? arg :
      arg instanceof Error ? arg.message :
      JSON.stringify(arg)
    ).join(' ');

    const errorArg = args.find(arg => arg instanceof Error) as Error | undefined;

    addLogEntry(
      'error',
      'Console',
      message,
      args.length > 1 ? { args: args.map(a => a instanceof Error ? { message: a.message, name: a.name } : a) } : undefined,
      errorArg?.stack
    );
  };

  // Also intercept console.warn
  const originalConsoleWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    originalConsoleWarn.apply(console, args);

    const message = args.map(arg =>
      typeof arg === 'string' ? arg : JSON.stringify(arg)
    ).join(' ');

    addLogEntry(
      'warn',
      'Console',
      message,
      args.length > 1 ? { args } : undefined
    );
  };
}

/**
 * Install global debug commands
 * Makes enableDebug(), disableDebug(), toggleDebug(), and log functions available in browser console
 */
export function installDebugCommands(): void {
  if (typeof window === 'undefined') return;

  // Install global error handlers to capture all errors
  installGlobalErrorHandlers();

  // Make debug functions available globally (fire-and-forget wrappers)
  (window as any).enableDebug = () => { enableDebug().catch(console.error); };
  (window as any).disableDebug = () => { disableDebug().catch(console.error); };
  (window as any).toggleDebug = () => { toggleDebug().catch(console.error); };

  // Make log functions available globally
  (window as any).exportLogs = async () => {
    const logs = await exportLogs();

    // Try to copy to clipboard (may fail if document not focused, e.g., from dev console)
    let copiedToClipboard = false;
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(logs);
        copiedToClipboard = true;
      } catch {
        // Clipboard API requires document focus - common when running from dev console
      }
    }

    if (copiedToClipboard) {
      console.log('%c📋 Logs copied to clipboard', 'color: #22c55e; font-weight: bold;');
      console.log('%cPaste into a .jsonl file or share directly', 'color: #6b7280;');
    } else {
      console.log('%c📋 Logs exported (clipboard unavailable)', 'color: #f59e0b; font-weight: bold;');
      console.log('%cTip: Use downloadLogs() instead, or click in the page first then run exportLogs()', 'color: #6b7280;');
    }
    return logs;
  };
  (window as any).downloadLogs = () => { downloadLogs().catch(console.error); };
  (window as any).clearLogs = () => { clearLogs().catch(console.error); };
  (window as any).getLogStats = async () => {
    const stats = await getLogStats();
    console.log('%c📊 Log Statistics', 'color: #3b82f6; font-weight: bold;');
    console.log(`  Entries: ${stats.entryCount}`);
    console.log(`  Size: ~${Math.round(stats.sizeBytes / 1024)}KB`);
    if (stats.oldestEntry) console.log(`  Oldest: ${stats.oldestEntry}`);
    if (stats.newestEntry) console.log(`  Newest: ${stats.newestEntry}`);
    return stats;
  };

  // Show welcome message with instructions
  if (process.env.NODE_ENV === 'development') {
    console.log(
      '%c🔧 Debug Mode Commands',
      'background: #3b82f6; color: white; padding: 6px 12px; border-radius: 4px; font-weight: bold; font-size: 14px;'
    );
    console.log('%cType these commands in the console:', 'color: #6b7280; font-style: italic;');
    console.log('%c  enableDebug()  %c- Enable verbose logging + log saving', 'color: #22c55e; font-weight: bold;', 'color: #6b7280;');
    console.log('%c  disableDebug() %c- Disable verbose logging', 'color: #ef4444; font-weight: bold;', 'color: #6b7280;');
    console.log('%c  toggleDebug()  %c- Toggle debug mode', 'color: #f59e0b; font-weight: bold;', 'color: #6b7280;');
    console.log('%c  exportLogs()   %c- Copy logs to clipboard (JSONL)', 'color: #8b5cf6; font-weight: bold;', 'color: #6b7280;');
    console.log('%c  downloadLogs() %c- Download logs as .jsonl file', 'color: #8b5cf6; font-weight: bold;', 'color: #6b7280;');
    console.log('%c  clearLogs()    %c- Clear all saved logs', 'color: #ef4444; font-weight: bold;', 'color: #6b7280;');
    console.log('%c  getLogStats()  %c- Show log statistics', 'color: #3b82f6; font-weight: bold;', 'color: #6b7280;');

    // Show current status
    const status = isDebugEnabled() ? 'ENABLED' : 'DISABLED';
    const statusColor = isDebugEnabled() ? '#22c55e' : '#6b7280';
    console.log(
      `%cCurrent status: %c${status}`,
      'color: #6b7280;',
      `color: ${statusColor}; font-weight: bold;`
    );
  }
}

/**
 * Debug mode listener type
 */
export type DebugModeListener = (enabled: boolean) => void;

/**
 * Add a listener for debug mode changes
 */
export function onDebugModeChange(listener: DebugModeListener): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<{ enabled: boolean }>;
    listener(customEvent.detail.enabled);
  };

  window.addEventListener('debug-mode-change', handler);

  // Return cleanup function
  return () => {
    window.removeEventListener('debug-mode-change', handler);
  };
}
