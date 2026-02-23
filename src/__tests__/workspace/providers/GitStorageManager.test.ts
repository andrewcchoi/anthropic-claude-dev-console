/**
 * GitStorageManager Tests
 * Phase 2 - LRU Eviction Management
 */

import { GitStorageManager, getGitStorageManager } from '@/lib/workspace/providers/GitStorageManager';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('GitStorageManager', () => {
  let testDir: string;
  let manager: GitStorageManager;

  beforeEach(async () => {
    // Create temp directory for tests
    testDir = join(tmpdir(), `git-storage-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Set test environment
    process.env.CLAUDE_WORKSPACES_DIR = testDir;
    process.env.GIT_STORAGE_LIMIT_MB = '10'; // 10MB limit for tests
    process.env.GIT_MAX_REPOS = '3'; // 3 repos max for tests

    manager = new GitStorageManager();
  });

  afterEach(async () => {
    // Cleanup
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    // Reset environment
    delete process.env.CLAUDE_WORKSPACES_DIR;
    delete process.env.GIT_STORAGE_LIMIT_MB;
    delete process.env.GIT_MAX_REPOS;
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      await expect(manager.initialize()).resolves.not.toThrow();
    });

    test('should create base directory if missing', async () => {
      await fs.rm(testDir, { recursive: true, force: true });
      await manager.initialize();

      const exists = await fs
        .access(testDir)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });

    test('should scan existing repos on init', async () => {
      // Create a fake git repo
      const repoPath = join(testDir, 'test-repo');
      await fs.mkdir(join(repoPath, '.git'), { recursive: true });
      await fs.writeFile(
        join(repoPath, '.git', 'config'),
        '[remote "origin"]\n\turl = https://github.com/test/repo.git\n'
      );

      await manager.initialize();
      const stats = manager.getStats();

      expect(stats.totalRepos).toBe(1);
    });
  });

  describe('Repository Registration', () => {
    test('should register a new repo', async () => {
      const repoPath = join(testDir, 'new-repo');
      await fs.mkdir(repoPath, { recursive: true });

      await manager.registerRepo('repo-1', repoPath, 'https://github.com/test/repo.git');

      const stats = manager.getStats();
      expect(stats.totalRepos).toBe(1);
    });

    test('should track storage usage', async () => {
      const repoPath = join(testDir, 'new-repo');
      await fs.mkdir(repoPath, { recursive: true });
      await fs.writeFile(join(repoPath, 'file.txt'), 'test content');

      await manager.registerRepo('repo-1', repoPath, 'https://github.com/test/repo.git');

      const stats = manager.getStats();
      expect(stats.storageUsed).toBeGreaterThan(0);
    });
  });

  describe('LRU Eviction', () => {
    test('should evict oldest repo when limit exceeded', async () => {
      // Create 4 repos (limit is 3)
      for (let i = 1; i <= 4; i++) {
        const repoPath = join(testDir, `repo-${i}`);
        await fs.mkdir(repoPath, { recursive: true });
        await fs.writeFile(join(repoPath, 'file.txt'), 'test');

        await manager.registerRepo(`repo-${i}`, repoPath, `https://github.com/test/repo${i}.git`);

        // Add delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const stats = manager.getStats();
      expect(stats.totalRepos).toBeLessThanOrEqual(3);

      // Oldest repo should be gone
      const repo1Exists = await fs
        .access(join(testDir, 'repo-1'))
        .then(() => true)
        .catch(() => false);
      expect(repo1Exists).toBe(false);
    });

    test('should preserve recently accessed repos', async () => {
      // Create 3 repos
      for (let i = 1; i <= 3; i++) {
        const repoPath = join(testDir, `repo-${i}`);
        await fs.mkdir(repoPath, { recursive: true });
        await manager.registerRepo(`repo-${i}`, repoPath, `https://github.com/test/repo${i}.git`);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Touch repo-1 to make it recent
      await manager.touchRepo('repo-1');
      await new Promise(resolve => setTimeout(resolve, 10));

      // Add repo-4, which should evict repo-2 (oldest)
      const repo4Path = join(testDir, 'repo-4');
      await fs.mkdir(repo4Path, { recursive: true });
      await manager.registerRepo('repo-4', repo4Path, 'https://github.com/test/repo4.git');

      // repo-1 should still exist (recently touched)
      const repo1Exists = await fs
        .access(join(testDir, 'repo-1'))
        .then(() => true)
        .catch(() => false);
      expect(repo1Exists).toBe(true);

      // repo-2 should be evicted
      const repo2Exists = await fs
        .access(join(testDir, 'repo-2'))
        .then(() => true)
        .catch(() => false);
      expect(repo2Exists).toBe(false);
    });
  });

  describe('Orphan Cleanup', () => {
    test('should clean up orphaned clones', async () => {
      // Create an orphan directory (not tracked)
      const orphanPath = join(testDir, 'orphan-repo');
      await fs.mkdir(orphanPath, { recursive: true });
      await fs.writeFile(join(orphanPath, 'file.txt'), 'orphan');

      await manager.initialize();
      await manager.cleanOrphans();

      const orphanExists = await fs
        .access(orphanPath)
        .then(() => true)
        .catch(() => false);
      expect(orphanExists).toBe(false);
    });
  });

  describe('Statistics', () => {
    test('should return accurate stats', async () => {
      const repoPath = join(testDir, 'test-repo');
      await fs.mkdir(repoPath, { recursive: true });
      await fs.writeFile(join(repoPath, 'file.txt'), 'x'.repeat(1000));

      await manager.registerRepo('repo-1', repoPath, 'https://github.com/test/repo.git');

      const stats = manager.getStats();
      expect(stats.totalRepos).toBe(1);
      expect(stats.storageUsed).toBeGreaterThan(0);
      expect(stats.storageLimit).toBeGreaterThan(0);
      expect(stats.repoLimit).toBeGreaterThan(0);
      expect(stats.oldestRepo).not.toBeNull();
      expect(stats.oldestRepo?.id).toBe('repo-1');
    });
  });

  describe('Singleton Pattern', () => {
    test('should return same instance', () => {
      const instance1 = getGitStorageManager();
      const instance2 = getGitStorageManager();

      expect(instance1).toBe(instance2);
    });
  });
});
