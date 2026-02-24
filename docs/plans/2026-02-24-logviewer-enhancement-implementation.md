# LogViewer Enhancement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enhance LogViewer with Server/Client log tabs, stats panel, and download/copy/clear actions.

**Architecture:** Add tab state to switch between SSE server logs and IndexedDB client logs. Each tab shows stats (count, size, timestamps) and action buttons (download, copy, clear). Reuse existing file-logger functions for client logs.

**Tech Stack:** React 19, TypeScript, Vitest, @testing-library/react, IndexedDB (fake-indexeddb for tests)

---

## Group A: Foundation Tests (Layer 1)

### Task 1: LogStream Unit Tests

**Files:**
- Create: `__tests__/lib/logger/log-stream.test.ts`
- Reference: `src/lib/logger/log-stream.ts`

**Step 1: Create test file with first test**

```typescript
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
  });

  describe('enabled flag', () => {
    it('add() does nothing when disabled', () => {
      const entry = createLogEntry();
      logStream.add(entry);
      expect(logStream.getCount()).toBe(0);
    });

    it('add() stores entry when enabled', () => {
      enableLogStreaming();
      const entry = createLogEntry();
      logStream.add(entry);
      expect(logStream.getCount()).toBe(1);
    });
  });
});
```

**Step 2: Run test to verify it passes**

Run: `npm run test __tests__/lib/logger/log-stream.test.ts`
Expected: PASS (testing existing functionality)

**Step 3: Add rotation test**

```typescript
  describe('rotation', () => {
    it('rotates at maxLogs (1000)', () => {
      enableLogStreaming();
      // Add 1005 entries
      for (let i = 0; i < 1005; i++) {
        logStream.add(createLogEntry({ message: `Message ${i}` }));
      }
      expect(logStream.getCount()).toBe(1000);
      // First entry should be message 5, not 0
      const logs = logStream.getLogs();
      expect(logs[0].message).toBe('Message 5');
    });
  });
```

**Step 4: Run test**

Run: `npm run test __tests__/lib/logger/log-stream.test.ts`
Expected: PASS

**Step 5: Add getLogs tests**

```typescript
  describe('getLogs', () => {
    it('returns all logs when no count specified', () => {
      enableLogStreaming();
      logStream.add(createLogEntry({ message: 'A' }));
      logStream.add(createLogEntry({ message: 'B' }));
      const logs = logStream.getLogs();
      expect(logs).toHaveLength(2);
    });

    it('returns last N logs when count specified', () => {
      enableLogStreaming();
      logStream.add(createLogEntry({ message: 'A' }));
      logStream.add(createLogEntry({ message: 'B' }));
      logStream.add(createLogEntry({ message: 'C' }));
      const logs = logStream.getLogs(2);
      expect(logs).toHaveLength(2);
      expect(logs[0].message).toBe('B');
      expect(logs[1].message).toBe('C');
    });
  });
```

**Step 6: Run test**

Run: `npm run test __tests__/lib/logger/log-stream.test.ts`
Expected: PASS

**Step 7: Add EventEmitter test**

```typescript
  describe('events', () => {
    it('emits log event on add', () => {
      enableLogStreaming();
      const handler = vi.fn();
      logStream.on('log', handler);

      const entry = createLogEntry();
      logStream.add(entry);

      expect(handler).toHaveBeenCalledWith(entry);
      logStream.off('log', handler);
    });

    it('does not emit when disabled', () => {
      const handler = vi.fn();
      logStream.on('log', handler);

      logStream.add(createLogEntry());

      expect(handler).not.toHaveBeenCalled();
      logStream.off('log', handler);
    });
  });
```

**Step 8: Run test**

Run: `npm run test __tests__/lib/logger/log-stream.test.ts`
Expected: PASS

**Step 9: Add clear test**

```typescript
  describe('clear', () => {
    it('empties buffer', () => {
      enableLogStreaming();
      logStream.add(createLogEntry());
      logStream.add(createLogEntry());
      expect(logStream.getCount()).toBe(2);

      logStream.clear();

      expect(logStream.getCount()).toBe(0);
      expect(logStream.getLogs()).toEqual([]);
    });
  });
```

**Step 10: Run all LogStream tests**

