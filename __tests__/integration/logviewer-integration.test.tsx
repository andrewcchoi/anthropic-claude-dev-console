import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { LogViewer } from '@/components/debug/LogViewer';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

// Mock DebugProvider
let mockDebugEnabled = true;
vi.mock('@/components/providers/DebugProvider', () => ({
  useDebug: () => ({ debugEnabled: mockDebugEnabled }),
  DebugProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock DebugToggle
vi.mock('@/components/ui/DebugToggle', () => ({
  DebugToggle: () => <div data-testid="debug-toggle">Debug Toggle</div>,
}));

// Mock EventSource
const mockEventSource = {
  url: '',
  onopen: null as (() => void) | null,
  onerror: null as (() => void) | null,
  onmessage: null as ((event: { data: string }) => void) | null,
  close: vi.fn(),
};

class MockEventSource {
  constructor(url: string) {
    mockEventSource.url = url;
    mockEventSource.close.mockClear();
    setTimeout(() => mockEventSource.onopen?.(), 0);
  }
  set onopen(fn: (() => void) | null) { mockEventSource.onopen = fn; }
  set onerror(fn: (() => void) | null) { mockEventSource.onerror = fn; }
  set onmessage(fn: ((event: { data: string }) => void) | null) { mockEventSource.onmessage = fn; }
  close() { mockEventSource.close(); }
}

global.EventSource = MockEventSource as unknown as typeof EventSource;

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Mock toast
vi.mock('@/lib/utils/toast', () => ({
  showToast: vi.fn(),
}));

// Mock file-logger with real IndexedDB behavior
let mockLogEntries: Array<{
  level: string;
  module: string;
  message: string;
  timestamp: string;
}> = [];

vi.mock('@/lib/logger/file-logger', () => ({
  exportLogs: vi.fn().mockImplementation(async () => {
    if (mockLogEntries.length === 0) return '';
    return mockLogEntries.map(entry => JSON.stringify(entry)).join('\n');
  }),
  getLogStats: vi.fn().mockImplementation(async () => ({
    entryCount: mockLogEntries.length,
    sizeBytes: mockLogEntries.length * 200,
    oldestEntry: mockLogEntries[0]?.timestamp,
    newestEntry: mockLogEntries[mockLogEntries.length - 1]?.timestamp,
  })),
  clearLogs: vi.fn().mockImplementation(async () => {
    mockLogEntries = [];
  }),
  downloadLogs: vi.fn().mockResolvedValue(undefined),
  addLogEntry: vi.fn().mockImplementation((level: string, module: string, message: string) => {
    mockLogEntries.push({
      level,
      module,
      message,
      timestamp: new Date().toISOString(),
    });
  }),
}));

describe('LogViewer Integration Tests', { timeout: 30000 }, () => {
  beforeEach(async () => {
    // Reset mocks
    mockDebugEnabled = true;
    mockEventSource.url = '';
    mockEventSource.onopen = null;
    mockEventSource.onerror = null;
    mockEventSource.onmessage = null;
    mockEventSource.close.mockClear();
    mockLogEntries = [];

    // Reset IndexedDB
    global.indexedDB = new IDBFactory();

    // Reset file-logger mocks
    const fileLogger = await import('@/lib/logger/file-logger');
    vi.mocked(fileLogger.clearLogs).mockClear();
    vi.mocked(fileLogger.exportLogs).mockClear();
    vi.mocked(fileLogger.getLogStats).mockClear();
    vi.mocked(fileLogger.downloadLogs).mockClear();
    vi.mocked(fileLogger.addLogEntry).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('tab switching', () => {
    it('loads client logs when switching to client tab', async () => {
      // Add a log entry to our mock
      const { addLogEntry } = await import('@/lib/logger/file-logger');
      addLogEntry('info', 'Integration', 'Test log from IndexedDB');

      // Render and switch to client tab
      render(<LogViewer />);

      await waitFor(() => {
        expect(screen.getByText(/Client Logs/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/Client Logs/));

      // Should display the log from our mock
      await waitFor(() => {
        expect(screen.getByText(/Test log from IndexedDB/)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('shows empty state when no client logs exist', async () => {
      render(<LogViewer />);

      await waitFor(() => {
        expect(screen.getByText(/Client Logs/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/Client Logs/));

      // Should show empty state message
      await waitFor(() => {
        expect(screen.getByText(/No logs yet/)).toBeInTheDocument();
      });
    });

    it('updates stats when switching to client tab', async () => {
      // Add multiple log entries
      const { addLogEntry } = await import('@/lib/logger/file-logger');
      addLogEntry('info', 'Test1', 'First log');
      addLogEntry('debug', 'Test2', 'Second log');
      addLogEntry('warn', 'Test3', 'Third log');

      render(<LogViewer />);

      await waitFor(() => {
        expect(screen.getByText(/Client Logs/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/Client Logs/));

      // Should show stats with entry count
      await waitFor(() => {
        expect(screen.getByText(/3 entries/)).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('clear actions', () => {
    it('clears server logs without confirmation', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm');

      render(<LogViewer />);

      await waitFor(() => {
        expect(screen.getByText('Clear')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Clear'));

      // Server tab clear should NOT show confirmation
      expect(confirmSpy).not.toHaveBeenCalled();
    });

    it('shows confirmation for client logs clear', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(<LogViewer />);

      // Switch to client tab
      fireEvent.click(screen.getByText(/Client Logs/));

      await waitFor(() => {
        expect(screen.getByText(/Loaded from IndexedDB/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Clear'));

      // Client tab clear SHOULD show confirmation
      expect(confirmSpy).toHaveBeenCalledWith(
        'Clear all client logs? This cannot be undone.'
      );
    });

    it('clears client logs when confirmed', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      const { clearLogs, addLogEntry } = await import('@/lib/logger/file-logger');

      // Add a log entry
      addLogEntry('info', 'Test', 'Log to clear');

      render(<LogViewer />);

      // Switch to client tab
      fireEvent.click(screen.getByText(/Client Logs/));

      await waitFor(() => {
        expect(screen.getByText(/Log to clear/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Clear'));

      expect(confirmSpy).toHaveBeenCalled();

      // clearLogs should have been called
      await waitFor(() => {
        expect(clearLogs).toHaveBeenCalled();
      });
    });

    it('does not clear client logs when cancelled', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      const { clearLogs, addLogEntry } = await import('@/lib/logger/file-logger');

      // Add a log entry
      addLogEntry('info', 'Test', 'Log to keep');

      render(<LogViewer />);

      // Switch to client tab
      fireEvent.click(screen.getByText(/Client Logs/));

      await waitFor(() => {
        expect(screen.getByText(/Log to keep/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Clear'));

      expect(confirmSpy).toHaveBeenCalled();

      // clearLogs should NOT have been called
      expect(clearLogs).not.toHaveBeenCalled();
    });
  });

  describe('filtering', () => {
    it('filters client logs by text', async () => {
      const { addLogEntry } = await import('@/lib/logger/file-logger');
      addLogEntry('info', 'Module1', 'Apple log');
      addLogEntry('info', 'Module2', 'Banana log');
      addLogEntry('info', 'Module3', 'Cherry log');

      render(<LogViewer />);

      // Switch to client tab
      fireEvent.click(screen.getByText(/Client Logs/));

      await waitFor(() => {
        expect(screen.getByText(/Apple log/)).toBeInTheDocument();
        expect(screen.getByText(/Banana log/)).toBeInTheDocument();
        expect(screen.getByText(/Cherry log/)).toBeInTheDocument();
      });

      // Filter by text
      const filterInput = screen.getByPlaceholderText('Filter logs...');
      fireEvent.change(filterInput, { target: { value: 'Banana' } });

      // Should only show Banana
      await waitFor(() => {
        expect(screen.queryByText(/Apple log/)).not.toBeInTheDocument();
        expect(screen.getByText(/Banana log/)).toBeInTheDocument();
        expect(screen.queryByText(/Cherry log/)).not.toBeInTheDocument();
      });
    });

    it('filters client logs by level', async () => {
      const { addLogEntry } = await import('@/lib/logger/file-logger');
      addLogEntry('info', 'Module1', 'Info message');
      addLogEntry('warn', 'Module2', 'Warning message');
      addLogEntry('error', 'Module3', 'Error message');

      render(<LogViewer />);

      // Switch to client tab
      fireEvent.click(screen.getByText(/Client Logs/));

      await waitFor(() => {
        expect(screen.getByText(/Info message/)).toBeInTheDocument();
        expect(screen.getByText(/Warning message/)).toBeInTheDocument();
        expect(screen.getByText(/Error message/)).toBeInTheDocument();
      });

      // Filter by level
      const levelSelect = screen.getByDisplayValue('All Levels');
      fireEvent.change(levelSelect, { target: { value: 'error' } });

      // Should only show Error
      await waitFor(() => {
        expect(screen.queryByText(/Info message/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Warning message/)).not.toBeInTheDocument();
        expect(screen.getByText(/Error message/)).toBeInTheDocument();
      });
    });
  });

  describe('server logs via SSE', () => {
    it('receives logs from server stream', async () => {
      render(<LogViewer />);

      // Wait for connection
      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });

      // Simulate receiving a log message wrapped in act
      await act(async () => {
        mockEventSource.onmessage?.({
          data: JSON.stringify({
            type: 'log',
            log: {
              level: 'info',
              module: 'SSETest',
              message: 'Log from server stream',
              timestamp: new Date().toISOString(),
            },
          }),
        });
      });

      // Should display the log
      await waitFor(() => {
        expect(screen.getByText(/Log from server stream/)).toBeInTheDocument();
      });
    });

    it('updates log count when receiving messages', async () => {
      render(<LogViewer />);

      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });

      // Send 3 log messages wrapped in act
      await act(async () => {
        for (let i = 0; i < 3; i++) {
          mockEventSource.onmessage?.({
            data: JSON.stringify({
              type: 'log',
              log: {
                level: 'info',
                module: 'Counter',
                message: `Message ${i + 1}`,
                timestamp: new Date().toISOString(),
              },
            }),
          });
        }
      });

      // Server tab should show count
      await waitFor(() => {
        expect(screen.getByText(/Server Logs \(3\)/)).toBeInTheDocument();
      });
    });
  });
});
