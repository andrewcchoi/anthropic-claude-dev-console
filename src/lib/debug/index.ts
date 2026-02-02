/**
 * Debug mode utilities
 * Controls verbose logging at runtime
 */

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
export function enableDebug(): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem(DEBUG_KEY, 'true');
  console.log(
    '%c✓ Debug mode enabled',
    'background: #22c55e; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;'
  );
  console.log('%cRefresh the page to see debug logs', 'color: #6b7280;');

  // Dispatch event for providers to react
  window.dispatchEvent(new CustomEvent('debug-mode-change', { detail: { enabled: true } }));
}

/**
 * Disable debug mode
 * Disables verbose logging and removes from localStorage
 */
export function disableDebug(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(DEBUG_KEY);
  console.log(
    '%c✓ Debug mode disabled',
    'background: #ef4444; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;'
  );
  console.log('%cRefresh the page to apply changes', 'color: #6b7280;');

  // Dispatch event for providers to react
  window.dispatchEvent(new CustomEvent('debug-mode-change', { detail: { enabled: false } }));
}

/**
 * Toggle debug mode
 */
export function toggleDebug(): void {
  if (isDebugEnabled()) {
    disableDebug();
  } else {
    enableDebug();
  }
}

/**
 * Install global debug commands
 * Makes enableDebug(), disableDebug(), and toggleDebug() available in browser console
 */
export function installDebugCommands(): void {
  if (typeof window === 'undefined') return;

  // Make functions available globally
  (window as any).enableDebug = enableDebug;
  (window as any).disableDebug = disableDebug;
  (window as any).toggleDebug = toggleDebug;

  // Show welcome message with instructions
  if (process.env.NODE_ENV === 'development') {
    console.log(
      '%c🔧 Debug Mode Commands',
      'background: #3b82f6; color: white; padding: 6px 12px; border-radius: 4px; font-weight: bold; font-size: 14px;'
    );
    console.log('%cType these commands in the console:', 'color: #6b7280; font-style: italic;');
    console.log('%c  enableDebug()  %c- Enable verbose logging', 'color: #22c55e; font-weight: bold;', 'color: #6b7280;');
    console.log('%c  disableDebug() %c- Disable verbose logging', 'color: #ef4444; font-weight: bold;', 'color: #6b7280;');
    console.log('%c  toggleDebug()  %c- Toggle debug mode', 'color: #f59e0b; font-weight: bold;', 'color: #6b7280;');

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
