import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);
const WORKSPACE_ROOT = '/workspace';

interface GitStatus {
  modified: string[];
  untracked: string[];
  ignored: string[];
}

/**
 * GET /api/files/git-status?path=/workspace
 * Get git status for directory
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dirPath = searchParams.get('path') || WORKSPACE_ROOT;

    // Security: canonicalize and validate path
    const canonicalPath = path.resolve(dirPath);
    if (!canonicalPath.startsWith(WORKSPACE_ROOT)) {
      return NextResponse.json(
        { error: 'Access denied: path outside workspace' },
        { status: 403 }
      );
    }

    // Check if it's a git repository
    try {
      await execAsync('git rev-parse --git-dir', { cwd: canonicalPath });
    } catch {
      return NextResponse.json({
        isGitRepo: false,
        modified: [],
        untracked: [],
        ignored: [],
      });
    }

    const status: GitStatus = {
      modified: [],
      untracked: [],
      ignored: [],
    };

    // Get modified files (including staged and unstaged)
    try {
      const { stdout: modifiedOutput } = await execAsync(
        'git status --porcelain',
        { cwd: canonicalPath }
      );

      if (modifiedOutput.trim()) {
        for (const line of modifiedOutput.trim().split('\n')) {
          const statusCode = line.substring(0, 2);
          const filePath = path.join(canonicalPath, line.substring(3));

          if (statusCode.includes('?')) {
            status.untracked.push(filePath);
          } else if (statusCode.trim()) {
            status.modified.push(filePath);
          }
        }
      }
    } catch (error) {
      console.error('Error getting modified files:', error);
    }

    // Get ignored files (check common patterns)
    try {
      const { stdout: ignoredOutput } = await execAsync(
        'git status --ignored --porcelain',
        { cwd: canonicalPath }
      );

      if (ignoredOutput.trim()) {
        for (const line of ignoredOutput.trim().split('\n')) {
          if (line.startsWith('!!')) {
            const filePath = path.join(canonicalPath, line.substring(3));
            status.ignored.push(filePath);
          }
        }
      }
    } catch (error) {
      console.error('Error getting ignored files:', error);
    }

    return NextResponse.json({
      isGitRepo: true,
      ...status,
    });
  } catch (error: any) {
    console.error('Error getting git status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get git status' },
      { status: 500 }
    );
  }
}
