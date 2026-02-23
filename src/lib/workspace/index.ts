/**
 * Workspace Module
 * Main exports for the workspace system
 */

// Types
export * from './types';

// Errors
export * from './errors';

// Provider interface
export { WorkspaceProvider, getProviderCapabilities, type ProviderCapabilities } from './WorkspaceProvider';

// Provider implementations
export { BaseProvider, type BaseProviderConfig } from './providers/BaseProvider';
export { LocalProvider } from './providers/LocalProvider';

// Security
export { PathValidator } from './security/PathValidator';
export { CommandValidator, commandValidator, type ValidationResult } from './security/CommandValidator';
export { FileLockManager, fileLockManager, type LockHandle } from './security/FileLockManager';

// Manager
export { WorkspaceManager, workspaceManager } from './WorkspaceManager';