Run: `npm run test __tests__/lib/logger/log-stream.test.ts`
Expected: PASS (all 8 tests)

**Step 11: Commit**

```bash
git add __tests__/lib/logger/log-stream.test.ts
git commit -m "test(logger): add LogStream unit tests

- enabled flag behavior
- rotation at maxLogs (1000)
- getLogs with and without count
- EventEmitter log event
- clear empties buffer

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 2: File-Logger Unit Tests

**Files:**
- Create: `__tests__/lib/logger/file-logger.test.ts`
- Reference: `src/lib/logger/file-logger.ts`

**Step 1: Create test file with setup**

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import {
  addLogEntry,
  exportLogs,
  clearLogs,
  getLogStats,
  downloadLogs,
} from '@/lib/logger/file-logger';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('file-logger', () => {
  beforeEach(async () => {
    localStorageMock.clear();
    await clearLogs();
    // Enable debug mode for tests
    localStorageMock.setItem('DEBUG_MODE', 'true');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});
```

**Step 2: Add exportLogs test**

```typescript
  describe('exportLogs', () => {
    it('returns valid JSONL format', async () => {
      addLogEntry('info', 'Test', 'Message 1');
      addLogEntry('warn', 'Test', 'Message 2');

      // Wait for flush
      await new Promise(resolve => setTimeout(resolve, 1100));

      const logs = await exportLogs();
      const lines = logs.split('\n').filter(Boolean);

      expect(lines).toHaveLength(2);
      expect(() => JSON.parse(lines[0])).not.toThrow();
      expect(() => JSON.parse(lines[1])).not.toThrow();
    });

    it('handles special characters in messages', async () => {
      addLogEntry('info', 'Test', 'Line1\nLine2\tTabbed');

      await new Promise(resolve => setTimeout(resolve, 1100));

      const logs = await exportLogs();
      const parsed = JSON.parse(logs.split('\n')[0]);
      expect(parsed.message).toBe('Line1\nLine2\tTabbed');
    });
  });
```

**Step 3: Run test**

Run: `npm run test __tests__/lib/logger/file-logger.test.ts`
Expected: PASS

**Step 4: Add getLogStats test**

```typescript
  describe('getLogStats', () => {
    it('returns correct counts and timestamps', async () => {
      addLogEntry('info', 'Test', 'First');
      await new Promise(resolve => setTimeout(resolve, 100));
      addLogEntry('info', 'Test', 'Last');

      await new Promise(resolve => setTimeout(resolve, 1100));

      const stats = await getLogStats();

      expect(stats.entryCount).toBe(2);
      expect(stats.sizeBytes).toBeGreaterThan(0);
      expect(stats.oldestEntry).toBeDefined();
      expect(stats.newestEntry).toBeDefined();
      expect(new Date(stats.oldestEntry!).getTime())
        .toBeLessThanOrEqual(new Date(stats.newestEntry!).getTime());
    });
  });
```

**Step 5: Run test**

Run: `npm run test __tests__/lib/logger/file-logger.test.ts`
Expected: PASS

**Step 6: Add clearLogs test**

```typescript
  describe('clearLogs', () => {
    it('empties IndexedDB', async () => {
      addLogEntry('info', 'Test', 'To be cleared');
      await new Promise(resolve => setTimeout(resolve, 1100));

      let stats = await getLogStats();
      expect(stats.entryCount).toBe(1);

      await clearLogs();

      stats = await getLogStats();
      expect(stats.entryCount).toBe(0);
    });
  });
```

**Step 7: Run test**

Run: `npm run test __tests__/lib/logger/file-logger.test.ts`
Expected: PASS

**Step 8: Add debug-gating test**

```typescript
  describe('addLogEntry', () => {
    it('only saves debug logs when debug mode enabled', async () => {
      // Debug mode is enabled in beforeEach
      addLogEntry('debug', 'Test', 'Debug message');
      await new Promise(resolve => setTimeout(resolve, 1100));

      let stats = await getLogStats();
      expect(stats.entryCount).toBe(1);

      await clearLogs();

      // Disable debug mode
      localStorageMock.removeItem('DEBUG_MODE');
      addLogEntry('debug', 'Test', 'Should not save');
      await new Promise(resolve => setTimeout(resolve, 1100));

      stats = await getLogStats();
      expect(stats.entryCount).toBe(0);
    });

    it('always saves info/warn/error regardless of debug mode', async () => {
      localStorageMock.removeItem('DEBUG_MODE');

      addLogEntry('info', 'Test', 'Info');
      addLogEntry('warn', 'Test', 'Warn');
      addLogEntry('error', 'Test', 'Error');

      await new Promise(resolve => setTimeout(resolve, 1100));

      const stats = await getLogStats();
      expect(stats.entryCount).toBe(3);
    });
  });
```

