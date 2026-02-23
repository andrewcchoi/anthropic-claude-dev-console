/**
 * GitStorageManager
 * Manages LRU eviction of cloned repositories to prevent unbounded disk usage
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CLONE_BASE_DIR = process.env.CLAUDE_WORKSPACES_DIR ?? join(homedir(), '.claude-workspaces');

// Storage limits
const MAX_STORAGE_BYTES = parseInt(process.env.GIT_STORAGE_LIMIT_MB ?? '5000', 10) * 1024 * 1024; // 5GB default
const MAX_REPOS = parseInt(process.env.GIT_MAX_REPOS ?? '50', 10); // 50 repos default

interface RepoInfo {
  path: string;
  repoUrl: string;
  size: number;
  lastAccessed: number;
}

export class GitStorageManager {
  private repos: Map<string, RepoInfo> = new Map();
  private initialized = false;

  /**
   * Initialize storage manager by scanning existing clones
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await fs.mkdir(CLONE_BASE_DIR, { recursive: true });

      // Scan for existing clones
      const entries = await fs.readdir(CLONE_BASE_DIR, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const repoPath = join(CLONE_BASE_DIR, entry.name);
        const gitDir = join(repoPath, '.git');

        try {
          // Check if it's a valid git repo
          await fs.access(gitDir);

          // Get repo size
          const size = await this.getDirectorySize(repoPath);

          // Get last accessed time
          const stat = await fs.stat(repoPath);

          // Try to read git config for repo URL
          const configPath = join(gitDir, 'config');
          const configContent = await fs.readFile(configPath, 'utf-8');
          const urlMatch = configContent.match(/url\s*=\s*(.+)/);
          const repoUrl = urlMatch ? urlMatch[1].trim() : 'unknown';

          this.repos.set(entry.name, {
            path: repoPath,
            repoUrl,
            size,
            lastAccessed: stat.atimeMs,
          });
        } catch {
          // Not a valid git repo or can't read - skip
          continue;
        }
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize GitStorageManager:', error);
      throw error;
    }
  }

  /**
   * Register a new cloned repository
   */
  async registerRepo(repoId: string, repoPath: string, repoUrl: string): Promise<void> {
    await this.initialize();

    const size = await this.getDirectorySize(repoPath);

    this.repos.set(repoId, {
      path: repoPath,
      repoUrl,
      size,
      lastAccessed: Date.now(),
    });

    // Check if eviction needed
    await this.evictIfNeeded();
  }

  /**
   * Update last accessed time for a repo
   */
  async touchRepo(repoId: string): Promise<void> {
    await this.initialize();

    const repo = this.repos.get(repoId);
    if (repo) {
      repo.lastAccessed = Date.now();

      // Update filesystem atime
      try {
        const now = new Date();
        await fs.utimes(repo.path, now, now);
      } catch {
        // Ignore errors updating atime
      }
    }
  }

  /**
   * Unregister a repository (after manual deletion)
   */
  unregisterRepo(repoId: string): void {
    this.repos.delete(repoId);
  }

  /**
   * Get current storage usage in bytes
   */
  getStorageUsage(): number {
    let total = 0;
    for (const repo of this.repos.values()) {
      total += repo.size;
    }
    return total;
  }

  /**
   * Get number of tracked repos
   */
  getRepoCount(): number {
    return this.repos.size;
  }

  /**
   * Check if eviction is needed and perform it
   */
  private async evictIfNeeded(): Promise<void> {
    const storageUsage = this.getStorageUsage();
    const repoCount = this.getRepoCount();

    // Check if we exceed limits
    if (storageUsage <= MAX_STORAGE_BYTES && repoCount <= MAX_REPOS) {
      return;
    }

    // Sort repos by last accessed time (oldest first)
    const sortedRepos = Array.from(this.repos.entries()).sort(
      ([, a], [, b]) => a.lastAccessed - b.lastAccessed
    );

    // Evict oldest repos until we're under limits
    for (const [repoId, repo] of sortedRepos) {
      // Stop if we're under limits
      if (this.getStorageUsage() <= MAX_STORAGE_BYTES && this.getRepoCount() <= MAX_REPOS) {
        break;
      }

      try {
        console.log(`Evicting repo: ${repoId} (${repo.repoUrl})`);
        await fs.rm(repo.path, { recursive: true, force: true });
        this.repos.delete(repoId);
      } catch (error) {
        console.error(`Failed to evict repo ${repoId}:`, error);
      }
    }
  }

  /**
   * Get directory size recursively
   */
  private async getDirectorySize(dirPath: string): Promise<number> {
    let size = 0;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);

        if (entry.isDirectory()) {
          size += await this.getDirectorySize(fullPath);
        } else if (entry.isFile()) {
          const stat = await fs.stat(fullPath);
          size += stat.size;
        }
      }
    } catch (error) {
      // Ignore errors (permission denied, etc.)
      console.warn(`Could not read directory ${dirPath}:`, error);
    }

    return size;
  }

  /**
   * Clean up orphaned clones (repos with no metadata)
   */
  async cleanOrphans(): Promise<void> {
    await this.initialize();

    const entries = await fs.readdir(CLONE_BASE_DIR, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      // If not tracked, it's an orphan
      if (!this.repos.has(entry.name)) {
        const orphanPath = join(CLONE_BASE_DIR, entry.name);

        try {
          console.log(`Cleaning orphaned clone: ${entry.name}`);
          await fs.rm(orphanPath, { recursive: true, force: true });
        } catch (error) {
          console.error(`Failed to clean orphan ${entry.name}:`, error);
        }
      }
    }
  }

  /**
   * Get stats for monitoring
   */
  getStats(): {
    totalRepos: number;
    storageUsed: number;
    storageLimit: number;
    repoLimit: number;
    oldestRepo: { id: string; lastAccessed: Date } | null;
  } {
    const repos = Array.from(this.repos.entries());
    const oldest = repos.length > 0
      ? repos.reduce((a, b) => (a[1].lastAccessed < b[1].lastAccessed ? a : b))
      : null;

    return {
      totalRepos: this.repos.size,
      storageUsed: this.getStorageUsage(),
      storageLimit: MAX_STORAGE_BYTES,
      repoLimit: MAX_REPOS,
      oldestRepo: oldest
        ? { id: oldest[0], lastAccessed: new Date(oldest[1].lastAccessed) }
        : null,
    };
  }
}

// Singleton instance
let instance: GitStorageManager | null = null;

/**
 * Get the singleton GitStorageManager instance
 */
export function getGitStorageManager(): GitStorageManager {
  if (!instance) {
    instance = new GitStorageManager();
  }
  return instance;
}
