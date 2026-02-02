/**
 * Server-side JSON structured logging
 * Always outputs JSON format for production log aggregation
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface ServerLogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: unknown;
  correlationId?: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class ServerLogger {
  private minLevel: number;

  constructor() {
    const envLevel = (process.env.LOG_LEVEL || 'info') as LogLevel;
    this.minLevel = LOG_LEVELS[envLevel] ?? LOG_LEVELS.info;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= this.minLevel;
  }

  private log(
    level: LogLevel,
    module: string,
    message: string,
    data?: unknown,
    correlationId?: string
  ): void {
    if (!this.shouldLog(level)) return;

    const entry: ServerLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
    };

    if (data !== undefined) {
      entry.data = data;
    }

    if (correlationId) {
      entry.correlationId = correlationId;
    }

    // Always JSON for server logs
    console.log(JSON.stringify(entry));
  }

  public debug(module: string, message: string, data?: unknown, correlationId?: string): void {
    this.log('debug', module, message, data, correlationId);
  }

  public info(module: string, message: string, data?: unknown, correlationId?: string): void {
    this.log('info', module, message, data, correlationId);
  }

  public warn(module: string, message: string, data?: unknown, correlationId?: string): void {
    this.log('warn', module, message, data, correlationId);
  }

  public error(module: string, message: string, data?: unknown, correlationId?: string): void {
    this.log('error', module, message, data, correlationId);
  }

  /**
   * Time a function execution with correlation ID
   */
  public time(module: string, label: string, correlationId?: string): () => void {
    const start = Date.now();
    this.debug(module, `${label} started`, undefined, correlationId);

    return () => {
      const duration = Date.now() - start;
      this.debug(module, `${label} completed`, { durationMs: duration }, correlationId);
    };
  }

  /**
   * Create a scoped logger for a specific module
   */
  public scope(module: string, correlationId?: string) {
    return {
      debug: (message: string, data?: unknown) =>
        this.debug(module, message, data, correlationId),
      info: (message: string, data?: unknown) =>
        this.info(module, message, data, correlationId),
      warn: (message: string, data?: unknown) =>
        this.warn(module, message, data, correlationId),
      error: (message: string, data?: unknown) =>
        this.error(module, message, data, correlationId),
      time: (label: string) =>
        this.time(module, label, correlationId),
    };
  }
}

// Singleton instance
export const serverLogger = new ServerLogger();

// Export convenience function for creating scoped loggers
export function createServerLogger(module: string, correlationId?: string) {
  return serverLogger.scope(module, correlationId);
}