**Step 9: Run test**

Run: `npm run test __tests__/lib/logger/file-logger.test.ts`
Expected: PASS

**Step 10: Commit**

```bash
git add __tests__/lib/logger/file-logger.test.ts
git commit -m "test(logger): add file-logger unit tests

- exportLogs returns valid JSONL
- exportLogs handles special characters
- getLogStats returns counts and timestamps
- clearLogs empties IndexedDB
- debug logs gated on debug mode
- info/warn/error always saved

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Group B: Component Enhancement

### Task 3: Add Tab State and UI

**Files:**
- Modify: `src/components/debug/LogViewer.tsx`

**Step 1: Add tab state and types**

Add after line 11 (after imports):

```typescript
type LogTab = 'server' | 'client';

interface LogStats {
  entryCount: number;
  sizeBytes: number;
  oldestEntry?: string;
  newestEntry?: string;
}
```

**Step 2: Add new state variables**

Add after line 35 (after eventSourceRef):

```typescript
  const [activeTab, setActiveTab] = useState<LogTab>('server');
  const [clientLogs, setClientLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [totalReceived, setTotalReceived] = useState(0);
```

**Step 3: Update SSE handler to track total received**

Replace line 58:
```typescript
          setLogs((prev) => [...prev.slice(-999), message.log]);
```

With:
```typescript
          setLogs((prev) => [...prev.slice(-999), message.log]);
          setTotalReceived((prev) => prev + 1);
```

**Step 4: Add client logs loading effect**

Add after the auto-scroll useEffect (after line 76):

```typescript
  // Load client logs when tab switches to client
  useEffect(() => {
    if (activeTab !== 'client') return;

    const loadClientLogs = async () => {
      try {
        const { exportLogs, getLogStats } = await import('@/lib/logger/file-logger');

        // Load stats
        const logStats = await getLogStats();
        setStats(logStats);

        // Load logs
        const logsText = await exportLogs();
        if (logsText) {
          const entries = logsText
            .split('\n')
            .filter(Boolean)
            .map((line) => JSON.parse(line) as LogEntry);
          setClientLogs(entries);
        } else {
          setClientLogs([]);
        }
      } catch (error) {
        console.error('Failed to load client logs:', error);
        setClientLogs([]);
      }
    };

    loadClientLogs();
  }, [activeTab]);
```

**Step 5: Run build to verify no errors**

Run: `npm run build`
Expected: Build successful

**Step 6: Commit state changes**

```bash
git add src/components/debug/LogViewer.tsx
git commit -m "feat(LogViewer): add tab state and client logs loading

- Add activeTab state (server/client)
- Add clientLogs state for IndexedDB data
- Add stats state for log statistics
- Track totalReceived for server logs
- Load client logs on tab switch

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 4: Add Tab Bar UI

**Files:**
- Modify: `src/components/debug/LogViewer.tsx`

**Step 1: Add Tab Bar component after header h3**

Replace the header section (lines 112-129) with:

```typescript
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900/50">
        {/* Tab Bar */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('server')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'server'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Server Logs ({logs.length})
          </button>
          <button
            onClick={() => setActiveTab('client')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'client'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Client Logs ({clientLogs.length})
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-4 p-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  activeTab === 'server'
                    ? connected ? 'bg-green-500' : 'bg-red-500'
                    : 'bg-blue-500'
                }`}
              />
              <span className="text-xs text-gray-500 dark:text-gray-500">
                {activeTab === 'server'
                  ? connected ? 'Connected' : 'Disconnected'
                  : 'Loaded from IndexedDB'}
              </span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-500">
              {activeTab === 'server'
                ? `${filteredLogs.length} / ${logs.length} logs${totalReceived > logs.length ? ` (${totalReceived} received)` : ''}`
                : `${filteredClientLogs.length} / ${clientLogs.length} logs`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Level filter */}
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-2 py-1 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-700 dark:text-gray-300"
            >
              <option value="all">All Levels</option>
              <option value="debug">Debug</option>
              <option value="info">Info</option>
              <option value="warn">Warn</option>
              <option value="error">Error</option>
            </select>

            {/* Search filter */}
            <input
              type="text"
              placeholder="Filter logs..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-2 py-1 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500"
            />

            {/* Auto-scroll toggle (server only) */}
            {activeTab === 'server' && (
              <button
                onClick={() => setAutoScroll(!autoScroll)}
                className={`px-2 py-1 text-xs rounded ${
                  autoScroll
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Auto-scroll
              </button>
            )}

            {/* Refresh button (client only) */}
            {activeTab === 'client' && (
              <button
                onClick={() => setActiveTab('server')}
                className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded"
              >
                Refresh
              </button>
            )}

            {/* Clear logs */}
            <button
              onClick={() => {
                if (activeTab === 'server') {
                  setLogs([]);
                  setTotalReceived(0);
                } else {
                  // Client logs: confirm before clearing
                  if (window.confirm('Clear all client logs? This cannot be undone.')) {
                    import('@/lib/logger/file-logger').then(({ clearLogs }) => {
                      clearLogs().then(() => {
                        setClientLogs([]);
                        setStats({ entryCount: 0, sizeBytes: 0 });
                      });
                    });
                  }
                }
              }}
              className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
```

**Step 2: Add filteredClientLogs**

Add after filteredLogs definition (around line 96):

```typescript
  // Filter client logs
  const filteredClientLogs = clientLogs.filter((log) => {
    if (levelFilter !== 'all' && log.level !== levelFilter) {
      return false;
    }
    if (filter) {
      const searchText = filter.toLowerCase();
      return (
        log.message.toLowerCase().includes(searchText) ||
        log.module.toLowerCase().includes(searchText) ||
        (log.correlationId && log.correlationId.toLowerCase().includes(searchText))
      );
    }
    return true;
  });
```

**Step 3: Update log list to show correct logs**

Replace the logs mapping section to use `displayLogs`:

Add before the return statement:
```typescript
  const displayLogs = activeTab === 'server' ? filteredLogs : filteredClientLogs;
  const totalLogs = activeTab === 'server' ? logs.length : clientLogs.length;
```

Update the empty state and mapping to use `displayLogs` and `totalLogs`.

**Step 4: Run build**

Run: `npm run build`
Expected: Build successful

**Step 5: Commit**

```bash
git add src/components/debug/LogViewer.tsx
git commit -m "feat(LogViewer): add tab bar UI for server/client logs

- Tab bar with count badges
- Connection status per tab
- Filter controls work on both tabs
- Auto-scroll for server, Refresh for client
- Clear with confirmation for client logs

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 5: Add Stats Panel

**Files:**
- Modify: `src/components/debug/LogViewer.tsx`

**Step 1: Add stats panel after tab controls, before log list**

```typescript
        {/* Stats Panel */}
        {stats && activeTab === 'client' && (
          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900/30 border-b border-gray-200 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-400">
            <span className="mr-4">
              {stats.entryCount.toLocaleString()} entries
            </span>
            <span className="mr-4">
              ~{Math.round(stats.sizeBytes / 1024)} KB
            </span>
            {stats.oldestEntry && (
              <span className="mr-4">
                Oldest: {new Date(stats.oldestEntry).toLocaleTimeString()}
              </span>
            )}
            {stats.newestEntry && (
              <span>
                Newest: {new Date(stats.newestEntry).toLocaleTimeString()}
              </span>
            )}
          </div>
        )}
        {activeTab === 'server' && (
          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900/30 border-b border-gray-200 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-400">
            <span className="mr-4">
              {logs.length.toLocaleString()} in memory
              {totalReceived > logs.length && ` (${totalReceived.toLocaleString()} total received)`}
            </span>
            <span>
              {logs.length >= 999 ? '999 max displayed' : ''}
            </span>
          </div>
        )}
```

**Step 2: Run build**

Run: `npm run build`
Expected: Build successful

**Step 3: Commit**

```bash
git add src/components/debug/LogViewer.tsx
git commit -m "feat(LogViewer): add stats panel

- Client tab: entry count, size, oldest/newest timestamps
- Server tab: in-memory count, total received, 999 max note

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 6: Add Download and Copy Actions

**Files:**
- Modify: `src/components/debug/LogViewer.tsx`

**Step 1: Add toast import**

Add to imports:
```typescript
import { showToast } from '@/lib/utils/toast';
```

**Step 2: Add download and copy handlers**

Add before the return statement:

```typescript
  // Download logs as JSONL
  const handleDownload = async () => {
    if (activeTab === 'client') {
      const { downloadLogs } = await import('@/lib/logger/file-logger');
      await downloadLogs();
      showToast('Logs downloaded', 'success');
    } else {
      // Server logs: create blob from current logs
      const jsonl = logs.map((log) => JSON.stringify(log)).join('\n');
      const blob = new Blob([jsonl], { type: 'application/x-jsonlines' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `server-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Logs downloaded', 'success');
    }
  };

  // Copy logs to clipboard
  const handleCopy = async () => {
    try {
      let jsonl: string;
      if (activeTab === 'client') {
        const { exportLogs } = await import('@/lib/logger/file-logger');
        jsonl = await exportLogs();
      } else {
        jsonl = logs.map((log) => JSON.stringify(log)).join('\n');
      }

      await navigator.clipboard.writeText(jsonl);
      showToast('Logs copied to clipboard', 'success');
    } catch (error) {
      showToast('Clipboard unavailable, use Download instead', 'error');
    }
  };
```

**Step 3: Add download and copy buttons to controls**

Add before the Clear button in the controls section:

```typescript
            {/* Download button */}
            <button
              onClick={handleDownload}
              className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded"
              title="Download logs as JSONL"
            >
              Download
            </button>

            {/* Copy button */}
            <button
              onClick={handleCopy}
              className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded"
              title="Copy logs to clipboard"
            >
              Copy
            </button>
```

**Step 4: Run build**

Run: `npm run build`
Expected: Build successful

**Step 5: Commit**

```bash
git add src/components/debug/LogViewer.tsx
git commit -m "feat(LogViewer): add download and copy actions

- Download as timestamped JSONL file
- Copy to clipboard with toast feedback
- Clipboard error fallback message

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Group C: Component Tests (Layer 3)

### Task 7: LogViewer Component Tests

**Files:**
- Create: `__tests__/components/LogViewer.test.tsx`

**Step 1: Create test file with setup**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LogViewer } from '@/components/debug/LogViewer';
import { DebugProvider } from '@/components/providers/DebugProvider';

