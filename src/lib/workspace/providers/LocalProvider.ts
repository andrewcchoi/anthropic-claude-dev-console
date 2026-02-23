/**
 * LocalProvider
 * Workspace provider for local filesystem access
 */

import { promises as fs } from 'fs';
import { exec as execCallback, spawn } from 'child_process';
import { promisify } from 'util';
import { join, dirname } from 'path';
import { watch as fsWatch, FSWatcher } from 'fs';

import { BaseProvider, BaseProviderConfig } from './BaseProvider';
import {
  ProviderType,
  FileEntry,
  FileStat,
  ExecOptions,
  ExecResult,
  WatchCallback,
  Disposable,
  GitStatus,
  LocalProviderConfig,
  WORKSPACE_LIMITS,
} from '../types';
import { FileSystemError, NotFoundError, TimeoutError } from '../errors';

const execAsync = promisify(execCallback);

export class LocalProvider extends BaseProvider {
  readonly type: ProviderType = 'local';

  constructor(config: LocalProviderConfig & { id?: string; name?: string }) {
    super({
      id: config.id ?? `local-${Date.now()}`,
      name: config.name ?? config.path.split('/').pop() ?? 'Local',
      rootPath: config.path,
    });
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  async connect(): Promise<void> {
    // Verify the root path exists and is accessible
    try {
      const stats = await fs.stat(this.rootPath);
      if (!stats.isDirectory()) {
        throw new FileSystemError('stat', this.rootPath, {
          cause: new Error('Path is not a directory'),
        });
      }
      this._connected = true;
      this.log('info', 'Connected', { rootPath: this.rootPath });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new NotFoundError('directory', this.rootPath);
      }
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.cleanup();
    this.log('info', 'Disconnected');
  }

  // ============================================================================
  // File Operations
  // ============================================================================

  async readFile(path: string): Promise<Buffer> {
    const fullPath = await this.validatePath(path);

    return this.wrapOperation('readFile', async () => {
      // Check file size first
      const stats = await fs.stat(fullPath);
      if (stats.size > WORKSPACE_LIMITS.maxFileSize) {
        throw new FileSystemError('read', path, {
          cause: new Error(`File exceeds maximum size of ${WORKSPACE_LIMITS.maxFileSize} bytes`),
        });
      }

      return fs.readFile(fullPath);
    });
  }

  async writeFile(path: string, content: Buffer): Promise<void> {
    const fullPath = await this.validatePath(path);

    return this.withLock(fullPath, async () => {
      return this.wrapOperation('writeFile', async () => {
        // Ensure parent directory exists
        await fs.mkdir(dirname(fullPath), { recursive: true });

        // Atomic write: write to temp file, then rename
        const tempPath = `${fullPath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2)}`;

        try {
          await fs.writeFile(tempPath, content);
          await fs.rename(tempPath, fullPath);
        } catch (error) {
          // Cleanup temp file on failure
          try {
            await fs.unlink(tempPath);
          } catch {
            // Ignore cleanup errors
          }
          throw error;
        }
      });
    });
  }

  async deleteFile(path: string): Promise<void> {
    const fullPath = await this.validatePath(path);

    return this.withLock(fullPath, async () => {
      return this.wrapOperation('deleteFile', async () => {
        await fs.unlink(fullPath);
      });
    });
  }

  async listDirectory(path: string): Promise<FileEntry[]> {
    const fullPath = await this.validatePath(path);

    return this.wrapOperation('listDirectory', async () => {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });

      const items: FileEntry[] = await Promise.all(
        entries.map(async (entry) => {
          const entryPath = join(fullPath, entry.name);
          let stats: FileStat | undefined;

          try {
            const fsStats = await fs.stat(entryPath);
            stats = {
              size: fsStats.size,
              modifiedAt: fsStats.mtimeMs,
              createdAt: fsStats.birthtimeMs || fsStats.mtimeMs,
              isDirectory: fsStats.isDirectory(),
              isFile: fsStats.isFile(),
            };
          } catch {
            // File may have been deleted between readdir and stat
          }

          return {
            name: entry.name,
            path: entryPath,
            type: entry.isDirectory() ? 'directory' : 'file',
            size: stats?.size,
            modifiedAt: stats?.modifiedAt,
          } as FileEntry;
        })
      );

      // Sort: directories first, then alphabetically
      items.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      return items;
    });
  }

  async stat(path: string): Promise<FileStat> {
    const fullPath = await this.validatePath(path);

    return this.wrapOperation('stat', async () => {
      try {
        const stats = await fs.stat(fullPath);
        return {
          size: stats.size,
          modifiedAt: stats.mtimeMs,
          createdAt: stats.birthtimeMs || stats.mtimeMs,
          isDirectory: stats.isDirectory(),
          isFile: stats.isFile(),
        };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          throw new NotFoundError('file', path);
        }
        throw error;
      }
    });
  }

  async exists(path: string): Promise<boolean> {
    try {
      const fullPath = await this.validatePath(path);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // Directory Operations
  // ============================================================================

  async createDirectory(path: string): Promise<void> {
    const fullPath = await this.validatePath(path);

    return this.wrapOperation('createDirectory', async () => {
      await fs.mkdir(fullPath, { recursive: true });
    });
  }

  async deleteDirectory(path: string, recursive: boolean = false): Promise<void> {
    const fullPath = await this.validatePath(path);

    return this.wrapOperation('deleteDirectory', async () => {
      await fs.rm(fullPath, { recursive, force: recursive });
    });
  }

  // ============================================================================
  // Execution
  // ============================================================================

  async exec(command: string, options: ExecOptions = {}): Promise<ExecResult> {
    this.validateCommand(command);

    const timeout = options.timeout ?? 120000; // 2 minutes default
    const cwd = options.cwd
      ? await this.validatePath(options.cwd)
      : this.rootPath;

    return this.wrapOperation('exec', async () => {
      return new Promise((resolve, reject) => {
        const childProcess = spawn('sh', ['-c', command], {
          cwd,
          env: { ...process.env, ...options.env },
          timeout,
        });

        let stdout = '';
        let stderr = '';

        childProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        childProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        childProcess.on('close', (code) => {
          resolve({
            stdout,
            stderr,
            exitCode: code ?? 0,
          });
        });

        childProcess.on('error', (error) => {
          if ((error as NodeJS.ErrnoException).code === 'ETIMEDOUT') {
            reject(new TimeoutError('exec', timeout, { provider: this.id }));
          } else {
            reject(error);
          }
        });

        // Handle timeout
        setTimeout(() => {
          childProcess.kill('SIGTERM');
          reject(new TimeoutError('exec', timeout, { provider: this.id }));
        }, timeout);
      });
    });
  }

  // ============================================================================
  // Optional Features
  // ============================================================================

  watch(path: string, callback: WatchCallback): Disposable {
    const fullPath = this.pathValidator.validateSync(path);
    let watcher: FSWatcher | null = null;

    try {
      watcher = fsWatch(fullPath, { recursive: true }, (eventType, filename) => {
        if (filename) {
          const eventPath = join(fullPath, filename);
          const event = eventType === 'rename' ? 'add' : 'change';
          callback(event, eventPath);
        }
      });
    } catch (error) {
      this.log('error', 'Failed to create watcher', { path, error });
    }

    return {
      dispose: () => {
        if (watcher) {
          watcher.close();
          watcher = null;
        }
      },
    };
  }

  async gitStatus(): Promise<GitStatus> {
    const result = await this.exec('git status --porcelain -b');

    const lines = result.stdout.split('\n').filter(Boolean);
    const branchLine = lines[0] || '';
    const statusLines = lines.slice(1);

    // Parse branch info
    const branchMatch = branchLine.match(/^## (\S+?)(?:\.\.\.(\S+))?(?: \[(.+)\])?$/);
    const branch = branchMatch?.[1] || 'unknown';

    // Parse ahead/behind
    const trackingInfo = branchMatch?.[3] || '';
    const aheadMatch = trackingInfo.match(/ahead (\d+)/);
    const behindMatch = trackingInfo.match(/behind (\d+)/);

    // Parse file statuses
    const modified: string[] = [];
    const staged: string[] = [];
    const untracked: string[] = [];

    for (const line of statusLines) {
      const indexStatus = line[0];
      const workTreeStatus = line[1];
      const filePath = line.slice(3);

      if (indexStatus === '?' && workTreeStatus === '?') {
        untracked.push(filePath);
      } else {
        if (indexStatus !== ' ' && indexStatus !== '?') {
          staged.push(filePath);
        }
        if (workTreeStatus !== ' ' && workTreeStatus !== '?') {
          modified.push(filePath);
        }
      }
    }

    return {
      branch,
      modified,
      staged,
      untracked,
      ahead: parseInt(aheadMatch?.[1] || '0', 10),
      behind: parseInt(behindMatch?.[1] || '0', 10),
    };
  }

  async gitBranch(): Promise<string> {
    const result = await this.exec('git rev-parse --abbrev-ref HEAD');
    return result.stdout.trim();
  }
}
