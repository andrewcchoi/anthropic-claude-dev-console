import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const WORKSPACE_ROOT = '/workspace';

interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modifiedAt?: string;
}

/**
 * GET /api/files?path=/workspace
 * List directory contents
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dirPath = searchParams.get('path') || WORKSPACE_ROOT;

    // Security: canonicalize and validate path is within workspace
    const canonicalPath = path.resolve(dirPath);
    if (!canonicalPath.startsWith(WORKSPACE_ROOT)) {
      return NextResponse.json(
        { error: 'Access denied: path outside workspace' },
        { status: 403 }
      );
    }

    // Check if directory exists
    const stats = await fs.stat(canonicalPath);
    if (!stats.isDirectory()) {
      return NextResponse.json(
        { error: 'Path is not a directory' },
        { status: 400 }
      );
    }

    // Read directory contents
    const entries = await fs.readdir(canonicalPath, { withFileTypes: true });

    const items: FileItem[] = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(canonicalPath, entry.name);
        const stats = await fs.stat(fullPath);

        return {
          name: entry.name,
          path: fullPath,
          type: entry.isDirectory() ? 'directory' : 'file',
          size: entry.isFile() ? stats.size : undefined,
          modifiedAt: stats.mtime.toISOString(),
        };
      })
    );

    // Sort: directories first, then alphabetically
    items.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ items });
  } catch (error: any) {
    console.error('Error listing directory:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list directory' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/files
 * Create file or folder
 * Body: { path: string, type: 'file' | 'directory', content?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path: targetPath, type, content = '' } = body;

    if (!targetPath || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: path, type' },
        { status: 400 }
      );
    }

    // Security: canonicalize and validate path
    const canonicalPath = path.resolve(targetPath);
    if (!canonicalPath.startsWith(WORKSPACE_ROOT)) {
      return NextResponse.json(
        { error: 'Access denied: path outside workspace' },
        { status: 403 }
      );
    }

    // Check if already exists
    try {
      await fs.access(canonicalPath);
      return NextResponse.json(
        { error: 'File or directory already exists' },
        { status: 409 }
      );
    } catch {
      // Good, doesn't exist
    }

    // Create parent directories if needed
    await fs.mkdir(path.dirname(canonicalPath), { recursive: true });

    if (type === 'directory') {
      await fs.mkdir(canonicalPath, { recursive: true });
    } else {
      await fs.writeFile(canonicalPath, content, 'utf-8');
    }

    return NextResponse.json({
      success: true,
      path: canonicalPath,
      type,
    });
  } catch (error: any) {
    console.error('Error creating file/directory:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create file/directory' },
      { status: 500 }
    );
  }
}
