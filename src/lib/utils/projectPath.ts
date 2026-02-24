/**
 * Project path encoding/decoding utilities
 *
 * The Claude CLI stores sessions in directories named by encoded paths:
 * - "/workspace" → "-workspace"
 * - "/workspace/docs" → "-workspace-docs"
 * - "/home/user/project" → "-home-user-project"
 */

/**
 * Encode a filesystem path to a project ID (directory name)
 * @param path - Filesystem path (e.g., "/workspace/docs")
 * @returns Encoded project ID (e.g., "-workspace-docs")
 */
export function encodeProjectPath(path: string): string {
  return path.replace(/\//g, '-');
}

/**
 * Decode a project ID to a filesystem path
 * @param encoded - Encoded project ID (e.g., "-workspace-docs")
 * @returns Filesystem path (e.g., "/workspace/docs")
 */
export function decodeProjectPath(encoded: string): string {
  if (encoded.startsWith('-')) {
    return '/' + encoded.slice(1).replace(/-/g, '/');
  }
  return '/' + encoded.replace(/-/g, '/');
}

/**
 * Get project ID from workspace
 * @param workspaceId - Workspace UUID
 * @param workspaces - Workspace map from store
 * @returns Encoded project ID or undefined if workspace not found
 */
export function getProjectIdFromWorkspace(
  workspaceId: string | undefined,
  workspaces: Map<string, { rootPath: string }>
): string | undefined {
  if (!workspaceId) return undefined;

  const workspace = workspaces.get(workspaceId);
  if (!workspace) return undefined;

  return encodeProjectPath(workspace.rootPath);
}
