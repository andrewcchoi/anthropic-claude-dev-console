/**
 * Type validators for runtime type checking
 *
 * These validators help catch type mismatches at call sites, particularly:
 * - UUID vs encoded path (projectId) confusion
 * - Session ID format validation
 *
 * Used by call-site audits to catch parameter type bugs.
 */

/**
 * UUID v4 regex pattern
 * Format: 8-4-4-4-12 hex characters (e.g., "ca31cb4c-1234-5678-9abc-def012345678")
 */
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Check if a string is a valid UUID v4 format
 * @param str - String to check
 * @returns true if the string matches UUID v4 format
 *
 * @example
 * isUUID('ca31cb4c-1234-5678-9abc-def012345678') // true
 * isUUID('-workspace-docs') // false
 * isUUID('session-123') // false
 */
export function isUUID(str: string | undefined | null): boolean {
  if (!str) return false;
  return UUID_REGEX.test(str);
}

/**
 * Project ID regex pattern
 * Format: Encoded directory path starting with "-" (e.g., "-workspace-docs", "-home-user-project")
 * These are filesystem paths with "/" replaced by "-"
 */
export const PROJECT_ID_REGEX = /^-[\w-]+$/;

/**
 * Check if a string is a valid project ID (encoded path)
 * @param str - String to check
 * @returns true if the string matches project ID format
 *
 * @example
 * isProjectId('-workspace-docs') // true
 * isProjectId('-workspace') // true
 * isProjectId('ca31cb4c-1234-5678-9abc-def012345678') // false (this is a UUID)
 * isProjectId('/workspace/docs') // false (not encoded)
 */
export function isProjectId(str: string | undefined | null): boolean {
  if (!str) return false;
  // Project IDs start with "-" but are NOT UUIDs
  // UUIDs also contain "-" but match a specific pattern
  if (isUUID(str)) return false;
  return PROJECT_ID_REGEX.test(str);
}

/**
 * Session ID regex pattern
 * Session IDs are UUIDs (v4 format)
 */
export const SESSION_ID_REGEX = UUID_REGEX;

/**
 * Check if a string is a valid session ID
 * Session IDs are UUID v4 format
 * @param str - String to check
 * @returns true if the string matches session ID format (UUID)
 *
 * @example
 * isSessionId('ca31cb4c-1234-5678-9abc-def012345678') // true
 * isSessionId('-workspace-docs') // false
 */
export function isSessionId(str: string | undefined | null): boolean {
  return isUUID(str);
}

/**
 * Workspace ID regex pattern
 * Workspace IDs are also UUIDs
 */
export const WORKSPACE_ID_REGEX = UUID_REGEX;

/**
 * Check if a string is a valid workspace ID
 * Workspace IDs are UUID v4 format
 * @param str - String to check
 * @returns true if the string matches workspace ID format (UUID)
 *
 * @example
 * isWorkspaceId('ca31cb4c-1234-5678-9abc-def012345678') // true
 * isWorkspaceId('-workspace-docs') // false
 */
export function isWorkspaceId(str: string | undefined | null): boolean {
  return isUUID(str);
}

/**
 * Type detection helper - identifies what type an ID appears to be
 * Useful for debugging and error messages
 * @param str - String to identify
 * @returns Description of the detected type
 */
export function identifyIdType(str: string | undefined | null): string {
  if (!str) return 'empty';
  if (isUUID(str)) return 'uuid (workspace/session ID)';
  if (isProjectId(str)) return 'project ID (encoded path)';
  if (str.startsWith('/')) return 'filesystem path (not encoded)';
  return 'unknown format';
}

/**
 * Assertion helper for type validation
 * Throws descriptive error if type doesn't match expected
 */
export function assertProjectId(str: string | undefined | null, context: string): asserts str is string {
  if (!str) {
    throw new Error(`${context}: Expected project ID but got empty value`);
  }
  if (isUUID(str)) {
    throw new Error(
      `${context}: Expected project ID (encoded path like "-workspace-docs") but got UUID "${str}". ` +
      `Use getProjectIdFromWorkspace() to convert workspace UUID to project ID.`
    );
  }
  if (!isProjectId(str)) {
    throw new Error(
      `${context}: Expected project ID (encoded path like "-workspace-docs") but got "${str}" (${identifyIdType(str)})`
    );
  }
}

/**
 * Assertion helper for session ID validation
 */
export function assertSessionId(str: string | undefined | null, context: string): asserts str is string {
  if (!str) {
    throw new Error(`${context}: Expected session ID but got empty value`);
  }
  if (!isSessionId(str)) {
    throw new Error(
      `${context}: Expected session ID (UUID format) but got "${str}" (${identifyIdType(str)})`
    );
  }
}
