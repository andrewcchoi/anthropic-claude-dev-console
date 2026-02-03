/**
 * Error serialization utilities for handling various error types
 */

/**
 * Serialize any error type to a readable string
 * Handles Error objects, Monaco cancelation objects, and primitives
 */
export function serializeError(error: unknown): string {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;

  // Handle Monaco's {type: 'cancelation', msg: '...'} format
  if (typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    if (typeof obj.message === 'string') return obj.message;
    if (typeof obj.msg === 'string') return obj.msg;
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return String(error);
}

/**
 * Check if an error is a Monaco cancelation error
 * These are transient and should not be treated as fatal errors
 */
export function isMonacoCancelation(error: unknown): boolean {
  if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, unknown>;
    return obj.type === 'cancelation';
  }
  return false;
}
