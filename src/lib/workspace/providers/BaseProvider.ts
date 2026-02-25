/**
 * BaseProvider
 * Abstract base class with shared functionality for all providers
 */

import { WorkspaceProvider } from '../WorkspaceProvider';
import {
  ProviderType,
  FileEntry,
  FileStat,
  ExecOptions,
  ExecResult,
  WatchCallback,
  Disposable,
  GitStatus,
} from '../types';
import { WorkspaceError, wrapError } from '../errors';
import { PathValidator } from '../security/PathValidator';
import { FileLockManager } from '../security/FileLockManager';
import { CommandValidator, commandValidator } from '../security/CommandValidator';

export interface BaseProviderConfig {
  id: string;
  name: string;
  rootPath: string;
}

/**
 * Abstract base provider with shared functionality
 */
export abstract class BaseProvider implements WorkspaceProvider {
  abstract readonly type: ProviderType;

  readonly id: string;
  readonly name: string;
  readonly rootPath: string;

  protected pathValidator: PathValidator;
  protected fileLocks: FileLockManager;
  protected commandValidator: CommandValidator;
  protected _connected: boolean = false;

  constructor(config: BaseProviderConfig) {
    this.id = config.id;
    this.name = config.name;
    this.rootPath = config.rootPath;
    this.pathValidator = new PathValidator(config.rootPath);
    this.fileLocks = new FileLockManager(config.id);
    this.commandValidator = commandValidator;
  }

  // ============================================================================
  // Lifecycle (must be implemented by subclasses)
  // ============================================================================

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;

  isConnected(): boolean {
    return this._connected;
  }

  // ============================================================================
  // File Operations (must be implemented by subclasses)
  // ============================================================================

  abstract readFile(path: string): Promise<Buffer>;
  abstract writeFile(path: string, content: Buffer): Promise<void>;
  abstract deleteFile(path: string): Promise<void>;
  abstract listDirectory(path: string): Promise<FileEntry[]>;
  abstract stat(path: string): Promise<FileStat>;
  abstract exists(path: string): Promise<boolean>;

  // ============================================================================
  // Directory Operations (must be implemented by subclasses)
  // ============================================================================

  abstract createDirectory(path: string): Promise<void>;
  abstract deleteDirectory(path: string, recursive?: boolean): Promise<void>;

  // ============================================================================
  // Execution (must be implemented by subclasses)
  // ============================================================================

  abstract exec(command: string, options?: ExecOptions): Promise<ExecResult>;

  // ============================================================================
  // Optional Features (can be overridden by subclasses)
  // ============================================================================

  watch?(path: string, callback: WatchCallback): Disposable;
  gitStatus?(): Promise<GitStatus>;
  gitBranch?(): Promise<string>;

  // ============================================================================
  // Shared Utilities
  // ============================================================================

  /**
   * Validate and resolve a path
   */
  protected async validatePath(path: string): Promise<string> {
    return this.pathValidator.validate(path);
  }

  /**
   * Execute with file lock
   */
  protected async withLock<T>(
    path: string,
    operation: () => Promise<T>
  ): Promise<T> {
    return this.fileLocks.withLock(path, operation);
  }

  /**
   * Validate a command before execution
   */
  protected validateCommand(command: string): void {
    this.commandValidator.assertAllowed(command);
  }

  /**
   * Wrap an operation with error handling
   */
  protected async wrapOperation<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      throw wrapError(error, operation, this.id);
    }
  }

  /**
   * Retry an operation with exponential backoff
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number;
      initialDelayMs?: number;
      maxDelayMs?: number;
      shouldRetry?: (error: unknown) => boolean;
    } = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      initialDelayMs = 1000,
      maxDelayMs = 10000,
      shouldRetry = () => true,
    } = options;

    let lastError: unknown;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (!shouldRetry(error) || attempt === maxRetries - 1) {
          throw error;
        }

        const delay = Math.min(
          initialDelayMs * Math.pow(2, attempt),
          maxDelayMs
        );
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Sleep helper
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log helper (can be overridden for custom logging)
   */
  protected log(level: 'debug' | 'info' | 'warn' | 'error', message: string, context?: object): void {
    const prefix = `[${this.type}:${this.id}]`;
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';

    switch (level) {
      case 'debug':
        console.debug(`${prefix} ${message}${contextStr}`);
        break;
      case 'info':
        console.info(`${prefix} ${message}${contextStr}`);
        break;
      case 'warn':
        console.warn(`${prefix} ${message}${contextStr}`);
        break;
      case 'error':
        console.error(`${prefix} ${message}${contextStr}`);
        break;
    }
  }

  /**
   * Cleanup resources on disconnect
   */
  protected cleanup(): void {
    this.fileLocks.releaseAll();
    this._connected = false;
  }
}