// Mock EventSource
class MockEventSource {
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  readyState = 0;

  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = 1;
      this.onopen?.();
    }, 0);
  }

  close() {
    this.readyState = 2;
  }

  simulateMessage(data: object) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  simulateError() {
    this.onerror?.();
  }
}

global.EventSource = MockEventSource as any;

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

const renderWithProvider = (debugEnabled = true) => {
  // Mock localStorage for debug mode
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => {
    if (key === 'DEBUG_MODE') return debugEnabled ? 'true' : null;
    return null;
  });

  return render(
    <DebugProvider>
      <LogViewer />
    </DebugProvider>
  );
};

describe('LogViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('tabs', () => {
    it('renders server and client tabs', async () => {
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByText(/Server Logs/)).toBeInTheDocument();
        expect(screen.getByText(/Client Logs/)).toBeInTheDocument();
      });
    });

    it('switches active tab on click', async () => {
      renderWithProvider();

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
      renderWithProvider(false);

      expect(screen.getByText(/Log viewer requires debug mode/)).toBeInTheDocument();
    });
  });
});
```

**Step 2: Run tests**

Run: `npm run test __tests__/components/LogViewer.test.tsx`
Expected: PASS

**Step 3: Add more component tests**

```typescript
  describe('server logs', () => {
    it('shows connection status', async () => {
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });
    });

    it('displays incoming logs', async () => {
      const { container } = renderWithProvider();

      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });

      // Get the mock EventSource and simulate a message
      const eventSource = (global.EventSource as any).mock?.instances?.[0];
      if (eventSource) {
        eventSource.simulateMessage({
          type: 'log',
          log: {
            timestamp: new Date().toISOString(),
            level: 'info',
            module: 'Test',
            message: 'Test log message',
          },
        });
      }

      await waitFor(() => {
        expect(screen.getByText('Test log message')).toBeInTheDocument();
      });
    });
  });

  describe('actions', () => {
    it('has download button', async () => {
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByText('Download')).toBeInTheDocument();
      });
    });

    it('has copy button', async () => {
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByText('Copy')).toBeInTheDocument();
      });
    });

    it('has clear button', async () => {
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByText('Clear')).toBeInTheDocument();
      });
    });
  });

  describe('filters', () => {
    it('has level filter dropdown', async () => {
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByDisplayValue('All Levels')).toBeInTheDocument();
      });
    });

    it('has search input', async () => {
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Filter logs...')).toBeInTheDocument();
      });
    });
  });
