/**
 * Workspace Types
 * Core type definitions for the flexible workspace system
 */

// ============================================================================
// Provider Types
// ============================================================================

export type ProviderType = 'local' | 'git' | 'ssh';

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'degraded';

export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modifiedAt?: number;
  permissions?: string;
}

export interface FileStat {
  size: number;
  modifiedAt: number;
  createdAt: number;
  isDirectory: boolean;
  isFile: boolean;
  permissions?: string;
}

export interface ExecOptions {
  cwd?: string;
  timeout?: number;
  env?: Record<string, string>;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface WatchCallback {
  (event: 'change' | 'add' | 'unlink', path: string): void;
}

export interface Disposable {
  dispose(): void;
}

export interface GitStatus {
  branch: string;
  modified: string[];
  staged: string[];
  untracked: string[];
  ahead: number;
  behind: number;
}

// ============================================================================
// Provider Configuration
// ============================================================================

export interface BaseProviderConfig {
  id?: string;
  name?: string;
}

export interface LocalProviderConfig extends BaseProviderConfig {
  type: 'local';
  path: string;
}

export interface GitProviderConfig extends BaseProviderConfig {
  type: 'git';
  repoUrl: string;
  branch?: string;
  cloneDepth?: number;
  sparseCheckout?: string[];
}

export interface SSHProviderConfig extends BaseProviderConfig {
  type: 'ssh';
  host: string;
  port?: number;
  username: string;
  authMethod?: 'key' | 'password';
  keyPath?: string;
  remotePath: string;
  hostKeyVerification?: 'strict' | 'tofu' | 'ask';
  persistConnection?: boolean;
  reconnectOnFailure?: boolean;

  // Tailscale integration
  tailscale?: {
    /** Enable Tailscale for this connection */
    enabled: boolean;
    /** Tailscale device ID (required - unique identifier) */
    deviceId: string;
    /** Use Magic DNS instead of IP (default: false) */
    useMagicDNS?: boolean;
    /** Fail if connection would use DERP relay (default: false) */
    requireDirect?: boolean;
  };
}

export type ProviderConfig =
  | LocalProviderConfig
  | GitProviderConfig
  | SSHProviderConfig;

// ============================================================================
// Workspace Types
// ============================================================================

export interface Workspace {
  id: string;
  projectId: string;  // NEW: CLI project ID (encoded path)
  name: string;
  providerId: string;
  providerType: ProviderType;
  rootPath: string;
  color: string;

  // Session association
  sessionId: string | null;  // DEPRECATED: Use activeSessionId
  activeSessionId: string | null;  // NEW: Currently active session
  sessionIds: string[];  // Track all sessions for this workspace
  lastActiveSessionId?: string;  // Last active session for auto-restore

  // Per-workspace UI state
  expandedFolders: Set<string>;
  selectedFile: string | null;
  fileActivity: Map<string, 'read' | 'modified'>;

  // Metadata
  createdAt: number;
  lastAccessedAt: number;
  isArchived?: boolean;  // NEW: Soft delete
  isPinned?: boolean;
}

export interface WorkspaceConfig {
  name?: string;
  color?: string;
  autoConnect?: boolean;
}

// ============================================================================
// Provider State
// ============================================================================

export interface ProviderState {
  id: string;
  config: ProviderConfig;
  status: ConnectionStatus;
  error?: string;
  lastConnected?: number;
  connectionSettings: {
    persistConnection: boolean;
    reconnectOnFailure: boolean;
  };
}

// ============================================================================
// Events
// ============================================================================

export interface WorkspaceEvents {
  'workspace:added': { workspace: Workspace };
  'workspace:removed': { workspaceId: string };
  'workspace:activated': { workspace: Workspace };

  'provider:connected': { providerId: string };
  'provider:disconnected': { providerId: string; error?: Error };
  'provider:reconnecting': { providerId: string; attempt: number };

  'auth:required': { providerId: string; authType: 'password' | 'passphrase' };
  'auth:success': { providerId: string };
  'auth:failed': { providerId: string; error: Error };

  'file:changed': { providerId: string; path: string; type: 'change' | 'add' | 'unlink' };
  'file:conflict': { providerId: string; path: string };

  'error': { error: WorkspaceError; context: string };
}

// ============================================================================
// Errors
// ============================================================================

export type WorkspaceErrorCode =
  | 'CONNECTION_ERROR'
  | 'AUTH_ERROR'
  | 'TIMEOUT'
  | 'FS_ERROR'
  | 'PATH_TRAVERSAL'
  | 'BLOCKED_COMMAND'
  | 'LOCK_TIMEOUT'
  | 'LIMIT_ERROR'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'CONFLICT'
  // Tailscale-specific error codes
  | 'TAILSCALE_NOT_INSTALLED'
  | 'TAILSCALE_VERSION_ERROR'
  | 'TAILSCALE_NOT_LOGGED_IN'
  | 'TAILSCALE_NOT_CONNECTED'
  | 'TAILSCALE_DEVICE_NOT_FOUND'
  | 'TAILSCALE_DEVICE_OFFLINE'
  | 'TAILSCALE_RELAY_NOT_ALLOWED'
  | 'TAILSCALE_TIMEOUT'
  | 'TAILSCALE_PERMISSION_DENIED'
  | 'TAILSCALE_HOSTNAME_COLLISION'
  | 'TAILSCALE_INVALID_IP'
  | 'TAILSCALE_INVALID_HOSTNAME'
  | 'SSH_NOT_AVAILABLE';

export interface WorkspaceError extends Error {
  code: WorkspaceErrorCode;
  recoverable: boolean;
  provider?: string;
  context?: Record<string, unknown>;
}

// ============================================================================
// Limits
// ============================================================================

export const WORKSPACE_LIMITS = {
  maxWorkspaces: 20,
  maxConnectionsPerHost: 5,
  maxTotalConnections: 50,
  maxCloneStorageGB: 10,
  connectionIdleTimeoutMs: 30 * 60 * 1000, // 30 minutes
  fileLockTimeoutMs: 5000,
  maxFileSize: 50 * 1024 * 1024, // 50MB
} as const;

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export interface ProgressCallback {
  (progress: { current: number; total: number; message?: string }): void;
}
