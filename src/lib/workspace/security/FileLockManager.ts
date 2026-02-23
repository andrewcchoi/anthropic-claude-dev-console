/**
 * FileLockManager
 * Manages file locks for concurrent access safety
 */

import { LockTimeoutError } from '../errors';
import { WORKSPACE_LIMITS } from '../types';

export interface LockHandle {
  path: string;
  acquiredAt: number;
  release: () => void;
}

interface Lock {
  path: string;
  acquiredAt: number;
  owner: string;
  resolve?: () => void;
}

export class FileLockManager {
  private locks: Map<string, Lock> = new Map();
  private waitQueues: Map<string, Array<() => void>> = new Map();
  private ownerId: string;

  constructor(ownerId?: string) {
    this.ownerId = ownerId ?? `lock-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  /**
   * Acquire a lock for a file path
   * @param path The file path to lock
   * @param timeout Timeout in ms (default from WORKSPACE_LIMITS)
   * @throws LockTimeoutError if lock cannot be acquired within timeout
   */
  async acquire(path: string, timeout?: number): Promise<LockHandle> {
    const timeoutMs = timeout ?? WORKSPACE_LIMITS.fileLockTimeoutMs;
    const key = this.normalizeKey(path);
    const start = Date.now();

    while (this.locks.has(key)) {
      const elapsed = Date.now() - start;
      if (elapsed >= timeoutMs) {
        throw new LockTimeoutError(path);
      }

      // Wait for lock to be released
      await this.waitForRelease(key, timeoutMs - elapsed);
    }

    // Acquire the lock
    const lock: Lock = {
      path,
      acquiredAt: Date.now(),
      owner: this.ownerId,
    };

    this.locks.set(key, lock);

    return {
      path,
      acquiredAt: lock.acquiredAt,
      release: () => this.release(key),
    };
  }

  /**
   * Try to acquire a lock without waiting
   * Returns null if lock is not available
   */
  tryAcquire(path: string): LockHandle | null {
    const key = this.normalizeKey(path);

    if (this.locks.has(key)) {
      return null;
    }

    const lock: Lock = {
      path,
      acquiredAt: Date.now(),
      owner: this.ownerId,
    };

    this.locks.set(key, lock);

    return {
      path,
      acquiredAt: lock.acquiredAt,
      release: () => this.release(key),
    };
  }

  /**
   * Release a lock
   */
  private release(key: string): void {
    this.locks.delete(key);

    // Notify waiters
    const queue = this.waitQueues.get(key);
    if (queue && queue.length > 0) {
      const next = queue.shift();
      if (next) {
        next();
      }
      if (queue.length === 0) {
        this.waitQueues.delete(key);
      }
    }
  }

  /**
   * Wait for a lock to be released
   */
  private waitForRelease(key: string, timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        // Remove from queue
        const queue = this.waitQueues.get(key);
        if (queue) {
          const index = queue.indexOf(resolve);
          if (index !== -1) {
            queue.splice(index, 1);
          }
        }
        reject(new LockTimeoutError(key));
      }, timeout);

      const wrappedResolve = () => {
        clearTimeout(timer);
        resolve();
      };

      // Add to wait queue
      if (!this.waitQueues.has(key)) {
        this.waitQueues.set(key, []);
      }
      this.waitQueues.get(key)!.push(wrappedResolve);
    });
  }

  /**
   * Check if a path is currently locked
   */
  isLocked(path: string): boolean {
    return this.locks.has(this.normalizeKey(path));
  }

  /**
   * Get lock info for a path
   */
  getLockInfo(path: string): Lock | undefined {
    return this.locks.get(this.normalizeKey(path));
  }

  /**
   * Get all active locks
   */
  getActiveLocks(): Lock[] {
    return Array.from(this.locks.values());
  }

  /**
   * Release all locks held by this manager
   */
  releaseAll(): void {
    for (const key of this.locks.keys()) {
      this.release(key);
    }
  }

  /**
   * Normalize path to use as lock key
   */
  private normalizeKey(path: string): string {
    // Normalize path separators and remove trailing slashes
    return path.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
  }

  /**
   * Execute a function while holding a lock
   */
  async withLock<T>(
    path: string,
    fn: () => Promise<T>,
    timeout?: number
  ): Promise<T> {
    const lock = await this.acquire(path, timeout);
    try {
      return await fn();
    } finally {
      lock.release();
    }
  }
}

// Export singleton for shared use
export const fileLockManager = new FileLockManager('global');
