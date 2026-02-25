# Flexible Workspace Configuration - Hybrid Gateway Design

**Date:** 2026-02-22
**Issue:** #50
**Branch:** `feature/50-flexible-workspace`
**Status:** Design Complete - Pending Ralph Loop Review

## Executive Summary

This design document outlines a comprehensive Hybrid Gateway architecture for the Claude Code Browser, enabling multi-project support with Local, Git, and SSH workspace providers. The system replaces 19 hardcoded `/workspace` references with a unified provider abstraction layer.

## Requirements

| Requirement | Decision |
|-------------|----------|
| **Providers** | Local FS + Git Clone + SSH |
| **SSH Auth** | Key + Password fallback |
| **Multi-project** | Multiple active workspaces (tabs/panels) |
| **Connections** | User configurable persistence per workspace |
| **Git Model** | Clone to local cache (`~/.claude-workspaces/`) |
| **Credentials** | System keychain + encrypted file fallback |
| **Errors** | Graceful degradation with recovery |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     WorkspaceManager                         │
│  (Central orchestrator - manages active workspaces)          │
├─────────────────────────────────────────────────────────────┤
│                    WorkspaceProvider                         │
│  (Abstract interface - all providers implement this)         │
├──────────────┬──────────────┬──────────────┬────────────────┤
│ LocalProvider│ GitProvider  │ SSHProvider  │ Future...      │
│ (filesystem) │ (clone→local)│ (ssh2 tunnel)│                │
└──────────────┴──────────────┴──────────────┴────────────────┘
```

---

## 1. Core Architecture

### 1.1 WorkspaceProvider Interface

```typescript
interface WorkspaceProvider {
  // Identity
  readonly type: 'local' | 'git' | 'ssh';
  readonly id: string;

  // Lifecycle
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // File Operations
  readFile(path: string): Promise<Buffer>;
  writeFile(path: string, content: Buffer): Promise<void>;
  deleteFile(path: string): Promise<void>;
  listDirectory(path: string): Promise<FileEntry[]>;
  stat(path: string): Promise<FileStat>;
  exists(path: string): Promise<boolean>;

  // Directory Operations
  createDirectory(path: string): Promise<void>;
  deleteDirectory(path: string, recursive?: boolean): Promise<void>;

  // Execution
  exec(command: string, options?: ExecOptions): Promise<ExecResult>;

  // Watch (optional)
  watch?(path: string, callback: WatchCallback): Disposable;

  // Git Operations (optional)
  gitStatus?(): Promise<GitStatus>;
  gitBranch?(): Promise<string>;
}
```

### 1.2 WorkspaceManager

```typescript
class WorkspaceManager {
  private providers: Map<string, WorkspaceProvider>;
  private activeWorkspaces: Map<string, Workspace>;
  private credentialStore: CredentialStore;

  // Provider Registry
  registerProvider(config: ProviderConfig): Promise<WorkspaceProvider>;
  unregisterProvider(id: string): Promise<void>;
  getProvider(id: string): WorkspaceProvider | undefined;

  // Workspace Lifecycle
  openWorkspace(providerId: string, path: string): Promise<Workspace>;
  closeWorkspace(workspaceId: string): Promise<void>;
  getActiveWorkspaces(): Workspace[];

  // Connection Management
  reconnect(providerId: string): Promise<void>;
  getConnectionStatus(providerId: string): ConnectionStatus;
}
```

### 1.3 Workspace Model

```typescript
interface Workspace {
  id: string;
  name: string;
  provider: WorkspaceProvider;
  rootPath: string;
  isActive: boolean;
  color?: string;
  sessionId?: string;
}

interface ProviderConfig {
  type: 'local' | 'git' | 'ssh';

  // Local
  path?: string;

  // Git
  repoUrl?: string;
  branch?: string;

  // SSH
  host?: string;
  port?: number;
  username?: string;
  authMethod?: 'key' | 'password';
  keyPath?: string;
  remotePath?: string;

