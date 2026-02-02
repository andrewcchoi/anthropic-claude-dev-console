/**
 * Log Stream
 * Collects and broadcasts logs via WebSocket for real-time viewing
 */

import { EventEmitter } from 'events';

export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  module: string;
  message: string;
  data?: unknown;
  correlationId?: string;
}

class LogStream extends EventEmitter {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private enabled = false;

  constructor() {
    super();
  }

  /**
   * Enable log streaming
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * Disable log streaming
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * Check if streaming is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Add a log entry to the stream
   */
  add(entry: LogEntry): void {
    if (!this.enabled) return;

    // Add to buffer
    this.logs.push(entry);

    // Trim buffer if too large
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Emit to listeners
    this.emit('log', entry);
  }

  /**
   * Get recent logs
   */
  getLogs(count?: number): LogEntry[] {
    if (count) {
      return this.logs.slice(-count);
    }
    return [...this.logs];
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * Get log count
   */
  getCount(): number {
    return this.logs.length;
  }
}

// Singleton instance
export const logStream = new LogStream();

/**
 * Enable log streaming globally
 * Call this in server startup to enable log collection
 */
export function enableLogStreaming(): void {
  logStream.enable();
}

/**
 * Disable log streaming globally
 */
export function disableLogStreaming(): void {
  logStream.disable();
}
