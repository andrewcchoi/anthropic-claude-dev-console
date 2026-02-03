import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const WORKSPACE_ROOT = '/workspace';

interface RouteContext {
  params: Promise<{
    path: string[];
  }>;
}

/**
 * GET /api/files/[...path]
 * Read file contents
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const params = await context.params;
    const filePath = path.join(WORKSPACE_ROOT, ...params.path);

    // Security: canonicalize and validate path
    const canonicalPath = path.resolve(filePath);
    if (!canonicalPath.startsWith(WORKSPACE_ROOT)) {
      return NextResponse.json(
        { error: 'Access denied: path outside workspace' },
        { status: 403 }
      );
    }

    // Check if file exists
    const stats = await fs.stat(canonicalPath);
    if (!stats.isFile()) {
      return NextResponse.json(
        { error: 'Path is not a file' },
        { status: 400 }
      );
    }

    // Check file size (limit to 1MB for preview)
    if (stats.size > 1024 * 1024) {
      return NextResponse.json({
        path: canonicalPath,
        size: stats.size,
        tooLarge: true,
        message: 'File exceeds 1MB preview limit',
      });
    }

    // Read file contents
    const content = await fs.readFile(canonicalPath, 'utf-8');

    return NextResponse.json({
      path: canonicalPath,
      content,
      size: stats.size,
      modifiedAt: stats.mtime.toISOString(),
    });
  } catch (error: any) {
    // Check if binary file error
    if (error.code === 'ERR_INVALID_ARG_VALUE' || error.message?.includes('Invalid')) {
      return NextResponse.json(
        { error: 'Cannot preview binary file', binary: true },
        { status: 400 }
      );
    }

    console.error('Error reading file:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to read file' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/files/[...path]
 * Delete file or folder
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const params = await context.params;
    const targetPath = path.join(WORKSPACE_ROOT, ...params.path);

    // Security: canonicalize and validate path
    const canonicalPath = path.resolve(targetPath);
    if (!canonicalPath.startsWith(WORKSPACE_ROOT)) {
      return NextResponse.json(
        { error: 'Access denied: path outside workspace' },
        { status: 403 }
      );
    }

    // Prevent deleting workspace root
    if (canonicalPath === WORKSPACE_ROOT) {
      return NextResponse.json(
        { error: 'Cannot delete workspace root' },
        { status: 403 }
      );
    }

    // Check if exists
    const stats = await fs.stat(canonicalPath);

    if (stats.isDirectory()) {
      await fs.rm(canonicalPath, { recursive: true, force: true });
    } else {
      await fs.unlink(canonicalPath);
    }

    return NextResponse.json({
      success: true,
      path: canonicalPath,
      type: stats.isDirectory() ? 'directory' : 'file',
    });
  } catch (error: any) {
    console.error('Error deleting file/directory:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete file/directory' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/files/[...path]
 * Rename file or folder
 * Body: { newPath: string }
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const params = await context.params;
    const oldPath = path.join(WORKSPACE_ROOT, ...params.path);
    const body = await request.json();
    const { newPath } = body;

    if (!newPath) {
      return NextResponse.json(
        { error: 'Missing required field: newPath' },
        { status: 400 }
      );
    }

    // Security: canonicalize and validate both paths
    const canonicalOldPath = path.resolve(oldPath);
    const canonicalNewPath = path.resolve(newPath);

    if (!canonicalOldPath.startsWith(WORKSPACE_ROOT) || !canonicalNewPath.startsWith(WORKSPACE_ROOT)) {
      return NextResponse.json(
        { error: 'Access denied: path outside workspace' },
        { status: 403 }
      );
    }

    // Check if old path exists
    await fs.stat(canonicalOldPath);

    // Check if new path already exists
    try {
      await fs.access(canonicalNewPath);
      return NextResponse.json(
        { error: 'Target path already exists' },
        { status: 409 }
      );
    } catch {
      // Good, doesn't exist
    }

    // Rename
    await fs.rename(canonicalOldPath, canonicalNewPath);

    return NextResponse.json({
      success: true,
      oldPath: canonicalOldPath,
      newPath: canonicalNewPath,
    });
  } catch (error: any) {
    console.error('Error renaming file/directory:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to rename file/directory' },
      { status: 500 }
    );
  }
}
