import { describe, it, expect, beforeEach, vi } from 'vitest';
import { logStream, enableLogStreaming, disableLogStreaming } from '@/lib/logger/log-stream';
import type { LogEntry } from '@/types/logger';

const createLogEntry = (overrides?: Partial<LogEntry>): LogEntry => ({
  timestamp: new Date().toISOString(),
  level: 'info',
  module: 'TestModule',
  message: 'Test message',
  ...overrides,
});

describe('LogStream', () => {
  beforeEach(() => {
    logStream.clear();
    disableLogStreaming();
    // Remove all event listeners to ensure test isolation
    logStream.removeAllListeners('log');
  });

  describe('enabled flag', () => {
    it('add() does nothing when disabled', () => {
      const entry = createLogEntry();
      logStream.add(entry);

      expect(logStream.getLogs()).toHaveLength(0);
      expect(logStream.getCount()).toBe(0);
    });

    it('add() stores entry when enabled', () => {
      enableLogStreaming();
      const entry = createLogEntry({ message: 'Enabled test' });
      logStream.add(entry);

      const logs = logStream.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Enabled test');
    });

    it('isEnabled() returns correct state', () => {
      expect(logStream.isEnabled()).toBe(false);
      enableLogStreaming();
      expect(logStream.isEnabled()).toBe(true);
      disableLogStreaming();
      expect(logStream.isEnabled()).toBe(false);
    });
  });

  describe('rotation', () => {
    it('rotates at maxLogs (1000) - keeps only last 1000 entries', () => {
      enableLogStreaming();

      // Add 1005 entries
      for (let i = 0; i < 1005; i++) {
        logStream.add(createLogEntry({ message: `Message ${i}` }));
      }

      const logs = logStream.getLogs();
      expect(logs).toHaveLength(1000);
      // First entry should be Message 5 (0-4 were rotated out)
      expect(logs[0].message).toBe('Message 5');
      // Last entry should be Message 1004
      expect(logs[999].message).toBe('Message 1004');
    });

    it('does not rotate when under maxLogs', () => {
      enableLogStreaming();

      for (let i = 0; i < 500; i++) {
        logStream.add(createLogEntry({ message: `Message ${i}` }));
      }

      const logs = logStream.getLogs();
      expect(logs).toHaveLength(500);
      expect(logs[0].message).toBe('Message 0');
    });
  });

  describe('getLogs', () => {
    it('returns all logs when no count specified', () => {
      enableLogStreaming();

      for (let i = 0; i < 10; i++) {
        logStream.add(createLogEntry({ message: `Message ${i}` }));
      }

      const logs = logStream.getLogs();
      expect(logs).toHaveLength(10);
    });

    it('returns last N logs when count specified', () => {
      enableLogStreaming();

      for (let i = 0; i < 10; i++) {
        logStream.add(createLogEntry({ message: `Message ${i}` }));
      }

      const logs = logStream.getLogs(3);
      expect(logs).toHaveLength(3);
      expect(logs[0].message).toBe('Message 7');
      expect(logs[1].message).toBe('Message 8');
      expect(logs[2].message).toBe('Message 9');
    });

    it('returns all logs when count exceeds total', () => {
      enableLogStreaming();

      for (let i = 0; i < 5; i++) {
        logStream.add(createLogEntry({ message: `Message ${i}` }));
      }

      const logs = logStream.getLogs(100);
      expect(logs).toHaveLength(5);
    });

    it('returns a copy of logs array (not reference)', () => {
      enableLogStreaming();
      logStream.add(createLogEntry({ message: 'Original' }));

      const logs = logStream.getLogs();
      logs.push(createLogEntry({ message: 'Modified' }));

      // Original should be unchanged
      expect(logStream.getLogs()).toHaveLength(1);
    });
  });

  describe('events', () => {
    it('emits log event on add', () => {
      enableLogStreaming();
      const listener = vi.fn();
      logStream.on('log', listener);

      const entry = createLogEntry({ message: 'Event test' });
      logStream.add(entry);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(entry);
    });

    it('does not emit when disabled', () => {
      const listener = vi.fn();
      logStream.on('log', listener);

      const entry = createLogEntry({ message: 'Disabled event test' });
      logStream.add(entry);

      expect(listener).not.toHaveBeenCalled();
    });

    it('emits for each log added', () => {
      enableLogStreaming();
      const listener = vi.fn();
      logStream.on('log', listener);

      logStream.add(createLogEntry({ message: 'First' }));
      logStream.add(createLogEntry({ message: 'Second' }));
      logStream.add(createLogEntry({ message: 'Third' }));

      expect(listener).toHaveBeenCalledTimes(3);
    });
  });

  describe('clear', () => {
    it('empties buffer', () => {
      enableLogStreaming();

      for (let i = 0; i < 10; i++) {
        logStream.add(createLogEntry({ message: `Message ${i}` }));
      }

      expect(logStream.getLogs()).toHaveLength(10);

      logStream.clear();

      expect(logStream.getLogs()).toHaveLength(0);
      expect(logStream.getCount()).toBe(0);
    });

    it('can add logs after clearing', () => {
      enableLogStreaming();

      logStream.add(createLogEntry({ message: 'Before clear' }));
      logStream.clear();
      logStream.add(createLogEntry({ message: 'After clear' }));

      const logs = logStream.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('After clear');
    });
  });

  describe('getCount', () => {
    it('returns correct count', () => {
      enableLogStreaming();

      expect(logStream.getCount()).toBe(0);

      logStream.add(createLogEntry());
      expect(logStream.getCount()).toBe(1);

      logStream.add(createLogEntry());
      logStream.add(createLogEntry());
      expect(logStream.getCount()).toBe(3);
    });
  });
});
