/**
 * GitProvider
 * Workspace provider for Git repository cloning and management
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { createHash } from 'crypto';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';

import { BaseProvider } from './BaseProvider';
import { LocalProvider } from './LocalProvider';
import { getGitStorageManager } from './GitStorageManager';
import {
  ProviderType,
  FileEntry,
  FileStat,
  ExecOptions,
  ExecResult,
  WatchCallback,
  Disposable,
  GitStatus,
  GitProviderConfig,
  ProgressCallback,
  WORKSPACE_LIMITS,
} from '../types';
import {
  FileSystemError,
  NotFoundError,
  ValidationError,
  ConnectionError,
} from '../errors';

const execAsync = promisify(execCallback);

// Default clone directory
const CLONE_BASE_DIR = process.env.CLAUDE_WORKSPACES_DIR
  ?? join(homedir(), '.claude-workspaces');

// Git URL patterns for validation
const GIT_URL_PATTERNS = [
  /^https:\/\/[\w.-]+\/[\w./-]+(\.git)?$/,
  /^git@[\w.-]+:[\w./-]+(\.git)?$/,
  /^ssh:\/\/[\w.-]+\/[\w./-]+(\.git)?$/,
];

/**
 * Validate a Git URL
 */
function validateGitUrl(url: string): boolean {
  // Check against allowed patterns
  if (!GIT_URL_PATTERNS.some(p => p.test(url))) {
    return false;
  }

  // Check for shell metacharacters (security)
  const dangerous = /[;&|`$(){}[\]<>!\\]/;
  if (dangerous.test(url)) {
    return false;
  }

  return true;
}

/**
 * Validate a Git branch name
 * Prevents command injection via branch names
 */
function validateBranchName(branch: string): boolean {
  // Check for shell metacharacters
  const dangerous = /[;&|`$(){}[\]<>!\\'"]/;
  if (dangerous.test(branch)) {
    return false;
  }

  // Branch names should only contain alphanumeric, dash, underscore, slash, dot
  // See: https://git-scm.com/docs/git-check-ref-format
  const validPattern = /^[\w.\-/]+$/;
  if (!validPattern.test(branch)) {
    return false;
  }

  // Additional git ref format restrictions
  if (branch.startsWith('.') || branch.endsWith('.') ||
      branch.includes('..') || branch.includes('//') ||
      branch.endsWith('.lock')) {
    return false;
  }

  return true;
}

/**
 * Validate sparse checkout paths
 * Prevents command injection via sparse checkout configuration
 */
function validateSparseCheckoutPaths(paths: string[]): boolean {
  const dangerous = /[;&|`$(){}[\]<>!\\'"]/;

  for (const path of paths) {
    // Check for shell metacharacters
    if (dangerous.test(path)) {
      return false;
    }

    // Paths should be relative and not contain suspicious patterns
    if (path.startsWith('/') || path.includes('..')) {
      return false;
    }
  }

  return true;
}

/**
 * Parse repo info from URL
 */
function parseRepoUrl(url: string): { provider: string; owner: string; name: string } {
  // HTTPS: https://github.com/owner/repo.git
  const httpsMatch = url.match(/https:\/\/([\w.-]+)\/([\w.-]+)\/([\w.-]+?)(\.git)?$/);
  if (httpsMatch) {
    return {
      provider: httpsMatch[1],
      owner: httpsMatch[2],
      name: httpsMatch[3],
    };
  }

  // SSH: git@github.com:owner/repo.git
  const sshMatch = url.match(/git@([\w.-]+):([\w.-]+)\/([\w.-]+?)(\.git)?$/);
  if (sshMatch) {
    return {
      provider: sshMatch[1],
      owner: sshMatch[2],
      name: sshMatch[3],
    };
  }

  return { provider: 'unknown', owner: 'unknown', name: 'repo' };
}

export class GitProvider extends BaseProvider {
  readonly type: ProviderType = 'git';

  private repoUrl: string;
  private branch: string;
  private cloneDepth?: number;
  private sparseCheckout?: string[];
  private localPath: string;
  private localProvider: LocalProvider | null = null;
  private progressCallback?: ProgressCallback;

  constructor(config: GitProviderConfig & { id?: string; name?: string }) {
    // Validate URL first
    if (!validateGitUrl(config.repoUrl)) {
      throw new ValidationError(`Invalid Git URL: ${config.repoUrl}`, 'repoUrl');
    }

    // Validate branch name
    const branch = config.branch ?? 'main';
    if (!validateBranchName(branch)) {
      throw new ValidationError(`Invalid branch name: ${branch}`, 'branch');
    }

    // Validate sparse checkout paths if provided
    if (config.sparseCheckout && config.sparseCheckout.length > 0) {
      if (!validateSparseCheckoutPaths(config.sparseCheckout)) {
        throw new ValidationError('Invalid sparse checkout paths', 'sparseCheckout');
      }
    }

    const repoInfo = parseRepoUrl(config.repoUrl);
    const repoHash = createHash('sha256')
      .update(config.repoUrl)
      .digest('hex')
      .slice(0, 12);

    const localPath = join(CLONE_BASE_DIR, `${repoInfo.name}-${repoHash}`);

    super({
      id: config.id ?? `git-${repoHash}`,
      name: config.name ?? repoInfo.name,
      rootPath: localPath,
    });

    this.repoUrl = config.repoUrl;
    this.branch = branch;
    this.cloneDepth = config.cloneDepth;
    this.sparseCheckout = config.sparseCheckout;
    this.localPath = localPath;
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  async connect(): Promise<void> {
    this.log('info', 'Connecting', { repoUrl: this.repoUrl, branch: this.branch });

    // Ensure base directory exists
    await fs.mkdir(CLONE_BASE_DIR, { recursive: true });

    // Initialize storage manager
    const storageManager = getGitStorageManager();
    await storageManager.initialize();

    // Check if already cloned
    const isCloned = await this.isCloned();

    if (isCloned) {
      // Fetch and checkout
      this.log('info', 'Repository already cloned, fetching updates');
      await this.fetch();
      await this.checkout(this.branch);

      // Update last accessed time
      await storageManager.touchRepo(this.id);
    } else {
      // Clone repository
      this.log('info', 'Cloning repository');
      await this.clone();

      // Register with storage manager
      await storageManager.registerRepo(this.id, this.localPath, this.repoUrl);
    }

    // Create local provider for file operations
    this.localProvider = new LocalProvider({
      type: 'local',
      path: this.localPath,
      id: `${this.id}-local`,
      name: `${this.name} (local)`,
    });

    await this.localProvider.connect();
    this._connected = true;

    this.log('info', 'Connected', { localPath: this.localPath });
  }

  async disconnect(): Promise<void> {
    if (this.localProvider) {
      await this.localProvider.disconnect();
      this.localProvider = null;
    }

    // Update last accessed time on disconnect
    const storageManager = getGitStorageManager();
    await storageManager.touchRepo(this.id);

    this.cleanup();
    this.log('info', 'Disconnected');
  }

  /**
   * Set progress callback for clone operations
   */
  setProgressCallback(callback: ProgressCallback): void {
    this.progressCallback = callback;
  }

  // ============================================================================
  // Git Operations
  // ============================================================================

  /**
   * Check if repository is already cloned
   */
  private async isCloned(): Promise<boolean> {
    try {
      await fs.access(join(this.localPath, '.git'));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clone the repository
   */
  private async clone(): Promise<void> {
    const args = ['clone'];

    // Add depth for shallow clone
    if (this.cloneDepth) {
      args.push('--depth', this.cloneDepth.toString());
    }

    // Add branch
    args.push('--branch', this.branch);

    // Add sparse checkout setup
    if (this.sparseCheckout && this.sparseCheckout.length > 0) {
      args.push('--sparse');
    }

    // Add progress flag
    args.push('--progress');

    // Add URL and destination
    args.push(this.repoUrl, this.localPath);

    const command = `git ${args.join(' ')}`;

    try {
      await this.execGit(command, { reportProgress: true });

      // Configure sparse checkout if needed
      if (this.sparseCheckout && this.sparseCheckout.length > 0) {
        await this.configureSparseCheckout();
      }
    } catch (error) {
      // Cleanup failed clone
      try {
        await fs.rm(this.localPath, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
      throw new ConnectionError(
        `Clone failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { provider: this.id, cause: error instanceof Error ? error : undefined }
      );
    }
  }

  /**
   * Configure sparse checkout
   */
  private async configureSparseCheckout(): Promise<void> {
    if (!this.sparseCheckout || this.sparseCheckout.length === 0) return;

    await this.execGit(`git -C "${this.localPath}" sparse-checkout init`);
    await this.execGit(
      `git -C "${this.localPath}" sparse-checkout set ${this.sparseCheckout.join(' ')}`
    );
  }

  /**
   * Fetch updates from remote
   */
  async fetch(): Promise<void> {
    await this.execGit(`git -C "${this.localPath}" fetch --all --prune`);
  }

  /**
   * Checkout a branch
   */
  async checkout(branch: string): Promise<void> {
    // Validate branch name to prevent command injection
    if (!validateBranchName(branch)) {
      throw new ValidationError(`Invalid branch name: ${branch}`, 'branch');
    }

    // Check if branch exists locally
    const { stdout: localBranches } = await this.execGit(
      `git -C "${this.localPath}" branch --list "${branch}"`
    );

    if (localBranches.trim()) {
      // Local branch exists, switch to it
      await this.execGit(`git -C "${this.localPath}" checkout "${branch}"`);
    } else {
      // Try to checkout from remote
      await this.execGit(`git -C "${this.localPath}" checkout -b "${branch}" "origin/${branch}"`);
    }

    this.branch = branch;
  }

  /**
   * Pull latest changes
   */
  async pull(): Promise<void> {
    await this.execGit(`git -C "${this.localPath}" pull origin "${this.branch}"`);
  }

  /**
   * Push changes to remote
   */
  async push(): Promise<void> {
    await this.execGit(`git -C "${this.localPath}" push origin "${this.branch}"`);
  }

  /**
   * Get list of branches
   */
  async getBranches(): Promise<string[]> {
    const { stdout } = await this.execGit(
      `git -C "${this.localPath}" branch -a --format="%(refname:short)"`
    );
    return stdout
      .split('\n')
      .map(b => b.trim())
      .filter(Boolean)
      .map(b => b.replace(/^origin\//, ''));
  }

  /**
   * Execute a git command with optional progress reporting
   */
  private async execGit(
    command: string,
    options: { reportProgress?: boolean } = {}
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const proc = require('child_process').spawn('sh', ['-c', command], {
        cwd: this.localPath.startsWith(CLONE_BASE_DIR) ? CLONE_BASE_DIR : undefined,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data: Buffer) => {
        const chunk = data.toString();
        stderr += chunk;

        // Parse progress from stderr
        if (options.reportProgress && this.progressCallback) {
          this.parseProgress(chunk);
        }
      });

      proc.on('close', (code: number) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Git command failed (exit ${code}): ${stderr || stdout}`));
        }
      });

      proc.on('error', (error: Error) => {
        reject(error);
      });
    });
  }

  /**
   * Parse git progress output
   */
  private parseProgress(output: string): void {
    if (!this.progressCallback) return;

    // Match patterns like "Receiving objects:  45% (1234/2742)"
    const match = output.match(/(\w+):\s+(\d+)%\s+\((\d+)\/(\d+)\)/);
    if (match) {
      this.progressCallback({
        current: parseInt(match[3], 10),
        total: parseInt(match[4], 10),
        message: match[1],
      });
    }
  }

  // ============================================================================
  // File Operations (delegated to LocalProvider)
  // ============================================================================

  private ensureLocal(): LocalProvider {
    if (!this.localProvider) {
      throw new ConnectionError('Git provider not connected', { provider: this.id });
    }
    return this.localProvider;
  }

  async readFile(path: string): Promise<Buffer> {
    return this.ensureLocal().readFile(path);
  }

  async writeFile(path: string, content: Buffer): Promise<void> {
    return this.ensureLocal().writeFile(path, content);
  }

  async deleteFile(path: string): Promise<void> {
    return this.ensureLocal().deleteFile(path);
  }

  async listDirectory(path: string): Promise<FileEntry[]> {
    return this.ensureLocal().listDirectory(path);
  }

  async stat(path: string): Promise<FileStat> {
    return this.ensureLocal().stat(path);
  }

  async exists(path: string): Promise<boolean> {
    return this.ensureLocal().exists(path);
  }

  async createDirectory(path: string): Promise<void> {
    return this.ensureLocal().createDirectory(path);
  }

  async deleteDirectory(path: string, recursive?: boolean): Promise<void> {
    return this.ensureLocal().deleteDirectory(path, recursive);
  }

  async exec(command: string, options?: ExecOptions): Promise<ExecResult> {
    return this.ensureLocal().exec(command, options);
  }

  // ============================================================================
  // Optional Features
  // ============================================================================

  watch(path: string, callback: WatchCallback): Disposable {
    return this.ensureLocal().watch(path, callback);
  }

  async gitStatus(): Promise<GitStatus> {
    return this.ensureLocal().gitStatus();
  }

  async gitBranch(): Promise<string> {
    return this.branch;
  }
}
