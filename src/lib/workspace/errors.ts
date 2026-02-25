/**
 * Workspace Error Classes
 * Hierarchical error types for workspace operations
 */

import { WorkspaceErrorCode } from './types';

export class WorkspaceError extends Error {
  readonly code: WorkspaceErrorCode;
  readonly recoverable: boolean;
  readonly provider?: string;
  readonly context?: Record<string, unknown>;

  constructor(
    code: WorkspaceErrorCode,
    message: string,
    options: {
      recoverable?: boolean;
      provider?: string;
      context?: Record<string, unknown>;
      cause?: Error;
    } = {}
  ) {
    super(message, { cause: options.cause });
    this.name = 'WorkspaceError';
    this.code = code;
    this.recoverable = options.recoverable ?? true;
    this.provider = options.provider;
    this.context = options.context;
  }
}

export class ConnectionError extends WorkspaceError {
  constructor(message: string, options?: { provider?: string; cause?: Error }) {
    super('CONNECTION_ERROR', message, { recoverable: true, ...options });
    this.name = 'ConnectionError';
  }
}

export class AuthenticationError extends WorkspaceError {
  readonly authType: 'password' | 'key' | 'passphrase';

  constructor(
    message: string,
    authType: 'password' | 'key' | 'passphrase',
    options?: { provider?: string }
  ) {
    super('AUTH_ERROR', message, { recoverable: true, ...options });
    this.name = 'AuthenticationError';
    this.authType = authType;
  }
}

export class TimeoutError extends WorkspaceError {
  readonly operation: string;
  readonly timeoutMs: number;

  constructor(operation: string, timeoutMs: number, options?: { provider?: string }) {
    super(
      'TIMEOUT',
      `Operation '${operation}' timed out after ${timeoutMs}ms`,
      {
        recoverable: true,
        context: { operation, timeoutMs },
        ...options,
      }
    );
    this.name = 'TimeoutError';
    this.operation = operation;
    this.timeoutMs = timeoutMs;
  }
}

export class FileSystemError extends WorkspaceError {
  readonly path: string;
  readonly operation: 'read' | 'write' | 'delete' | 'list' | 'stat' | 'mkdir';

  constructor(
    operation: 'read' | 'write' | 'delete' | 'list' | 'stat' | 'mkdir',
    path: string,
    options?: { cause?: Error; provider?: string }
  ) {
    super('FS_ERROR', `Failed to ${operation}: ${path}`, {
      recoverable: true,
      context: { path, operation },
      ...options,
    });
    this.name = 'FileSystemError';
    this.path = path;
    this.operation = operation;
  }
}

export class SecurityError extends WorkspaceError {
  constructor(
    code: 'PATH_TRAVERSAL' | 'BLOCKED_COMMAND' | 'PERMISSION_DENIED',
    message: string,
    options?: { context?: Record<string, unknown> }
  ) {
    super(code, message, { recoverable: false, ...options });
    this.name = 'SecurityError';
  }
}

export class LockTimeoutError extends WorkspaceError {
  readonly path: string;

  constructor(path: string) {
    super('LOCK_TIMEOUT', `Could not acquire lock for ${path}`, {
      recoverable: true,
      context: { path },
    });
    this.name = 'LockTimeoutError';
    this.path = path;
  }
}

export class LimitError extends WorkspaceError {
  readonly limitType: string;
  readonly current: number;
  readonly max: number;

  constructor(limitType: string, current: number, max: number) {
    super(
      'LIMIT_ERROR',
      `${limitType} limit reached: ${current}/${max}`,
      {
        recoverable: false,
        context: { limitType, current, max },
      }
    );
    this.name = 'LimitError';
    this.limitType = limitType;
    this.current = current;
    this.max = max;
  }
}

export class ValidationError extends WorkspaceError {
  readonly field?: string;

  constructor(message: string, field?: string) {
    super('VALIDATION_ERROR', message, {
      recoverable: true,
      context: field ? { field } : undefined,
    });
    this.name = 'ValidationError';
    this.field = field;
  }
}

export class NotFoundError extends WorkspaceError {
  readonly resourceType: 'file' | 'directory' | 'workspace' | 'provider';
  readonly path: string;

  constructor(
    resourceType: 'file' | 'directory' | 'workspace' | 'provider',
    path: string
  ) {
    super('NOT_FOUND', `${resourceType} not found: ${path}`, {
      recoverable: false,
      context: { resourceType, path },
    });
    this.name = 'NotFoundError';
    this.resourceType = resourceType;
    this.path = path;
  }
}

export class ConflictError extends WorkspaceError {
  readonly path: string;

  constructor(message: string, path: string) {
    super('CONFLICT', message, {
      recoverable: true,
      context: { path },
    });
    this.name = 'ConflictError';
    this.path = path;
  }
}

/**
 * Type guard to check if an error is a WorkspaceError
 */
export function isWorkspaceError(error: unknown): error is WorkspaceError {
  return error instanceof WorkspaceError;
}

/**
 * Wrap unknown errors in WorkspaceError
 */
export function wrapError(
  error: unknown,
  operation: string,
  provider?: string
): WorkspaceError {
  if (isWorkspaceError(error)) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  const cause = error instanceof Error ? error : undefined;

  return new WorkspaceError('FS_ERROR', `${operation}: ${message}`, {
    recoverable: true,
    provider,
    cause,
  });
}