  // Connection settings
  persistConnection?: boolean;
  reconnectOnFailure?: boolean;
}
```

---

## 2. Provider Implementations

### 2.1 LocalProvider

- Delegates to Node.js `fs` module
- Always "connected" (no network dependency)
- Path validation with canonical path checks to prevent traversal
- Implements all WorkspaceProvider methods

### 2.2 GitProvider

- Clones repository to `~/.claude-workspaces/{repo-hash}/`
- Creates internal LocalProvider for file operations after clone
- Supports fetch, checkout, push, pull operations
- Progress streaming during clone via SSE
- Branch switching without re-clone

### 2.3 SSHProvider

- Uses `ssh2` library for connection management
- SFTP channel for file operations
- Exec channel for command execution
- Authentication resolution order:
  1. SSH key at specified path
  2. SSH key at `~/.ssh/id_rsa` (default)
  3. Cached password from CredentialManager
  4. Prompt user for password
- Connection keep-alive support
- Auto-reconnect with exponential backoff

---

## 3. Multi-Project State Management

### 3.1 Zustand Store Extensions

```typescript
interface WorkspaceSlice {
  workspaces: Map<string, Workspace>;
  activeWorkspaceId: string | null;
  workspaceOrder: string[];
  providers: Map<string, ProviderState>;

  addWorkspace: (config: ProviderConfig) => Promise<string>;
  removeWorkspace: (id: string) => Promise<void>;
  setActiveWorkspace: (id: string) => void;
  reorderWorkspaces: (fromIndex: number, toIndex: number) => void;
  connectProvider: (id: string) => Promise<void>;
  disconnectProvider: (id: string) => Promise<void>;
}
```

### 3.2 Workspace Isolation

Each workspace maintains isolated state:

| State | Isolation Level | Reason |
|-------|-----------------|--------|
| `sessionId` | Per-workspace | Different Claude sessions per project |
| `expandedFolders` | Per-workspace | File tree state independent |
| `selectedFile` | Per-workspace | Preview context independent |
| `fileActivity` | Per-workspace | Track modifications per project |
| `messages` | Per-session | Already session-scoped |

### 3.3 Persistence

- Workspace configurations persisted to localStorage
- Credentials stored in system keychain (primary) or encrypted file (fallback)
- Connection state NOT persisted (re-established on load)

---

## 4. Security & Credentials

### 4.1 Credential Storage

**Primary: System Keychain**
- macOS: Keychain Access
- Windows: Credential Manager
- Linux: Secret Service (GNOME Keyring/KWallet)

**Fallback: Encrypted File Storage**
- AES-256-GCM encryption
- Key derived from master password using scrypt
- Stored at `~/.claude/credentials.enc`

### 4.2 Security Controls

| Threat | Mitigation |
|--------|------------|
| Path traversal | `PathValidator.validate()` with canonical path check |
| Command injection | `CommandSanitizer` blocklist + argument escaping |
| Credential theft | System keychain or AES-256-GCM encrypted storage |
| Brute force auth | `AuthRateLimiter` - 5 attempts/minute |
| Memory exposure | Credentials never logged, cleared after use |
| Man-in-the-middle | SSH host key verification |

### 4.3 Key Naming Convention

```typescript
type CredentialKey =
  | `ssh:${host}:${username}:password`
  | `ssh:${host}:${username}:passphrase`
  | `git:${repoUrl}:token`
  | `provider:${providerId}:secret`;
```

---

## 5. Error Handling & Recovery

### 5.1 Error Hierarchy

```typescript
class WorkspaceError extends Error {
  code: string;
  recoverable: boolean;
  provider?: string;
  context?: Record<string, unknown>;
}

// Specific types
class ConnectionError extends WorkspaceError {}
class AuthenticationError extends WorkspaceError {}
class TimeoutError extends WorkspaceError {}
class FileSystemError extends WorkspaceError {}
class SecurityError extends WorkspaceError {}
```

### 5.2 Recovery Strategies

| Error Type | Recovery Strategy | User Experience |
|------------|-------------------|-----------------|
| Connection lost | Auto-retry 3x with backoff → prompt | Banner with retry button |
| Auth failed | Clear cached creds → prompt for new | Modal credential dialog |
| Timeout | Offer retry with 2x timeout | Toast with retry action |
| File not found | Show error, keep UI functional | Toast notification |
| Permission denied | Degrade to read-only mode | Mode indicator + toast |
| Path traversal | Block operation, log incident | Error toast (no retry) |

### 5.3 Graceful Degradation States

```typescript
type DegradedLevel = 'full' | 'readonly' | 'offline' | 'error';

