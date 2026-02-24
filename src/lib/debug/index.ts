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
 */

import { exportLogs, downloadLogs, clearLogs, getLogStats } from '@/lib/logger';

const DEBUG_KEY = 'DEBUG_MODE';

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
 * Install global debug commands
 * Makes enableDebug(), disableDebug(), toggleDebug(), and log functions available in browser console
 */
export function installDebugCommands(): void {
  if (typeof window === 'undefined') return;

  // Make debug functions available globally (fire-and-forget wrappers)
  (window as any).enableDebug = () => { enableDebug().catch(console.error); };
  (window as any).disableDebug = () => { disableDebug().catch(console.error); };
  (window as any).toggleDebug = () => { toggleDebug().catch(console.error); };

  // Make log functions available globally
  (window as any).exportLogs = async () => {
    const logs = await exportLogs();
    console.log('%c📋 Logs exported to clipboard', 'color: #22c55e; font-weight: bold;');
    console.log('%cPaste into a .jsonl file or share directly', 'color: #6b7280;');
    // Also copy to clipboard if available
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(logs);
      console.log('%c✓ Copied to clipboard', 'color: #22c55e;');
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
