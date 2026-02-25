/**
 * File Logger Unit Tests
 *
 * Tests for IndexedDB-based log storage functions.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

// Mock localStorage before importing file-logger
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Helper to wait for flush (buffer has 1000ms interval)
const waitForFlush = () => new Promise((resolve) => setTimeout(resolve, 1100));

describe('file-logger', () => {
  beforeEach(async () => {
    // Reset IndexedDB completely by creating a fresh instance
    // This is more reliable than deleteDatabase which can hang
    global.indexedDB = new IDBFactory();

    // Clear localStorage
    localStorageMock.clear();

    // Dynamically import to get fresh module state
    // Note: The module is cached, but clearLogs will reset the state
    const { clearLogs } = await import('@/lib/logger/file-logger');
    await clearLogs();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('exportLogs', () => {
    it('returns valid JSONL format (multiple lines, each parseable as JSON)', async () => {
      const { addLogEntry, exportLogs } = await import('@/lib/logger/file-logger');

      // Enable debug mode to ensure debug logs are saved
      localStorageMock.setItem('DEBUG_MODE', 'true');

      // Add multiple log entries
      addLogEntry('info', 'TestModule', 'First message');
      addLogEntry('debug', 'TestModule', 'Second message');
      addLogEntry('error', 'TestModule', 'Third message');

      // Wait for buffer to flush
      await waitForFlush();

      // Export logs
      const jsonl = await exportLogs();

      // Should have content
      expect(jsonl.length).toBeGreaterThan(0);

      // Split into lines
      const lines = jsonl.split('\n').filter((line) => line.trim() !== '');

      // Should have 3 lines (one per log entry)
      expect(lines.length).toBe(3);

      // Each line should be valid JSON
      for (const line of lines) {
        expect(() => JSON.parse(line)).not.toThrow();
        const entry = JSON.parse(line);
        expect(entry).toHaveProperty('timestamp');
        expect(entry).toHaveProperty('level');
        expect(entry).toHaveProperty('module');
        expect(entry).toHaveProperty('message');
      }
    });

    it('handles special characters in messages (newlines, tabs)', async () => {
      const { addLogEntry, exportLogs } = await import('@/lib/logger/file-logger');

      localStorageMock.setItem('DEBUG_MODE', 'true');

      // Add entries with special characters
      addLogEntry('info', 'TestModule', 'Message with\nnewline');
      addLogEntry('info', 'TestModule', 'Message with\ttab');
      addLogEntry('info', 'TestModule', 'Message with "quotes" and \\backslash');

      await waitForFlush();

      const jsonl = await exportLogs();
      const lines = jsonl.split('\n').filter((line) => line.trim() !== '');

      // Each line should still be valid JSON
      expect(lines.length).toBe(3);

      for (const line of lines) {
        expect(() => JSON.parse(line)).not.toThrow();
      }

      // Verify special characters are preserved
      const entries = lines.map((line) => JSON.parse(line));
      expect(entries[0].message).toBe('Message with\nnewline');
      expect(entries[1].message).toBe('Message with\ttab');
      expect(entries[2].message).toBe('Message with "quotes" and \\backslash');
    });

    it('returns empty string when no logs exist', async () => {
      const { exportLogs } = await import('@/lib/logger/file-logger');
      const jsonl = await exportLogs();
      expect(jsonl).toBe('');
    });
  });

  describe('getLogStats', () => {
    it('returns correct counts and timestamps', async () => {
      const { addLogEntry, getLogStats } = await import('@/lib/logger/file-logger');

      localStorageMock.setItem('DEBUG_MODE', 'true');

      // Add log entries
      addLogEntry('info', 'TestModule', 'First message');
      await waitForFlush();

      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 50));

      addLogEntry('info', 'TestModule', 'Second message');
      addLogEntry('error', 'TestModule', 'Third message');
      await waitForFlush();

      const stats = await getLogStats();

      expect(stats.entryCount).toBe(3);
      expect(stats.sizeBytes).toBeGreaterThan(0);
      expect(stats.oldestEntry).toBeDefined();
      expect(stats.newestEntry).toBeDefined();
    });

    it('oldestEntry <= newestEntry', async () => {
      const { addLogEntry, getLogStats } = await import('@/lib/logger/file-logger');

      localStorageMock.setItem('DEBUG_MODE', 'true');

      // Add first entry
      addLogEntry('info', 'TestModule', 'First message');
      await waitForFlush();

      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Add second entry
      addLogEntry('info', 'TestModule', 'Second message');
      await waitForFlush();

      const stats = await getLogStats();

      expect(stats.oldestEntry).toBeDefined();
      expect(stats.newestEntry).toBeDefined();

      const oldest = new Date(stats.oldestEntry!).getTime();
      const newest = new Date(stats.newestEntry!).getTime();

      expect(oldest).toBeLessThanOrEqual(newest);
    });

    it('returns zero counts when no logs exist', async () => {
      const { getLogStats } = await import('@/lib/logger/file-logger');
      const stats = await getLogStats();
      expect(stats.entryCount).toBe(0);
      expect(stats.sizeBytes).toBe(0);
    });
  });

  describe('clearLogs', () => {
    it('empties IndexedDB (stats.entryCount becomes 0)', async () => {
      const { addLogEntry, getLogStats, clearLogs } = await import(
        '@/lib/logger/file-logger'
      );

      localStorageMock.setItem('DEBUG_MODE', 'true');

      // Add some logs
      addLogEntry('info', 'TestModule', 'Message 1');
      addLogEntry('error', 'TestModule', 'Message 2');
      addLogEntry('warn', 'TestModule', 'Message 3');
      await waitForFlush();

      // Verify logs exist
      let stats = await getLogStats();
      expect(stats.entryCount).toBe(3);

      // Clear logs
      await clearLogs();

      // Verify logs are gone
      stats = await getLogStats();
      expect(stats.entryCount).toBe(0);
    });

    it('also clears localStorage fallback', async () => {
      const { clearLogs } = await import('@/lib/logger/file-logger');

      // Manually set localStorage fallback
      localStorageMock.setItem('claude-logs', '{"test": "data"}');

      await clearLogs();

      expect(localStorageMock.getItem('claude-logs')).toBeNull();
    });
  });

  describe('addLogEntry', () => {
    it('only saves debug logs when debug mode enabled', async () => {
      const { addLogEntry, getLogStats } = await import('@/lib/logger/file-logger');

      // Debug mode disabled by default
      expect(localStorageMock.getItem('DEBUG_MODE')).toBeNull();

      // Add debug log
      addLogEntry('debug', 'TestModule', 'Debug message');
      await waitForFlush();

      // Should not be saved
      let stats = await getLogStats();
      expect(stats.entryCount).toBe(0);

      // Enable debug mode
      localStorageMock.setItem('DEBUG_MODE', 'true');

      // Add another debug log
      addLogEntry('debug', 'TestModule', 'Debug message 2');
      await waitForFlush();

      // Should be saved now
      stats = await getLogStats();
      expect(stats.entryCount).toBe(1);
    });

    it('always saves info regardless of debug mode', async () => {
      const { addLogEntry, getLogStats } = await import('@/lib/logger/file-logger');

      // Debug mode disabled
      expect(localStorageMock.getItem('DEBUG_MODE')).toBeNull();

      addLogEntry('info', 'TestModule', 'Info message');
      await waitForFlush();

      const stats = await getLogStats();
      expect(stats.entryCount).toBe(1);
    });

    it('always saves warn regardless of debug mode', async () => {
      const { addLogEntry, getLogStats } = await import('@/lib/logger/file-logger');

      // Debug mode disabled
      expect(localStorageMock.getItem('DEBUG_MODE')).toBeNull();

      addLogEntry('warn', 'TestModule', 'Warn message');
      await waitForFlush();

      const stats = await getLogStats();
      expect(stats.entryCount).toBe(1);
    });

    it('always saves error regardless of debug mode', async () => {
      const { addLogEntry, getLogStats } = await import('@/lib/logger/file-logger');

      // Debug mode disabled
      expect(localStorageMock.getItem('DEBUG_MODE')).toBeNull();

      addLogEntry('error', 'TestModule', 'Error message');
      await waitForFlush();

      const stats = await getLogStats();
      expect(stats.entryCount).toBe(1);
    });

    it('saves data and stack when provided', async () => {
      const { addLogEntry, exportLogs } = await import('@/lib/logger/file-logger');

      localStorageMock.setItem('DEBUG_MODE', 'true');

      const testData = { userId: 123, action: 'test' };
      const testStack = 'Error: test\n  at test.ts:1:1';

      addLogEntry('error', 'TestModule', 'Error with data', testData, testStack);
      await waitForFlush();

      const jsonl = await exportLogs();
      const entry = JSON.parse(jsonl);

      expect(entry.data).toEqual(testData);
      expect(entry.stack).toBe(testStack);
    });

    it('respects claude-debug localStorage key for debug mode', async () => {
      const { addLogEntry, getLogStats } = await import('@/lib/logger/file-logger');

      // Use alternative debug key
      localStorageMock.setItem('claude-debug', 'true');

      addLogEntry('debug', 'TestModule', 'Debug message');
      await waitForFlush();

      const stats = await getLogStats();
      expect(stats.entryCount).toBe(1);
    });
  });
});
