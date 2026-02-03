import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat, unlink, rmdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const UPLOAD_BASE_DIR = '/workspace/.claude-uploads';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

async function cleanupDirectory(dirPath: string): Promise<{ filesDeleted: number; dirsDeleted: number }> {
  let filesDeleted = 0;
  let dirsDeleted = 0;

  if (!existsSync(dirPath)) {
    return { filesDeleted, dirsDeleted };
  }

  const entries = await readdir(dirPath);
  const now = Date.now();

  for (const entry of entries) {
    const fullPath = join(dirPath, entry);
    const stats = await stat(fullPath);

    if (stats.isDirectory()) {
      // Recursively clean subdirectory
      const subResult = await cleanupDirectory(fullPath);
      filesDeleted += subResult.filesDeleted;
      dirsDeleted += subResult.dirsDeleted;

      // Try to remove directory if empty
      try {
        const remaining = await readdir(fullPath);
        if (remaining.length === 0) {
          await rmdir(fullPath);
          dirsDeleted++;
        }
      } catch {
        // Directory not empty or other error, skip
      }
    } else {
      // Check file age
      const fileAge = now - stats.mtimeMs;
      if (fileAge > MAX_AGE_MS) {
        await unlink(fullPath);
        filesDeleted++;
      }
    }
  }

  return { filesDeleted, dirsDeleted };
}

export async function POST(request: NextRequest) {
  try {
    const result = await cleanupDirectory(UPLOAD_BASE_DIR);

    return NextResponse.json({
      success: true,
      filesDeleted: result.filesDeleted,
      dirsDeleted: result.dirsDeleted,
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup uploads' },
      { status: 500 }
    );
  }
}
