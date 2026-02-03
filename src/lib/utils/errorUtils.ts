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
      const json = JSON.stringify(error);
      // Avoid just returning "{}" for empty objects
      return json === '{}' ? 'Unknown error (empty object)' : json;
    } catch {
      // String(error) on an object gives "[object Object]" - not useful
      // Try to extract any available info
      const keys = Object.keys(obj);
      if (keys.length > 0) {
        return `Error object with keys: ${keys.join(', ')}`;
      }
      return 'Unknown error (unserializable)';
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