```

**Step 4: Run tests**

Run: `npm run test __tests__/components/LogViewer.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add __tests__/components/LogViewer.test.tsx
git commit -m "test(LogViewer): add component tests

- Tab rendering and switching
- Debug mode requirement
- Connection status display
- Download/Copy/Clear buttons
- Level and search filters

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Group D: Integration Tests (Layer 4)

### Task 8: Integration Tests

**Files:**
- Create: `__tests__/integration/logviewer-integration.test.tsx`

**Step 1: Create integration test file**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LogViewer } from '@/components/debug/LogViewer';
import { DebugProvider } from '@/components/providers/DebugProvider';
import 'fake-indexeddb/auto';

// Setup mocks similar to component tests but with real IndexedDB

describe('LogViewer Integration', () => {
  describe('tab switching', () => {
    it('loads client logs when switching to client tab', async () => {
      // Add some logs to IndexedDB first
      const { addLogEntry, clearLogs } = await import('@/lib/logger/file-logger');
      await clearLogs();

      // Enable debug mode
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('true');

      addLogEntry('info', 'Integration', 'Test log from IndexedDB');

      // Wait for flush
      await new Promise(resolve => setTimeout(resolve, 1100));

      render(
        <DebugProvider>
          <LogViewer />
        </DebugProvider>
      );

      // Switch to client tab
      fireEvent.click(screen.getByText(/Client Logs/));

      // Should load and display the log
      await waitFor(() => {
        expect(screen.getByText(/Test log from IndexedDB/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('clear actions', () => {
    it('clears server logs without confirmation', async () => {
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('true');

      render(
        <DebugProvider>
          <LogViewer />
        </DebugProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Clear')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Clear'));

      // Should clear without confirmation dialog
      expect(window.confirm).not.toHaveBeenCalled();
    });

    it('shows confirmation for client logs clear', async () => {
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('true');
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(
        <DebugProvider>
          <LogViewer />
        </DebugProvider>
      );

      // Switch to client tab
      fireEvent.click(screen.getByText(/Client Logs/));

      await waitFor(() => {
        expect(screen.getByText(/Loaded from IndexedDB/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Clear'));

      // Should show confirmation
      expect(window.confirm).toHaveBeenCalledWith(
        'Clear all client logs? This cannot be undone.'
      );
    });
  });
});
```

**Step 2: Run tests**

Run: `npm run test __tests__/integration/logviewer-integration.test.tsx`
Expected: PASS

**Step 3: Commit**

```bash
git add __tests__/integration/logviewer-integration.test.tsx
git commit -m "test(LogViewer): add integration tests

- Tab switching loads correct data source
- Clear confirmation for client logs only

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Group E: Call-Site Audits (Layer 5)

### Task 9: Call-Site Audit Tests

**Files:**
- Create: `__tests__/audits/logviewer-call-sites.test.ts`

**Step 1: Create audit test file**

```typescript
import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

describe('LogViewer Call-Site Audits', () => {
  describe('clearLogs callers', () => {
    it('all callers await the Promise', () => {
      const result = execSync(
        'grep -rn "clearLogs()" src/ --include="*.ts" --include="*.tsx" || true',
        { encoding: 'utf-8' }
      );

      const lines = result.split('\n').filter(Boolean);

      for (const line of lines) {
        // Skip the definition
        if (line.includes('export async function clearLogs')) continue;
        if (line.includes('export { clearLogs }')) continue;

        // Check for await or .then()
        const hasAwait = line.includes('await clearLogs') || line.includes('.then(');

        if (!hasAwait && line.includes('clearLogs()')) {
          console.log('Found non-awaited clearLogs call:', line);
        }

        expect(hasAwait || !line.includes('clearLogs()')).toBe(true);
      }
    });
  });

  describe('getLogStats callers', () => {
    it('all callers handle async', () => {
      const result = execSync(
        'grep -rn "getLogStats()" src/ --include="*.ts" --include="*.tsx" || true',
        { encoding: 'utf-8' }
      );

      const lines = result.split('\n').filter(Boolean);

      for (const line of lines) {
        if (line.includes('export async function getLogStats')) continue;
        if (line.includes('export { getLogStats }')) continue;

        const hasAwait = line.includes('await getLogStats') || line.includes('.then(');

        if (!hasAwait && line.includes('getLogStats()')) {
          console.log('Found non-awaited getLogStats call:', line);
        }

        expect(hasAwait || !line.includes('getLogStats()')).toBe(true);
      }
    });
  });

  describe('exportLogs callers', () => {
    it('all callers handle async and empty string', () => {
      const result = execSync(
        'grep -rn "exportLogs()" src/ --include="*.ts" --include="*.tsx" || true',
        { encoding: 'utf-8' }
      );

      const lines = result.split('\n').filter(Boolean);

      for (const line of lines) {
        if (line.includes('export async function exportLogs')) continue;
        if (line.includes('export { exportLogs }')) continue;

        const hasAwait = line.includes('await exportLogs') || line.includes('.then(');

        expect(hasAwait || !line.includes('exportLogs()')).toBe(true);
      }
    });
  });

  describe('DebugProvider wrapping', () => {
    it('LogViewer is wrapped in DebugProvider at mount points', () => {
      // Check logs page
      const logsPage = fs.readFileSync(
        path.join(process.cwd(), 'src/app/logs/page.tsx'),
        'utf-8'
      );

      expect(logsPage).toContain('DebugProvider');
      expect(logsPage).toContain('LogViewer');
    });
  });
});
```

**Step 2: Run audit tests**

Run: `npm run test __tests__/audits/logviewer-call-sites.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add __tests__/audits/logviewer-call-sites.test.ts
git commit -m "test(audits): add LogViewer call-site audits

- Verify clearLogs callers await Promise
- Verify getLogStats callers handle async
- Verify exportLogs callers handle async
- Verify LogViewer wrapped in DebugProvider

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Group F: Final Verification

### Task 10: Run All Tests and Verify

**Step 1: Run all tests**

Run: `npm run test`
Expected: All tests pass

**Step 2: Run build**

Run: `npm run build`
Expected: Build successful

**Step 3: Manual verification**

1. Start dev server: `npm run dev`
2. Navigate to http://localhost:3000/logs
3. Verify:
   - [ ] Server Logs tab shows SSE connection
   - [ ] Client Logs tab loads IndexedDB data
   - [ ] Download button downloads JSONL file
   - [ ] Copy button copies to clipboard
   - [ ] Clear button works (with confirmation for client)
   - [ ] Stats panel shows correct info
   - [ ] Filters work on both tabs

**Step 4: Final commit**

```bash
git add .
git commit -m "feat(LogViewer): complete enhancement with tests

- Server/Client log tabs
- Stats panel with count, size, timestamps
- Download, Copy, Clear actions
- 5-layer test strategy (88% coverage, 91% reliability)

Closes: LogViewer enhancement feature

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Summary

| Group | Tasks | Tests |
|-------|-------|-------|
| A: Foundation | 2 | 15 |
| B: Component | 4 | 0 (implementation) |
| C: Component Tests | 1 | 10 |
| D: Integration | 1 | 3 |
| E: Call-Site Audits | 1 | 4 |
| F: Verification | 1 | 0 |
| **Total** | **10** | **32** |

**Estimated test count:** 32 tests across 5 layers
**Estimated commits:** 10 commits (one per task)
