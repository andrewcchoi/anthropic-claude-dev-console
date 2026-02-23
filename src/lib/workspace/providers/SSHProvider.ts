/**
 * SSHProvider
 * Workspace provider for SSH/SFTP remote access
 */

import { Client as SSHClient, SFTPWrapper } from 'ssh2';
import type { Stats } from 'ssh2';
import { promises as fs } from 'fs';
import { join, dirname, basename } from 'path';
import { tmpdir } from 'os';

import { BaseProvider } from './BaseProvider';
import { SSHConnectionPool, type ConnectionConfig, type PooledConnection } from '../ssh/SSHConnectionPool';
import { HostKeyManager, type HostKeyVerificationMode } from '../ssh/HostKeyManager';
import {
  ProviderType,
  FileEntry,
  FileStat,
  ExecOptions,
  ExecResult,
  WatchCallback,
  Disposable,
  GitStatus,
  SSHProviderConfig,
} from '../types';
import {
  ValidationError,
  ConnectionError,
  NotFoundError,
  FileSystemError,
} from '../errors';

/**
 * Validate SSH hostname
 */
function validateHostname(hostname: string): boolean {
  // Basic hostname validation
  const validPattern = /^[\w.-]+$/;
  if (!validPattern.test(hostname)) {
    return false;
  }

  // Check for shell metacharacters
  const dangerous = /[;&|`$(){}[\]<>!\\'"]/;
  if (dangerous.test(hostname)) {
    return false;
  }

  return true;
}

/**
 * Validate username
 */
function validateUsername(username: string): boolean {
  // Allow alphanumeric, dash, underscore, dot
  const validPattern = /^[\w.-]+$/;
  if (!validPattern.test(username)) {
    return false;
  }

  // Check for shell metacharacters
  const dangerous = /[;&|`$(){}[\]<>!\\'"]/;
  if (dangerous.test(username)) {
    return false;
  }

  return true;
}

// Singleton connection pool
let connectionPool: SSHConnectionPool | null = null;

function getConnectionPool(): SSHConnectionPool {
  if (!connectionPool) {
    connectionPool = new SSHConnectionPool();
  }
  return connectionPool;
}

export class SSHProvider extends BaseProvider {
  readonly type: ProviderType = 'ssh';

  private hostname: string;
  private port: number;
  private username: string;
  private password?: string;
  private privateKey?: Buffer;
  private passphrase?: string;
  private remotePath: string;
  private pool: SSHConnectionPool;
  private hostKeyManager: HostKeyManager;
  private connection: PooledConnection | null = null;
  private sftp: SFTPWrapper | null = null;

  constructor(config: SSHProviderConfig & { id?: string; name?: string }) {
    const hostname = (config as any).hostname || (config as any).host;
    const port = (config as any).port ?? 22;
    const username = (config as any).username || (config as any).user;
    const remotePath = (config as any).remotePath || (config as any).path || '/';

    // Validate hostname
    if (!hostname || !validateHostname(hostname)) {
      throw new ValidationError(`Invalid hostname: ${hostname}`, 'hostname');
    }

    // Validate username
    if (!username || !validateUsername(username)) {
      throw new ValidationError(`Invalid username: ${username}`, 'username');
    }

    // Validate port
    if (port < 1 || port > 65535) {
      throw new ValidationError(`Invalid port: ${port}`, 'port');
    }

    // Validate remote path
    if (!remotePath || remotePath.trim() === '') {
      throw new ValidationError('Remote path is required', 'remotePath');
    }

    super({
      id: config.id ?? `ssh-${hostname}-${port}`,
      name: config.name ?? `${username}@${hostname}:${remotePath}`,
      rootPath: remotePath,
    });

    this.hostname = hostname;
    this.port = port;
    this.username = username;
    this.password = (config as any).password;
    this.privateKey = (config as any).privateKey;
    this.passphrase = (config as any).passphrase;
    this.remotePath = remotePath;
    this.pool = getConnectionPool();
    this.hostKeyManager = new HostKeyManager((config as any).hostKeyVerification ?? 'tofu');
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  async connect(): Promise<void> {
    this.log('info', 'Connecting', {
      hostname: this.hostname,
      port: this.port,
      username: this.username,
    });

    try {
      // Acquire connection from pool
      const connectionConfig: ConnectionConfig = {
        hostname: this.hostname,
        port: this.port,
        username: this.username,
        password: this.password,
        privateKey: this.privateKey,
        passphrase: this.passphrase,
      };

      this.connection = await this.pool.acquire(connectionConfig);

      // Get SFTP session
      this.sftp = await this.getSFTP(this.connection.client);

      // Verify remote path exists
      try {
        await this.statRemote(this.remotePath);
      } catch (error) {
        throw new ConnectionError(
          `Remote path does not exist: ${this.remotePath}`,
          { provider: this.id, cause: error instanceof Error ? error : undefined }
        );
      }

      this._connected = true;
      this.log('info', 'Connected', { hostname: this.hostname, port: this.port });
    } catch (error) {
      if (this.connection) {
        this.pool.release(this.connection);
        this.connection = null;
      }

      throw new ConnectionError(
        `SSH connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { provider: this.id, cause: error instanceof Error ? error : undefined }
      );
    }
  }

  async disconnect(): Promise<void> {
    if (this.sftp) {
      this.sftp.end();
      this.sftp = null;
    }

    if (this.connection) {
      this.pool.release(this.connection);
      this.connection = null;
    }

    this.cleanup();
    this.log('info', 'Disconnected');
  }

  // ============================================================================
  // SFTP Operations
  // ============================================================================

  /**
   * Get SFTP session from SSH client
   */
  private async getSFTP(client: SSHClient): Promise<SFTPWrapper> {
    return new Promise((resolve, reject) => {
      client.sftp((error, sftp) => {
        if (error) {
          reject(new ConnectionError('Failed to create SFTP session', {
            provider: this.id,
            cause: error,
          }));
        } else {
          resolve(sftp);
        }
      });
    });
  }

  /**
   * Ensure SFTP is available
   */
  private ensureSFTP(): SFTPWrapper {
    if (!this.sftp) {
      throw new ConnectionError('SFTP not connected', { provider: this.id });
    }
    return this.sftp;
  }

  /**
   * Get full remote path
   */
  private getRemotePath(path: string): string {
    return join(this.remotePath, path);
  }

  /**
   * Stat a remote file/directory
   */
  private async statRemote(remotePath: string): Promise<Stats> {
    const sftp = this.ensureSFTP();

    return new Promise((resolve, reject) => {
      sftp.stat(remotePath, (error, stats) => {
        if (error) {
          reject(error);
        } else {
          resolve(stats);
        }
      });
    });
  }

  // ============================================================================
  // File Operations
  // ============================================================================

  async readFile(path: string): Promise<Buffer> {
    await this.validatePath(path);

    const remotePath = this.getRemotePath(path);
    const sftp = this.ensureSFTP();

    this.log('debug', 'Reading file', { path: remotePath });

    return new Promise((resolve, reject) => {
      sftp.readFile(remotePath, (error, data) => {
        if (error) {
          if ((error as any).code === 2) {
            reject(new NotFoundError('file', path));
          } else {
            reject(new FileSystemError('read', path, {
              provider: this.id,
              cause: error,
            }));
          }
        } else {
          resolve(data);
        }
      });
    });
  }

  async writeFile(path: string, content: Buffer): Promise<void> {
    await this.validatePath(path);

    const remotePath = this.getRemotePath(path);
    const sftp = this.ensureSFTP();

    this.log('debug', 'Writing file', { path: remotePath, size: content.length });

    // Atomic write: write to temp file, then rename
    const tempPath = `${remotePath}.tmp-${Date.now()}`;

    try {
      // Write to temp file
      await new Promise<void>((resolve, reject) => {
        sftp.writeFile(tempPath, content, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      // Rename to final path
      await new Promise<void>((resolve, reject) => {
        sftp.rename(tempPath, remotePath, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    } catch (error) {
      // Cleanup temp file on error
      try {
        await new Promise<void>((resolve) => {
          sftp.unlink(tempPath, () => resolve()); // Ignore errors
        });
      } catch {
        // Ignore cleanup errors
      }

      throw new FileSystemError('write', path, {
        provider: this.id,
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  async deleteFile(path: string): Promise<void> {
    await this.validatePath(path);

    const remotePath = this.getRemotePath(path);
    const sftp = this.ensureSFTP();

    this.log('debug', 'Deleting file', { path: remotePath });

    return new Promise((resolve, reject) => {
      sftp.unlink(remotePath, (error) => {
        if (error) {
          if ((error as any).code === 2) {
            reject(new NotFoundError('file', path));
          } else {
            reject(new FileSystemError('delete', path, {
              provider: this.id,
              cause: error,
            }));
          }
        } else {
          resolve();
        }
      });
    });
  }

  async listDirectory(path: string): Promise<FileEntry[]> {
    await this.validatePath(path);

    const remotePath = this.getRemotePath(path);
    const sftp = this.ensureSFTP();

    this.log('debug', 'Listing directory', { path: remotePath });

    const entries = await new Promise<any[]>((resolve, reject) => {
      sftp.readdir(remotePath, (error, list) => {
        if (error) {
          if ((error as any).code === 2) {
            reject(new NotFoundError('directory', path));
          } else {
            reject(new FileSystemError('list', path, {
              provider: this.id,
              cause: error,
            }));
          }
        } else {
          resolve(list);
        }
      });
    });

    return entries.map(entry => {
      const isDir = entry.attrs.isDirectory();
      return {
        name: entry.filename,
        path: join(path, entry.filename),
        type: isDir ? ('directory' as const) : ('file' as const),
        size: entry.attrs.size,
        modifiedAt: entry.attrs.mtime * 1000,
      };
    });
  }

  async stat(path: string): Promise<FileStat> {
    await this.validatePath(path);

    const remotePath = this.getRemotePath(path);
    const stats = await this.statRemote(remotePath);

    return {
      size: stats.size,
      modifiedAt: stats.mtime * 1000,
      createdAt: stats.atime * 1000,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      permissions: stats.mode.toString(8), // Convert to octal string
    };
  }

  async exists(path: string): Promise<boolean> {
    try {
      await this.stat(path);
      return true;
    } catch (error) {
      if (error instanceof NotFoundError) {
        return false;
      }
      throw error;
    }
  }

  async createDirectory(path: string): Promise<void> {
    await this.validatePath(path);

    const remotePath = this.getRemotePath(path);
    const sftp = this.ensureSFTP();

    this.log('debug', 'Creating directory', { path: remotePath });

    return new Promise((resolve, reject) => {
      sftp.mkdir(remotePath, (error) => {
        if (error) {
          reject(new FileSystemError('mkdir', path, {
            provider: this.id,
            cause: error,
          }));
        } else {
          resolve();
        }
      });
    });
  }

  async deleteDirectory(path: string, recursive = false): Promise<void> {
    await this.validatePath(path);

    const remotePath = this.getRemotePath(path);
    const sftp = this.ensureSFTP();

    this.log('debug', 'Deleting directory', { path: remotePath, recursive });

    if (recursive) {
      // Recursively delete contents first
      const entries = await this.listDirectory(path);

      for (const entry of entries) {
        const entryPath = join(path, entry.name);

        if (entry.type === 'directory') {
          await this.deleteDirectory(entryPath, true);
        } else {
          await this.deleteFile(entryPath);
        }
      }
    }

    // Delete the directory itself
    return new Promise((resolve, reject) => {
      sftp.rmdir(remotePath, (error) => {
        if (error) {
          if ((error as any).code === 2) {
            reject(new NotFoundError('directory', path));
          } else {
            reject(new FileSystemError('delete', path, {
              provider: this.id,
              cause: error,
            }));
          }
        } else {
          resolve();
        }
      });
    });
  }

  async exec(command: string, options?: ExecOptions): Promise<ExecResult> {
    if (!this.connection) {
      throw new ConnectionError('SSH not connected', { provider: this.id });
    }

    this.log('debug', 'Executing command', { command });

    const client = this.connection.client;
    const cwd = options?.cwd ? this.getRemotePath(options.cwd) : this.remotePath;

    return new Promise((resolve, reject) => {
      // Prefix command with cd to correct directory
      const fullCommand = `cd "${cwd}" && ${command}`;

      client.exec(fullCommand, (error, stream) => {
        if (error) {
          reject(new ConnectionError(`Command execution failed: ${error.message}`, {
            provider: this.id,
            cause: error,
          }));
          return;
        }

        let stdout = '';
        let stderr = '';

        stream.on('data', (data: Buffer) => {
          stdout += data.toString();
        });

        stream.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
        });

        stream.on('close', (code: number) => {
          resolve({
            exitCode: code,
            stdout,
            stderr,
          });
        });

        stream.on('error', (error: Error) => {
          reject(new ConnectionError(`Stream error: ${error.message}`, {
            provider: this.id,
            cause: error,
          }));
        });
      });
    });
  }

  // ============================================================================
  // Optional Features
  // ============================================================================

  watch(path: string, callback: WatchCallback): Disposable {
    // SSH doesn't have native file watching - would need polling
    throw new Error('Watch not implemented for SSH provider');
  }

  async gitStatus(): Promise<GitStatus> {
    // Execute git status remotely
    const result = await this.exec('git status --porcelain -b');

    // Parse git status output (same as LocalProvider)
    const lines = result.stdout.split('\n').filter(Boolean);
    const branch = lines[0]?.replace(/^## /, '').split('...')[0] ?? 'unknown';

    const modified: string[] = [];
    const staged: string[] = [];
    const untracked: string[] = [];

    for (const line of lines.slice(1)) {
      const status = line.substring(0, 2);
      const file = line.substring(3);

      if (status === '??') {
        untracked.push(file);
      } else if (status[0] !== ' ') {
        staged.push(file);
      } else {
        modified.push(file);
      }
    }

    return {
      branch,
      modified,
      staged,
      untracked,
      ahead: 0,
      behind: 0,
    };
  }

  async gitBranch(): Promise<string> {
    const result = await this.exec('git rev-parse --abbrev-ref HEAD');
    return result.stdout.trim();
  }
}
