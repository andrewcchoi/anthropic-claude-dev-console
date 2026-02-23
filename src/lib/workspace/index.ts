/**
 * Workspace Module
 * Main exports for the workspace system
 */

// Types
export type * from './types';

// Errors
export {
  WorkspaceError,
  ValidationError,
  NotFoundError,
  ConnectionError,
  LimitError,
  FileSystemError,
  TimeoutError,
  wrapError,
} from './errors';

// Provider interface
export type { WorkspaceProvider } from './WorkspaceProvider';
export type { ProviderCapabilities } from './WorkspaceProvider';
export { getProviderCapabilities } from './WorkspaceProvider';

// Provider implementations
export { BaseProvider } from './providers/BaseProvider';
export type { BaseProviderConfig } from './providers/BaseProvider';
export { LocalProvider } from './providers/LocalProvider';
export { GitProvider } from './providers/GitProvider';

// Security
export { PathValidator } from './security/PathValidator';
export { CommandValidator, commandValidator } from './security/CommandValidator';
export type { ValidationResult } from './security/CommandValidator';
export { FileLockManager, fileLockManager } from './security/FileLockManager';
export type { LockHandle } from './security/FileLockManager';

// Manager
export { WorkspaceManager, workspaceManager } from './WorkspaceManager';
