/**
 * LogViewer Regression Tests
 *
 * These tests verify the existing LogViewer functionality before any enhancements.
 * They ensure that existing behavior is preserved during refactoring.
 *
 * Tests cover:
 * - SSE lifecycle (connect, disconnect, status)
 * - Filtering (level, text search)
 * - Actions (clear, entry limit)
 * - Debug mode gate
 * - Display (log entry format, data expansion)
 * - State persistence (auto-scroll toggle, filter count)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { LogViewer } from '@/components/debug/LogViewer';
import type { LogEntry } from '@/types/logger';

// ============================================================================
// Mock scrollIntoView (not available in jsdom)
// ============================================================================

Element.prototype.scrollIntoView = vi.fn();

// ============================================================================
// EventSource Mock
// ============================================================================

interface MockEventSourceInstance {
  url: string;
  onopen: (() => void) | null;
  onerror: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  close: ReturnType<typeof vi.fn>;
  instances: MockEventSource[];
}

const mockEventSource: MockEventSourceInstance = {
  url: '',
  onopen: null,
  onerror: null,
  onmessage: null,
  close: vi.fn(),
  instances: [],
};

class MockEventSource {
  public url: string;
  private _onopen: (() => void) | null = null;
  private _onerror: (() => void) | null = null;
  private _onmessage: ((event: { data: string }) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    mockEventSource.url = url;
    mockEventSource.close.mockClear();
    mockEventSource.instances.push(this);
  }

  set onopen(fn: (() => void) | null) {
    this._onopen = fn;
    mockEventSource.onopen = fn;
  }
  get onopen() {
    return this._onopen;
  }

  set onerror(fn: (() => void) | null) {
    this._onerror = fn;
    mockEventSource.onerror = fn;
  }
  get onerror() {
    return this._onerror;
  }

  set onmessage(fn: ((event: { data: string }) => void) | null) {
    this._onmessage = fn;
    mockEventSource.onmessage = fn;
  }
  get onmessage() {
    return this._onmessage;
  }

  close() {
    mockEventSource.close();
  }
}

// Install mock EventSource globally
const OriginalEventSource = global.EventSource;
beforeEach(() => {
  (global as unknown as { EventSource: typeof MockEventSource }).EventSource = MockEventSource;
  mockEventSource.instances = [];
});

afterEach(() => {
  global.EventSource = OriginalEventSource;
});

// ============================================================================
// Debug Provider Mock
// ============================================================================

let mockDebugEnabled = true;

vi.mock('@/components/providers/DebugProvider', () => ({
  useDebug: () => ({ debugEnabled: mockDebugEnabled }),
}));

// Mock DebugToggle since it's rendered in the component
vi.mock('@/components/ui/DebugToggle', () => ({
  DebugToggle: ({ variant }: { variant?: string }) => (
    <button data-testid="debug-toggle">{variant === 'full' ? 'Enable Debug' : 'Debug'}</button>
  ),
}));

// ============================================================================
// Helpers
// ============================================================================

function simulateLog(log: Partial<LogEntry>) {
  const fullLog: LogEntry = {
    timestamp: new Date().toISOString(),
    level: 'info',
    module: 'TestModule',
    message: 'Test message',
    ...log,
  };

  act(() => {
    mockEventSource.onmessage?.({
      data: JSON.stringify({
        type: 'log',
        log: fullLog,
      }),
    });
  });
}

function simulateConnect() {
  act(() => {
    mockEventSource.onopen?.();
  });
}

function simulateError() {
  act(() => {
    mockEventSource.onerror?.();
  });
}

// ============================================================================
// Tests
// ============================================================================

describe('LogViewer Regression Tests', () => {
  beforeEach(() => {
    mockDebugEnabled = true;
    mockEventSource.close.mockClear();
    mockEventSource.url = '';
    mockEventSource.onopen = null;
    mockEventSource.onerror = null;
    mockEventSource.onmessage = null;
  });

  // -------------------------------------------------------------------------
  // SSE Lifecycle Tests
  // -------------------------------------------------------------------------

  describe('SSE Lifecycle', () => {
    it('connects to /api/logs/stream on mount when debug enabled', () => {
      render(<LogViewer />);

      expect(mockEventSource.url).toBe('/api/logs/stream');
    });

    it('disconnects on unmount', () => {
      const { unmount } = render(<LogViewer />);

      unmount();

      expect(mockEventSource.close).toHaveBeenCalled();
    });

    it('shows Connected status after onopen', async () => {
      render(<LogViewer />);

      // Initially disconnected
      expect(screen.getByText('Disconnected')).toBeInTheDocument();

      simulateConnect();

      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });
    });

    it('shows Disconnected status after onerror', async () => {
      render(<LogViewer />);

      // First connect
      simulateConnect();
      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });

      // Then error
      simulateError();
      await waitFor(() => {
        expect(screen.getByText('Disconnected')).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Filter Tests
  // -------------------------------------------------------------------------

  describe('Filtering', () => {
    it('level filter filters by debug/info/warn/error', async () => {
      render(<LogViewer />);
      simulateConnect();

      // Add logs of different levels
      simulateLog({ level: 'debug', message: 'Debug message' });
      simulateLog({ level: 'info', message: 'Info message' });
      simulateLog({ level: 'warn', message: 'Warn message' });
      simulateLog({ level: 'error', message: 'Error message' });

      // All 4 logs visible initially
      expect(screen.getByText('Debug message')).toBeInTheDocument();
      expect(screen.getByText('Info message')).toBeInTheDocument();
      expect(screen.getByText('Warn message')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();

      // Filter to 'info' only
      const levelSelect = screen.getByRole('combobox');
      fireEvent.change(levelSelect, { target: { value: 'info' } });

      // Only info message visible
      expect(screen.queryByText('Debug message')).not.toBeInTheDocument();
      expect(screen.getByText('Info message')).toBeInTheDocument();
      expect(screen.queryByText('Warn message')).not.toBeInTheDocument();
      expect(screen.queryByText('Error message')).not.toBeInTheDocument();
    });

    it('text search filters by message, module, correlationId', async () => {
      render(<LogViewer />);
      simulateConnect();

      // Add logs with different content
      simulateLog({
        message: 'Finding the needle',
        module: 'ModuleA',
        correlationId: 'corr-abc-123',
      });
      simulateLog({
        message: 'Something else',
        module: 'SearchModule',
        correlationId: 'corr-xyz-789',
      });
      simulateLog({
        message: 'Third message',
        module: 'ModuleC',
        correlationId: 'search-target',
      });

      // All 3 logs visible initially
      expect(screen.getByText('Finding the needle')).toBeInTheDocument();
      expect(screen.getByText('Something else')).toBeInTheDocument();
      expect(screen.getByText('Third message')).toBeInTheDocument();

      // Search by message
      const searchInput = screen.getByPlaceholderText('Filter logs...');
      fireEvent.change(searchInput, { target: { value: 'needle' } });

      expect(screen.getByText('Finding the needle')).toBeInTheDocument();
      expect(screen.queryByText('Something else')).not.toBeInTheDocument();
      expect(screen.queryByText('Third message')).not.toBeInTheDocument();

      // Search by module
      fireEvent.change(searchInput, { target: { value: 'SearchModule' } });

      expect(screen.queryByText('Finding the needle')).not.toBeInTheDocument();
      expect(screen.getByText('Something else')).toBeInTheDocument();
      expect(screen.queryByText('Third message')).not.toBeInTheDocument();

      // Search by correlationId
      fireEvent.change(searchInput, { target: { value: 'search-target' } });

      expect(screen.queryByText('Finding the needle')).not.toBeInTheDocument();
      expect(screen.queryByText('Something else')).not.toBeInTheDocument();
      expect(screen.getByText('Third message')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Action Tests
  // -------------------------------------------------------------------------

  describe('Actions', () => {
    it('clear button empties logs array', async () => {
      render(<LogViewer />);
      simulateConnect();

      // Add logs
      simulateLog({ message: 'Log entry 1' });
      simulateLog({ message: 'Log entry 2' });

      expect(screen.getByText('Log entry 1')).toBeInTheDocument();
      expect(screen.getByText('Log entry 2')).toBeInTheDocument();

      // Click clear
      const clearButton = screen.getByRole('button', { name: 'Clear' });
      fireEvent.click(clearButton);

      // Logs should be gone
      expect(screen.queryByText('Log entry 1')).not.toBeInTheDocument();
      expect(screen.queryByText('Log entry 2')).not.toBeInTheDocument();

      // Should show "No logs yet" empty state
      expect(screen.getByText('No logs yet')).toBeInTheDocument();
    });

    it('1000 entry limit enforced (keeps last 999 + new = 1000)', async () => {
      render(<LogViewer />);
      simulateConnect();

      // Add logs in batches to avoid timeout
      // The code uses [...prev.slice(-999), message.log] which keeps 999 old + 1 new = 1000 max
      // We'll add 1002 entries to test the limit is enforced
      const batchSize = 100;
      const totalEntries = 1002;

      for (let batch = 0; batch < Math.ceil(totalEntries / batchSize); batch++) {
        act(() => {
          for (let i = 0; i < batchSize && batch * batchSize + i < totalEntries; i++) {
            const entryNum = batch * batchSize + i;
            mockEventSource.onmessage?.({
              data: JSON.stringify({
                type: 'log',
                log: {
                  timestamp: new Date().toISOString(),
                  level: 'info',
                  module: 'TestModule',
                  message: `Log entry ${entryNum}`,
                },
              }),
            });
          }
        });
      }

      // Wait for DOM to update
      await waitFor(() => {
        // Verify the count shows only 1000 logs
        expect(screen.getByText(/1000 \/ 1000 logs/)).toBeInTheDocument();
      });

      // First two logs (entry 0 and 1) should be dropped, entries 2-1001 should remain
      expect(screen.queryByText('Log entry 0')).not.toBeInTheDocument();
      expect(screen.queryByText('Log entry 1')).not.toBeInTheDocument();
      expect(screen.getByText('Log entry 2')).toBeInTheDocument();
      expect(screen.getByText('Log entry 1001')).toBeInTheDocument();
    }, 30000); // Increase timeout for this specific test
  });

  // -------------------------------------------------------------------------
  // Debug Mode Tests
  // -------------------------------------------------------------------------

  describe('Debug Mode Gate', () => {
    it('shows "requires debug mode" when debug disabled', () => {
      mockDebugEnabled = false;

      render(<LogViewer />);

      expect(screen.getByText(/Log viewer requires debug mode/i)).toBeInTheDocument();
      expect(screen.getByTestId('debug-toggle')).toBeInTheDocument();

      // Should NOT connect to EventSource
      expect(mockEventSource.url).toBe('');
    });
  });

  // -------------------------------------------------------------------------
  // Display Tests
  // -------------------------------------------------------------------------

  describe('Display', () => {
    it('log entry displays timestamp, level, module, message', () => {
      render(<LogViewer />);
      simulateConnect();

      const timestamp = '2026-02-24T12:34:56.789Z';
      simulateLog({
        timestamp,
        level: 'warn',
        module: 'TestComponent',
        message: 'Warning occurred',
      });

      // Check level badge (text is lowercase, CSS uppercase class applies styling)
      expect(screen.getByText('warn')).toBeInTheDocument();

      // Check module - text is inside span with "[module]" format
      // Use a text matcher function since JSX splits "[TestComponent]" into text nodes
      expect(
        screen.getByText((content, element) => {
          return (
            element?.tagName === 'SPAN' &&
            element?.textContent === '[TestComponent]'
          );
        })
      ).toBeInTheDocument();

      // Check message
      expect(screen.getByText('Warning occurred')).toBeInTheDocument();

      // Check timestamp (formatted via toLocaleTimeString)
      // The exact format depends on locale, so we check it's rendered
      const timestampDate = new Date(timestamp);
      const formattedTime = timestampDate.toLocaleTimeString();
      expect(screen.getByText(formattedTime)).toBeInTheDocument();
    });

    it('data expansion (details element) toggles correctly', async () => {
      render(<LogViewer />);
      simulateConnect();

      simulateLog({
        message: 'Log with data',
        data: { key: 'value', nested: { foo: 'bar' } },
      });

      // "Show data" should be visible
      const showDataButton = screen.getByText('Show data');
      expect(showDataButton).toBeInTheDocument();

      // Data should be hidden initially (details is closed)
      const preElement = screen.queryByText(/"key": "value"/);
      expect(preElement).not.toBeVisible();

      // Click to expand
      fireEvent.click(showDataButton);

      // Data should now be visible
      await waitFor(() => {
        expect(screen.getByText(/"key": "value"/)).toBeVisible();
        expect(screen.getByText(/"foo": "bar"/)).toBeVisible();
      });
    });
  });

  // -------------------------------------------------------------------------
  // State Persistence Tests
  // -------------------------------------------------------------------------

  describe('State Persistence', () => {
    it('auto-scroll toggle state changes correctly', () => {
      render(<LogViewer />);

      // Auto-scroll button should be enabled by default (blue background)
      const autoScrollButton = screen.getByRole('button', { name: 'Auto-scroll' });
      expect(autoScrollButton).toHaveClass('bg-blue-600');

      // Click to toggle off
      fireEvent.click(autoScrollButton);

      // Should now have gray background (not blue)
      expect(autoScrollButton).not.toHaveClass('bg-blue-600');
      expect(autoScrollButton).toHaveClass('bg-gray-200');

      // Click to toggle back on
      fireEvent.click(autoScrollButton);

      expect(autoScrollButton).toHaveClass('bg-blue-600');
    });

    it('filter count display shows "X / Y logs" accurately', () => {
      render(<LogViewer />);
      simulateConnect();

      // Add 5 logs
      simulateLog({ level: 'info', message: 'Info 1' });
      simulateLog({ level: 'info', message: 'Info 2' });
      simulateLog({ level: 'error', message: 'Error 1' });
      simulateLog({ level: 'error', message: 'Error 2' });
      simulateLog({ level: 'warn', message: 'Warn 1' });

      // All 5 visible
      expect(screen.getByText('5 / 5 logs')).toBeInTheDocument();

      // Filter to error only
      const levelSelect = screen.getByRole('combobox');
      fireEvent.change(levelSelect, { target: { value: 'error' } });

      // Should show 2 / 5 logs
      expect(screen.getByText('2 / 5 logs')).toBeInTheDocument();

      // Add text filter to narrow to 1
      const searchInput = screen.getByPlaceholderText('Filter logs...');
      fireEvent.change(searchInput, { target: { value: 'Error 1' } });

      // Should show 1 / 5 logs
      expect(screen.getByText('1 / 5 logs')).toBeInTheDocument();
    });
  });
});
