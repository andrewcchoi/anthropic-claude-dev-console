/**
 * PathValidator
 * Secure path validation to prevent traversal attacks
 * Uses TOCTOU-safe techniques
 */

import { resolve, relative, normalize } from 'path';
import { realpath, stat } from 'fs/promises';
import { SecurityError } from '../errors';

export class PathValidator {
  private readonly rootPath: string;
  private readonly normalizedRoot: string;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
    this.normalizedRoot = normalize(resolve(rootPath));
  }

  /**
   * Validate that a path is within the workspace root
   * Returns the canonical (resolved) path
   * @throws SecurityError if path escapes workspace
   */
  async validate(requestedPath: string): Promise<string> {
    // Normalize and resolve the path
    const normalizedPath = normalize(requestedPath);
    const fullPath = requestedPath.startsWith('/')
      ? normalizedPath
      : resolve(this.normalizedRoot, normalizedPath);

    // Quick check before filesystem access
    if (!this.isWithinRoot(fullPath)) {
      throw new SecurityError(
        'PATH_TRAVERSAL',
        `Access denied: path '${requestedPath}' is outside workspace`,
        { context: { requestedPath, rootPath: this.rootPath } }
      );
    }

    // For existing paths, verify the canonical path
    try {
      const canonicalPath = await realpath(fullPath);
      if (!this.isWithinRoot(canonicalPath)) {
        throw new SecurityError(
          'PATH_TRAVERSAL',
          `Access denied: resolved path escapes workspace boundary`,
          { context: { requestedPath, canonicalPath, rootPath: this.rootPath } }
        );
      }
      return canonicalPath;
    } catch (error) {
      // Path doesn't exist yet - validate parent directory
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return this.validateNonExistent(fullPath, requestedPath);
      }
      throw error;
    }
  }

  /**
   * Validate a path that doesn't exist yet
   * Checks that the parent directory is within workspace
   */
  private async validateNonExistent(fullPath: string, requestedPath: string): Promise<string> {
    // Walk up the path tree to find an existing parent
    const parts = fullPath.split('/');
    let existingParent = '';

    for (let i = parts.length - 1; i >= 0; i--) {
      const parentPath = parts.slice(0, i).join('/') || '/';
      try {
        await stat(parentPath);
        existingParent = parentPath;
        break;
      } catch {
        continue;
      }
    }

    if (existingParent) {
      const canonicalParent = await realpath(existingParent);
      if (!this.isWithinRoot(canonicalParent)) {
        throw new SecurityError(
          'PATH_TRAVERSAL',
          `Access denied: parent directory escapes workspace boundary`,
          { context: { requestedPath, parentPath: existingParent, rootPath: this.rootPath } }
        );
      }
    }

    // Validate the full path doesn't contain traversal
    if (this.containsTraversal(fullPath)) {
      throw new SecurityError(
        'PATH_TRAVERSAL',
        `Access denied: path contains traversal sequences`,
        { context: { requestedPath, rootPath: this.rootPath } }
      );
    }

    return fullPath;
  }

  /**
   * Check if a normalized path is within the root
   */
  private isWithinRoot(path: string): boolean {
    const normalizedPath = normalize(resolve(path));

    // Must start with root path
    if (!normalizedPath.startsWith(this.normalizedRoot)) {
      return false;
    }

    // Ensure it's not just a prefix match (e.g., /workspace vs /workspace-other)
    const remainder = normalizedPath.slice(this.normalizedRoot.length);
    return remainder === '' || remainder.startsWith('/');
  }

  /**
   * Check for path traversal sequences
   */
  private containsTraversal(path: string): boolean {
    const normalized = normalize(path);
    const parts = normalized.split('/');

    // Check for .. that escapes root
    let depth = 0;
    for (const part of parts) {
      if (part === '..') {
        depth--;
        if (depth < 0) return true;
      } else if (part !== '' && part !== '.') {
        depth++;
      }
    }

    return false;
  }

  /**
   * Get relative path from workspace root
   */
  getRelativePath(absolutePath: string): string {
    return relative(this.normalizedRoot, absolutePath);
  }

  /**
   * Resolve a relative path to absolute
   */
  resolvePath(relativePath: string): string {
    return resolve(this.normalizedRoot, relativePath);
  }

  /**
   * Synchronous validation for quick checks (less secure)
   * Use validate() for full security
   */
  validateSync(requestedPath: string): string {
    const normalizedPath = normalize(requestedPath);
    const fullPath = requestedPath.startsWith('/')
      ? normalizedPath
      : resolve(this.normalizedRoot, normalizedPath);

    if (!this.isWithinRoot(fullPath)) {
      throw new SecurityError(
        'PATH_TRAVERSAL',
        `Access denied: path '${requestedPath}' is outside workspace`,
        { context: { requestedPath, rootPath: this.rootPath } }
      );
    }

    if (this.containsTraversal(fullPath)) {
      throw new SecurityError(
        'PATH_TRAVERSAL',
        `Access denied: path contains traversal sequences`,
        { context: { requestedPath, rootPath: this.rootPath } }
      );
    }

    return fullPath;
  }
}
