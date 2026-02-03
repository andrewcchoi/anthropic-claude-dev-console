/**
 * Centralized logging system with level control and environment-aware formatting
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogFormat = 'pretty' | 'json';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LOG_COLORS: Record<LogLevel, string> = {
  debug: '#6B7280', // gray
  info: '#3B82F6',  // blue
  warn: '#F59E0B',  // yellow
  error: '#EF4444', // red
};

class Logger {
  private minLevel: number;
  private format: LogFormat;
  private debugMode: boolean;

  constructor() {
    // Browser: check localStorage, Node: check env var
    this.debugMode = typeof window !== 'undefined'
      ? localStorage.getItem('DEBUG_MODE') === 'true'
      : false;

    // Determine log level
    const envLevel = typeof process !== 'undefined'
      ? process.env.LOG_LEVEL
      : null;
    const level = (this.debugMode ? 'debug' : envLevel || 'info') as LogLevel;
    this.minLevel = LOG_LEVELS[level] ?? LOG_LEVELS.info;

    // Determine format
    const envFormat = typeof process !== 'undefined'
      ? process.env.LOG_FORMAT
      : null;
    const isDev = typeof process !== 'undefined'
      ? process.env.NODE_ENV === 'development'
      : true;
    this.format = (envFormat || (isDev ? 'pretty' : 'json')) as LogFormat;
  }

  private shouldLog(level: LogLevel): boolean {
    // Dynamically check debug mode on each call (handles SSR + runtime changes)
    const debugMode = typeof window !== 'undefined'
      ? localStorage.getItem('DEBUG_MODE') === 'true'
      : false;

    const effectiveMinLevel = debugMode ? LOG_LEVELS.debug : this.minLevel;
    return LOG_LEVELS[level] >= effectiveMinLevel;
  }

  private formatEntry(entry: LogEntry): void {
    if (typeof window !== 'undefined') {
      // Browser: colored badges with collapsible groups
      this.formatBrowser(entry);
    } else if (this.format === 'json') {
      // Server: JSON structured logging
      console.log(JSON.stringify(entry));
    } else {
      // Server: pretty format
      this.formatPretty(entry);
    }
  }

  private formatBrowser(entry: LogEntry): void {
    const color = LOG_COLORS[entry.level];
    const badge = `%c${entry.level.toUpperCase()}%c`;
    const badgeStyle = `background: ${color}; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;`;
    const resetStyle = '';

    if (entry.data !== undefined) {
      console.groupCollapsed(
        `${badge} [${entry.module}] ${entry.message}`,
        badgeStyle,
        resetStyle
      );
      console.log(entry.data);
      console.groupEnd();
    } else {
      console.log(
        `${badge} [${entry.module}] ${entry.message}`,
        badgeStyle,
        resetStyle
      );
    }
  }

  private formatPretty(entry: LogEntry): void {
    const levelStr = entry.level.toUpperCase().padEnd(5);
    const dataStr = entry.data !== undefined
      ? ' ' + JSON.stringify(entry.data)
      : '';
    console.log(
      `[${entry.timestamp}] [${levelStr}] [${entry.module}] ${entry.message}${dataStr}`
    );
  }

  private log(level: LogLevel, module: string, message: string, data?: unknown): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      data,
    };

    this.formatEntry(entry);
  }

  public debug(module: string, message: string, data?: unknown): void {
    this.log('debug', module, message, data);
  }

  public info(module: string, message: string, data?: unknown): void {
    this.log('info', module, message, data);
  }

  public warn(module: string, message: string, data?: unknown): void {
    this.log('warn', module, message, data);
  }

  public error(module: string, message: string, data?: unknown): void {
    this.log('error', module, message, data);
  }

  /**
   * Time a function execution
   */
  public time(module: string, label: string): () => void {
    const start = Date.now();
    this.debug(module, `${label} started`);

    return () => {
      const duration = Date.now() - start;
      this.debug(module, `${label} completed`, { durationMs: duration });
    };
  }

  /**
   * Create a scoped logger for a specific module
   */
  public scope(module: string) {
    return {
      debug: (message: string, data?: unknown) => this.debug(module, message, data),
      info: (message: string, data?: unknown) => this.info(module, message, data),
      warn: (message: string, data?: unknown) => this.warn(module, message, data),
      error: (message: string, data?: unknown) => this.error(module, message, data),
      time: (label: string) => this.time(module, label),
    };
  }
}

// Singleton instance
export const logger = new Logger();

// Export convenience function for creating scoped loggers
export function createLogger(module: string) {
  return logger.scope(module);
}