const capabilities: Record<DegradedLevel, Capability[]> = {
  full: ['read-files', 'write-files', 'execute-commands', 'git-operations', 'file-watch'],
  readonly: ['read-files', 'git-operations'],
  offline: [],  // Cached data only
  error: [],
};
```

---

## 6. UI Components

### 6.1 Component Inventory

| Component | Purpose |
|-----------|---------|
| `WorkspaceTabBar` | Tab strip with drag-reorder, status indicators |
| `AddWorkspaceDialog` | Type selector + provider-specific forms |
| `SSHWorkspaceForm` | SSH config with auth methods, test connection |
| `GitWorkspaceForm` | Repo URL parsing, branch selection |
| `LocalWorkspaceForm` | Directory picker |
| `WorkspaceContextIndicator` | Active workspace badge in chat |
| `WorkspaceAwareFileTree` | File browser with provider abstraction |
| `WorkspaceSettingsPanel` | Per-workspace configuration |
| `CredentialPrompt` | Password/passphrase modal |
| `ConnectionErrorBanner` | Disconnect notification with retry |
| `DegradedModeIndicator` | Read-only/offline status badge |

### 6.2 Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ WorkspaceTabBar                                                  │
│ [Local: /project] [SSH: server] [Git: repo] [+]                 │
├──────────────┬──────────────────────────────┬───────────────────┤
│ Sidebar      │ Main Content                 │ Right Panel       │
│ SessionList  │ ConnectionStatusBar          │ FilePreviewPane   │
│ (per-ws)     │ ChatInterface                │ (workspace-aware) │
│              │ ChatInput + WorkspaceContext │                   │
└──────────────┴──────────────────────────────┴───────────────────┘
```

---

## 7. Data Flow

### 7.1 API Routes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/workspace/connect` | POST | Establish provider connection |
| `/api/workspace/disconnect` | POST | Close provider connection |
| `/api/workspace/status` | GET | Get connection status |
| `/api/workspace/files` | GET | List directory contents |
| `/api/workspace/files/[...path]` | GET | Read file content |
| `/api/workspace/files/[...path]` | PUT | Write file content |
| `/api/workspace/files/[...path]` | DELETE | Delete file/directory |
| `/api/workspace/exec` | POST | Execute command |
| `/api/workspace/git/status` | GET | Get git status |
| `/api/workspace/git/branches` | GET | List branches |

### 7.2 Key Flows

1. **Add SSH Workspace**: UI → Store → API → SSHProvider.connect() → Auth resolution → UI update
2. **Read File**: FileTree → API → Provider.readFile() → Error recovery → Response
3. **Execute Command**: Chat → Claude CLI → Provider.exec() → Stream results
4. **Clone Git Repo**: Form → API → GitProvider.clone() → Progress SSE → LocalProvider delegate
5. **Connection Recovery**: Disconnect event → Auto-retry with backoff → UI degradation → Reconnect

---

## 8. Files Requiring Changes

### 8.1 New Files to Create

```
src/
├── lib/
│   ├── workspace/
│   │   ├── WorkspaceManager.ts
│   │   ├── WorkspaceProvider.ts
│   │   ├── providers/
│   │   │   ├── LocalProvider.ts
│   │   │   ├── GitProvider.ts
│   │   │   └── SSHProvider.ts
│   │   ├── CredentialManager.ts
│   │   ├── CredentialStore.ts
│   │   ├── KeychainStore.ts
│   │   ├── EncryptedFileStore.ts
│   │   ├── ErrorRecovery.ts
│   │   └── types.ts
│   └── store/
│       └── workspaces.ts
├── app/api/workspace/
│   ├── connect/route.ts
│   ├── disconnect/route.ts
│   ├── status/route.ts
│   ├── files/route.ts
│   ├── files/[...path]/route.ts
│   ├── exec/route.ts
│   └── git/
│       ├── status/route.ts
│       └── branches/route.ts
└── components/
    └── workspace/
        ├── WorkspaceTabBar.tsx
        ├── WorkspaceTab.tsx
        ├── AddWorkspaceDialog.tsx
        ├── WorkspaceTypeSelector.tsx
        ├── SSHWorkspaceForm.tsx
        ├── GitWorkspaceForm.tsx
        ├── LocalWorkspaceForm.tsx
        ├── WorkspaceContextIndicator.tsx
        ├── WorkspaceSettingsPanel.tsx
        ├── CredentialPrompt.tsx
        ├── ConnectionErrorBanner.tsx
        └── DegradedModeIndicator.tsx
```

