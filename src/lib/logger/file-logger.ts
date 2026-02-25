/**
 * File Logger with Rotation (Browser-side with IndexedDB)
 *
 * Saves logs locally for later export/download.
 * Uses IndexedDB for storage with automatic rotation.
 *
 * Log saving behavior:
 * - info, warn, error: Always saved (important operational logs)
 * - debug: Only saved when debug mode is enabled
 *
 * Configuration:
 * - MAX_ENTRIES: 10000 log entries kept
 * - FLUSH_INTERVAL_MS: 1000ms flush interval
 * - FLUSH_BATCH_SIZE: 50 entries per flush
 *
 * Usage:
 * - Logs are saved automatically when debug mode is enabled
 * - Export logs: exportLogs() returns JSONL string
 * - Clear logs: clearLogs()
 * - Get stats: getLogStats()
 */

const MAX_ENTRIES = 10000;
const KEEP_ENTRIES = 5000;

interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  module: string;
  message: string;
  data?: Record<string, unknown>;
  stack?: string;
}

// In-memory buffer for batching writes
let logBuffer: LogEntry[] = [];
let flushTimeout: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL_MS = 1000;
const FLUSH_BATCH_SIZE = 50;

/**
 * Check if we're in a browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Check if debug mode is enabled
 */
function isDebugEnabled(): boolean {
  if (!isBrowser()) return false;
  return localStorage.getItem('DEBUG_MODE') === 'true' ||
         localStorage.getItem('claude-debug') === 'true';
}

/**
 * Format a log entry as a JSON line
 */
function formatLogEntry(entry: LogEntry): string {
  return JSON.stringify(entry);
}

/**
 * Wrap IDBRequest in a Promise
 */
function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Add a log entry to the buffer
 *
 * Log saving behavior:
 * - info, warn, error: Always saved (important operational logs)
 * - debug: Only saved when debug mode is enabled
 */
export function addLogEntry(
  level: LogEntry['level'],
  module: string,
  message: string,
  data?: Record<string, unknown>,
  stack?: string
): void {
  if (!isBrowser()) return;

  // Debug logs only saved when debug mode is enabled
  // info/warn/error always saved
  if (level === 'debug' && !isDebugEnabled()) return;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    module,
    message,
    ...(data && { data }),
    ...(stack && { stack }),
  };

  logBuffer.push(entry);

  // Flush if buffer is full
  if (logBuffer.length >= FLUSH_BATCH_SIZE) {
    flushLogs();
  } else if (!flushTimeout) {
    // Schedule a flush
    flushTimeout = setTimeout(flushLogs, FLUSH_INTERVAL_MS);
  }
}

/**
 * Flush logs to IndexedDB
 */
async function flushLogs(): Promise<void> {
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }

  if (logBuffer.length === 0 || !isBrowser()) return;

  const entries = [...logBuffer];
  logBuffer = [];

  try {
    const db = await openLogDatabase();
    const tx = db.transaction('logs', 'readwrite');
    const store = tx.objectStore('logs');

    // Add all entries
    for (const entry of entries) {
      store.add(entry);
    }

    // Check if we need to rotate
    const count = await requestToPromise(store.count());
    if (count > MAX_ENTRIES) {
      // Keep last KEEP_ENTRIES entries (delete oldest)
      const allKeys = await requestToPromise(store.getAllKeys());
      const keysToDelete = allKeys.slice(0, count - KEEP_ENTRIES);
      for (const key of keysToDelete) {
        store.delete(key);
      }
    }

    // Wait for transaction to complete
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    // Fallback to localStorage with rotation
    try {
      const existingLogs = localStorage.getItem('claude-logs') || '';
      const newLogs = entries.map(formatLogEntry).join('\n');
      const combined = existingLogs + (existingLogs ? '\n' : '') + newLogs;

      // Rotate if too large (keep last 100KB in localStorage)
      if (combined.length > 100 * 1024) {
        const trimmed = combined.slice(-50 * 1024);
        localStorage.setItem('claude-logs', trimmed);
      } else {
        localStorage.setItem('claude-logs', combined);
      }
    } catch {
      // Storage full, clear and start fresh
      localStorage.removeItem('claude-logs');
    }
  }
}

/**
 * Open IndexedDB for log storage
 */
function openLogDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ClaudeLogs', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('logs')) {
        const store = db.createObjectStore('logs', {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('timestamp', 'timestamp');
        store.createIndex('level', 'level');
        store.createIndex('module', 'module');
      }
    };
  });
}

/**
 * Export logs for download in JSONL format
 * Returns all logs as a string with one JSON object per line
 */
export async function exportLogs(): Promise<string> {
  if (!isBrowser()) {
    return '';
  }

  // Flush any pending logs first
  await flushLogs();

  try {
    const db = await openLogDatabase();
    const tx = db.transaction('logs', 'readonly');
    const store = tx.objectStore('logs');
    const allLogs = await requestToPromise(store.getAll());

    // Return JSONL format (one JSON object per line)
    return allLogs.map(formatLogEntry).join('\n');
  } catch {
    // Fallback to localStorage
    return localStorage.getItem('claude-logs') || '';
  }
}

/**
 * Clear all logs
 */
export async function clearLogs(): Promise<void> {
  if (!isBrowser()) return;

  try {
    const db = await openLogDatabase();
    const tx = db.transaction('logs', 'readwrite');
    const store = tx.objectStore('logs');
    store.clear();
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Fallback
  }

  localStorage.removeItem('claude-logs');
  logBuffer = [];
}

/**
 * Get log statistics
 */
export async function getLogStats(): Promise<{
  entryCount: number;
  sizeBytes: number;
  oldestEntry?: string;
  newestEntry?: string;
}> {
  if (!isBrowser()) {
    return { entryCount: 0, sizeBytes: 0 };
  }

  try {
    const db = await openLogDatabase();
    const tx = db.transaction('logs', 'readonly');
    const store = tx.objectStore('logs');
    const count = await requestToPromise(store.count());

    const index = store.index('timestamp');
    const oldest = await requestToPromise(index.get(IDBKeyRange.lowerBound('')));

    // Get newest entry via cursor
    const newestEntry = await new Promise<string | undefined>((resolve) => {
      const cursorRequest = index.openCursor(null, 'prev');
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        resolve(cursor?.value?.timestamp);
      };
      cursorRequest.onerror = () => resolve(undefined);
    });

    return {
      entryCount: count,
      sizeBytes: count * 200, // Estimate ~200 bytes per entry
      oldestEntry: oldest?.timestamp,
      newestEntry,
    };
  } catch {
    const logs = localStorage.getItem('claude-logs') || '';
    return {
      entryCount: logs.split('\n').filter(Boolean).length,
      sizeBytes: logs.length,
    };
  }
}

/**
 * Download logs as a JSONL file
 */
export async function downloadLogs(): Promise<void> {
  if (!isBrowser()) return;

  const logs = await exportLogs();
  const blob = new Blob([logs], { type: 'application/x-jsonlines' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `claude-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Flush logs before page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (logBuffer.length > 0) {
      // Synchronous flush using localStorage as fallback
      try {
        const existingLogs = localStorage.getItem('claude-logs') || '';
        const newLogs = logBuffer.map(formatLogEntry).join('\n');
        localStorage.setItem('claude-logs', existingLogs + (existingLogs ? '\n' : '') + newLogs);
      } catch {
        // Ignore storage errors on unload
      }
    }
  });
}
