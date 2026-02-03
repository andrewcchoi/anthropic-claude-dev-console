'use client';

/**
 * Log Viewer Component
 * Real-time log streaming viewer for debugging
 */

import { useState, useEffect, useRef } from 'react';
import { useDebug } from '../providers/DebugProvider';

interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  module: string;
  message: string;
  data?: unknown;
  correlationId?: string;
}

const LOG_COLORS = {
  debug: 'text-gray-500',
  info: 'text-blue-400',
  warn: 'text-yellow-400',
  error: 'text-red-400',
};

const LOG_BG = {
  debug: 'bg-gray-900/50',
  info: 'bg-blue-900/20',
  warn: 'bg-yellow-900/20',
  error: 'bg-red-900/20',
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

  // Filter logs
  const filteredLogs = logs.filter((log) => {
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

  if (!debugEnabled) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-950 text-gray-500">
        <div className="text-center">
          <p className="mb-2">Log viewer requires debug mode</p>
          <p className="text-sm">
            Type <code className="text-green-400">enableDebug()</code> in the console
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-950">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-800 bg-gray-900/50 p-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-gray-200">Log Viewer</h3>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  connected ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className="text-xs text-gray-500">
                {connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {filteredLogs.length} / {logs.length} logs
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Level filter */}
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-gray-300"
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
              className="px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-gray-300 placeholder-gray-500"
            />

            {/* Auto-scroll toggle */}
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`px-2 py-1 text-xs rounded ${
                autoScroll
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300'
              }`}
            >
              Auto-scroll
            </button>

            {/* Clear logs */}
            <button
              onClick={() => setLogs([])}
              className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-auto p-2 space-y-1 font-mono text-xs">
        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-600">
            {logs.length === 0 ? 'No logs yet...' : 'No logs match filter'}
          </div>
        ) : (
          filteredLogs.map((log, index) => (
            <div
              key={index}
              className={`p-2 rounded border border-gray-800 ${LOG_BG[log.level]}`}
            >
              <div className="flex items-start gap-2">
                <span className="text-gray-600">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className={`font-bold uppercase ${LOG_COLORS[log.level]}`}>
                  {log.level}
                </span>
                <span className="text-gray-400">[{log.module}]</span>
                <span className="text-gray-200 flex-1">{log.message}</span>
              </div>
              {log.correlationId && (
                <div className="mt-1 text-gray-600">
                  ID: {log.correlationId}
                </div>
              )}
              {log.data !== undefined && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-gray-500 hover:text-gray-400">
                    Show data
                  </summary>
                  <pre className="mt-1 text-gray-400 overflow-x-auto">
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