### 8.2 Files to Modify (19 with hardcoded `/workspace`)

| File | Changes Required |
|------|------------------|
| `src/lib/store/index.ts` | Use workspace context instead of hardcoded cwd |
| `src/app/api/claude/route.ts` | Accept workspaceId, route through provider |
| `src/app/api/claude/init/route.ts` | Workspace-aware initialization |
| `src/app/api/files/route.ts` | Migrate to workspace API or deprecate |
| `src/app/api/files/git-status/route.ts` | Route through GitProvider |
| `src/app/api/files/[...path]/route.ts` | Migrate to workspace API |
| `src/app/api/upload/route.ts` | Workspace-aware upload paths |
| `src/app/api/uploads/serve/route.ts` | Workspace-aware serving |
| `src/app/api/uploads/cleanup/route.ts` | Workspace-aware cleanup |
| `src/hooks/useCliPrewarm.ts` | Workspace context |
| `src/components/files/FileTree.tsx` | Use workspace provider |
| `src/components/files/FilePreviewPane.tsx` | Workspace-aware preview |
| `src/components/sidebar/ProjectList.tsx` | Multi-workspace awareness |
| `src/components/chat/ToolExecution.tsx` | Workspace context for paths |
| `src/app/preview/page.tsx` | Workspace-aware preview |
| `scripts/terminal-server.ts` | Workspace-aware terminal |

---

## 9. Implementation Phases

### Phase 1: Foundation (Week 1)
- WorkspaceProvider interface
- LocalProvider implementation
- WorkspaceManager basic lifecycle
- Zustand workspace store
- Migrate existing `/workspace` references

### Phase 2: Git Provider (Week 2)
- GitProvider implementation
- Clone with progress
- Branch management
- LocalProvider delegation

### Phase 3: SSH Provider (Week 3-4)
- SSHProvider implementation
- SFTP file operations
- Remote command execution
- Connection management

### Phase 4: Credentials & Security (Week 5)
- CredentialManager
- Keychain integration
- Encrypted file fallback
- Security controls

### Phase 5: UI Components (Week 6-7)
- WorkspaceTabBar
- AddWorkspaceDialog
- Provider-specific forms
- Connection status UI

### Phase 6: Error Handling & Polish (Week 8)
- ErrorRecoveryManager
- Graceful degradation
- Testing & documentation

---

## 10. Dependencies

### New NPM Packages

```json
{
  "ssh2": "^1.15.0",
  "keytar": "^7.9.0",
  "simple-git": "^3.22.0"
}
```

### Peer Dependencies

- Node.js 20+ (for native crypto)
- Platform-specific keychain support (optional)

---

## Appendix A: Decision Log

| Decision | Rationale |
|----------|-----------|
| Provider abstraction over direct API | Enables future providers without core changes |
| System keychain primary | Most secure, follows platform conventions |
| Clone to local cache | Full performance, git operations work natively |
| Per-workspace state isolation | Independent file trees, sessions, activity |
| Graceful degradation | Better UX than hard failures |

---

## Appendix B: Open Questions for Ralph Loop Review

1. **SSH Keep-alive Strategy**: What's the optimal ping interval for persistent connections?
2. **Git Clone Storage**: Should `~/.claude-workspaces/` be configurable?
3. **Credential Prompt UX**: Modal vs inline form for auth prompts?
4. **Connection Pooling**: Singleton connections per host or per workspace?
5. **Tab Limit**: Should we limit max open workspaces?
