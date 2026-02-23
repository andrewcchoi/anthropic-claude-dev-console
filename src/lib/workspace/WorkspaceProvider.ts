/**
 * WorkspaceProvider Interface
 * Abstract interface that all workspace providers must implement
 */

import {
  ProviderType,
  FileEntry,
  FileStat,
  ExecOptions,
  ExecResult,
  WatchCallback,
  Disposable,
  GitStatus,
  ProviderConfig,
} from './types';

/**
 * Core interface for workspace providers
 * All providers (Local, Git, SSH) must implement this interface
 */
export interface WorkspaceProvider {
  // ============================================================================
  // Identity
  // ============================================================================

  /** Provider type identifier */
  readonly type: ProviderType;

  /** Unique provider instance ID */
  readonly id: string;

  /** Human-readable name */
  readonly name: string;

  /** Root path for this workspace */
  readonly rootPath: string;

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /**
   * Establish connection to the workspace
   * For local provider, this is a no-op
   * For SSH/Git, this establishes the connection
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the workspace
   * Cleanup resources, close connections
   */
  disconnect(): Promise<void>;

  /**
   * Check if currently connected
   */
  isConnected(): boolean;

  // ============================================================================
  // File Operations
  // ============================================================================

  /**
   * Read file contents
   * @throws FileSystemError if file doesn't exist or read fails
   * @throws SecurityError if path is outside workspace
   */
  readFile(path: string): Promise<Buffer>;

  /**
   * Write content to file
   * Creates parent directories if needed
   * Uses atomic write (temp file + rename) for safety
   * @throws FileSystemError if write fails
   * @throws SecurityError if path is outside workspace
   */
  writeFile(path: string, content: Buffer): Promise<void>;

  /**
   * Delete a file
   * @throws FileSystemError if file doesn't exist or delete fails
   * @throws SecurityError if path is outside workspace
   */
  deleteFile(path: string): Promise<void>;

  /**
   * List directory contents
   * @throws FileSystemError if directory doesn't exist
   * @throws SecurityError if path is outside workspace
   */
  listDirectory(path: string): Promise<FileEntry[]>;

  /**
   * Get file/directory statistics
   * @throws NotFoundError if path doesn't exist
   * @throws SecurityError if path is outside workspace
   */
  stat(path: string): Promise<FileStat>;

  /**
   * Check if path exists
   */
  exists(path: string): Promise<boolean>;

  // ============================================================================
  // Directory Operations
  // ============================================================================

  /**
   * Create directory (recursive)
   * @throws SecurityError if path is outside workspace
   */
  createDirectory(path: string): Promise<void>;

  /**
   * Delete directory
   * @param recursive If true, delete contents recursively
   * @throws FileSystemError if directory not empty and recursive is false
   * @throws SecurityError if path is outside workspace
   */
  deleteDirectory(path: string, recursive?: boolean): Promise<void>;

  // ============================================================================
  // Execution
  // ============================================================================

  /**
   * Execute a command in the workspace
   * @throws SecurityError if command is blocked
   * @throws TimeoutError if command exceeds timeout
   */
  exec(command: string, options?: ExecOptions): Promise<ExecResult>;

  // ============================================================================
  // Optional Features
  // ============================================================================

  /**
   * Watch for file changes (optional)
   * Not all providers support this
   */
  watch?(path: string, callback: WatchCallback): Disposable;

  /**
   * Get git status (optional)
   * Only available for providers with git support
   */
  gitStatus?(): Promise<GitStatus>;

  /**
   * Get current git branch (optional)
   */
  gitBranch?(): Promise<string>;
}

/**
 * Factory function type for creating providers
 */
export type ProviderFactory = (config: ProviderConfig) => WorkspaceProvider;

/**
 * Provider capabilities
 */
export interface ProviderCapabilities {
  /** Supports file watching */
  watch: boolean;
  /** Supports git operations */
  git: boolean;
  /** Supports command execution */
  exec: boolean;
  /** Requires network connection */
  networked: boolean;
}

/**
 * Get capabilities for a provider type
 */
export function getProviderCapabilities(type: ProviderType): ProviderCapabilities {
  switch (type) {
    case 'local':
      return { watch: true, git: true, exec: true, networked: false };
    case 'git':
      return { watch: true, git: true, exec: true, networked: true };
    case 'ssh':
      return { watch: false, git: true, exec: true, networked: true };
    default:
      return { watch: false, git: false, exec: false, networked: false };
  }
}
