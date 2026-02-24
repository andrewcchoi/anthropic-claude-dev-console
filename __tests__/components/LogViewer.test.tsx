import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LogViewer } from '@/components/debug/LogViewer';

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
    setTimeout(() => {
      mockEventSource.onopen?.();
    }, 0);
  }
  set onopen(fn: (() => void) | null) { mockEventSource.onopen = fn; }
  set onerror(fn: (() => void) | null) { mockEventSource.onerror = fn; }
  set onmessage(fn: ((event: { data: string }) => void) | null) { mockEventSource.onmessage = fn; }
  close() { mockEventSource.close(); }
}

global.EventSource = MockEventSource as unknown as typeof EventSource;

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Mock file-logger
vi.mock('@/lib/logger/file-logger', () => ({
  exportLogs: vi.fn().mockResolvedValue(''),
  getLogStats: vi.fn().mockResolvedValue({ entryCount: 0, sizeBytes: 0 }),
  clearLogs: vi.fn().mockResolvedValue(undefined),
  downloadLogs: vi.fn().mockResolvedValue(undefined),
}));

// Mock toast
vi.mock('@/lib/utils/toast', () => ({
  showToast: vi.fn(),
}));

describe('LogViewer Component Tests', () => {
  beforeEach(() => {
    mockDebugEnabled = true;
    mockEventSource.url = '';
    mockEventSource.onopen = null;
    mockEventSource.onerror = null;
    mockEventSource.onmessage = null;
    mockEventSource.close.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('tabs', () => {
    it('renders server and client tabs', async () => {
      render(<LogViewer />);

      await waitFor(() => {
        expect(screen.getByText(/Server Logs/)).toBeInTheDocument();
        expect(screen.getByText(/Client Logs/)).toBeInTheDocument();
      });
    });

    it('switches active tab on click', async () => {
      render(<LogViewer />);

      await waitFor(() => {
        expect(screen.getByText(/Server Logs/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/Client Logs/));

      // Client tab should show "Loaded from IndexedDB"
      await waitFor(() => {
        expect(screen.getByText(/Loaded from IndexedDB/)).toBeInTheDocument();
      });
    });
  });

  describe('debug mode required', () => {
    it('shows enable debug message when debug disabled', () => {
      mockDebugEnabled = false;
      render(<LogViewer />);

      expect(screen.getByText(/Log viewer requires debug mode/)).toBeInTheDocument();
    });

    it('does not connect SSE when debug disabled', () => {
      mockDebugEnabled = false;
      render(<LogViewer />);

      expect(mockEventSource.url).toBe('');
    });
  });

  describe('server logs', () => {
    it('shows connection status', async () => {
      render(<LogViewer />);

      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });
    });
  });

  describe('actions', () => {
    it('has download button', async () => {
      render(<LogViewer />);

      await waitFor(() => {
        expect(screen.getByText('Download')).toBeInTheDocument();
      });
    });

    it('has copy button', async () => {
      render(<LogViewer />);

      await waitFor(() => {
        expect(screen.getByText('Copy')).toBeInTheDocument();
      });
    });

    it('has clear button', async () => {
      render(<LogViewer />);

      await waitFor(() => {
        expect(screen.getByText('Clear')).toBeInTheDocument();
      });
    });
  });

  describe('filters', () => {
    it('has level filter dropdown', async () => {
      render(<LogViewer />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('All Levels')).toBeInTheDocument();
      });
    });

    it('has search input', async () => {
      render(<LogViewer />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Filter logs...')).toBeInTheDocument();
      });
    });
  });

  describe('stats panel', () => {
    it('shows server stats when on server tab', async () => {
      render(<LogViewer />);

      await waitFor(() => {
        expect(screen.getByText(/in memory/)).toBeInTheDocument();
      });
    });

    it('shows client stats when on client tab', async () => {
      const { getLogStats } = await import('@/lib/logger/file-logger');
      (getLogStats as ReturnType<typeof vi.fn>).mockResolvedValue({
        entryCount: 100,
        sizeBytes: 20000,
        oldestEntry: '2026-01-01T10:00:00Z',
        newestEntry: '2026-01-01T11:00:00Z',
      });

      render(<LogViewer />);

      await waitFor(() => {
        expect(screen.getByText(/Server Logs/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/Client Logs/));

      await waitFor(() => {
        expect(screen.getByText(/100 entries/)).toBeInTheDocument();
      });
    });
  });
});
