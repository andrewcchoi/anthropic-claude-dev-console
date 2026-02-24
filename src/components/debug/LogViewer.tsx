'use client';

/**
 * Log Viewer Component
 * Real-time log streaming viewer for debugging
 */

import { useState, useEffect, useRef } from 'react';
import { useDebug } from '../providers/DebugProvider';
import { type LogEntry } from '@/types/logger';
import { DebugToggle } from '@/components/ui/DebugToggle';
import { exportLogs, getLogStats, clearLogs as clearClientLogs } from '@/lib/logger/file-logger';

type LogTab = 'server' | 'client';

interface LogStats {
  entryCount: number;
  sizeBytes: number;
  oldestEntry?: string;
  newestEntry?: string;
}

const LOG_COLORS = {
  debug: 'text-gray-400 dark:text-gray-500',
  info: 'text-blue-600 dark:text-blue-400',
  warn: 'text-yellow-600 dark:text-yellow-400',
  error: 'text-red-600 dark:text-red-400',
};

const LOG_BG = {
  debug: 'bg-gray-100 dark:bg-gray-900/50',
  info: 'bg-blue-50 dark:bg-blue-900/20',
  warn: 'bg-yellow-50 dark:bg-yellow-900/20',
  error: 'bg-red-50 dark:bg-red-900/20',
};

export function LogViewer() {
  const { debugEnabled } = useDebug();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const logsEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const [activeTab, setActiveTab] = useState<LogTab>('server');
  const [clientLogs, setClientLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [totalReceived, setTotalReceived] = useState(0);

  // Connect to log stream
  useEffect(() => {
    if (!debugEnabled) return;

    const eventSource = new EventSource('/api/logs/stream');
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.onerror = () => {
      setConnected(false);
      eventSource.close();
    };

    eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'log') {
          setLogs((prev) => [...prev.slice(-999), message.log]);
          setTotalReceived((prev) => prev + 1);
        }
      } catch (error) {
        console.error('Failed to parse log message:', error);
      }
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [debugEnabled]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Load client logs when tab switches to client
  useEffect(() => {
    if (activeTab !== 'client') return;

    const loadClientLogs = async () => {
      try {
        // Load client logs from IndexedDB via exportLogs
        const jsonl = await exportLogs();
        if (jsonl) {
          const entries = jsonl
            .split('\n')
            .filter((line) => line.trim())
            .map((line) => JSON.parse(line) as LogEntry);
          setClientLogs(entries);
        } else {
          setClientLogs([]);
        }

        // Load stats
        const logStats = await getLogStats();
        setStats(logStats);
      } catch (error) {
        console.error('Failed to load client logs:', error);
        setClientLogs([]);
        setStats(null);
      }
    };

    loadClientLogs();
  }, [activeTab]);

  // Update stats for server tab
  useEffect(() => {
    if (activeTab !== 'server') return;

    setStats({
      entryCount: logs.length,
      sizeBytes: logs.length * 200, // Estimate
      oldestEntry: logs[0]?.timestamp,
      newestEntry: logs[logs.length - 1]?.timestamp,
    });
  }, [activeTab, logs]);

  // Use appropriate log source based on active tab
  const currentLogs = activeTab === 'server' ? logs : clientLogs;

  const filteredLogs = currentLogs.filter((log) => {
    // Level filter
    if (levelFilter !== 'all' && log.level !== levelFilter) {
      return false;
    }

    // Text filter
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

  // Filter client logs (same logic as server logs)
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

  // Get logs to display based on active tab
  const displayLogs = activeTab === 'server' ? filteredLogs : filteredClientLogs;
  const totalLogs = activeTab === 'server' ? logs.length : clientLogs.length;

  if (!debugEnabled) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-950 text-gray-500 dark:text-gray-500">
        <div className="text-center space-y-4">
          <p className="mb-2">Log viewer requires debug mode</p>
          <DebugToggle variant="full" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-950">
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
                onClick={() => {
                  // Force reload client logs
                  setActiveTab('server');
                  setTimeout(() => setActiveTab('client'), 0);
                }}
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
                    clearClientLogs().then(() => {
                      setClientLogs([]);
                      setStats({ entryCount: 0, sizeBytes: 0 });
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

      {/* Logs */}
      <div className="flex-1 overflow-auto p-2 space-y-1 font-mono text-xs">
        {displayLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-500 space-y-3">
            <div className="text-center">
              <p className="text-base font-medium mb-2">
                {totalLogs === 0 ? 'No logs yet' : 'No logs match filter'}
              </p>
              {totalLogs === 0 && activeTab === 'server' && (
                <p className="text-sm text-gray-400 dark:text-gray-600">
                  Trigger some activity (chat messages, API calls) to see logs appear
                </p>
              )}
              {totalLogs === 0 && activeTab === 'client' && (
                <p className="text-sm text-gray-400 dark:text-gray-600">
                  Enable debug mode and interact with the app to generate client logs
                </p>
              )}
            </div>
          </div>
        ) : (
          displayLogs.map((log, index) => (
            <div
              key={index}
              className={`p-2 rounded border border-gray-300 dark:border-gray-800 ${LOG_BG[log.level]}`}
            >
              <div className="flex items-start gap-2">
                <span className="text-gray-500 dark:text-gray-600">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className={`font-bold uppercase ${LOG_COLORS[log.level]}`}>
                  {log.level}
                </span>
                <span className="text-gray-600 dark:text-gray-400">[{log.module}]</span>
                <span className="text-gray-800 dark:text-gray-200 flex-1">{log.message}</span>
              </div>
              {log.correlationId && (
                <div className="mt-1 text-gray-500 dark:text-gray-600">
                  ID: {log.correlationId}
                </div>
              )}
              {log.data !== undefined && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-gray-600 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-400">
                    Show data
                  </summary>
                  <pre className="mt-1 text-gray-600 dark:text-gray-400 overflow-x-auto">
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}
