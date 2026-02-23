/**
 * GET /api/workspace/files
 * List directory contents through workspace provider
 *
 * Query params:
 * - workspaceId: Workspace ID (required)
 * - path: Directory path relative to workspace root (default: /)
 */

import { NextRequest, NextResponse } from 'next/server';
import { workspaceManager, isWorkspaceError } from '@/lib/workspace';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspaceId');
    const path = searchParams.get('path') ?? '/';

    // For backwards compatibility, if no workspaceId provided,
    // try to use the active workspace or fall back to legacy behavior
    let provider;

    if (workspaceId) {
      provider = workspaceManager.getWorkspaceProvider(workspaceId);
      if (!provider) {
        return NextResponse.json(
          { error: 'Workspace not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }
    } else {
      // Try active workspace
      const activeWorkspace = workspaceManager.getActiveWorkspace();
      if (activeWorkspace) {
        provider = workspaceManager.getWorkspaceProvider(activeWorkspace.id);
      }
    }

    if (!provider) {
      // Legacy fallback: redirect to old API
      const legacyUrl = `/api/files?path=${encodeURIComponent(path)}`;
      return NextResponse.redirect(new URL(legacyUrl, request.url));
    }

    // Check connection
    if (!provider.isConnected()) {
      return NextResponse.json(
        { error: 'Provider not connected', code: 'CONNECTION_ERROR' },
        { status: 503 }
      );
    }

    // List directory
    const items = await provider.listDirectory(path);

    return NextResponse.json({
      items,
      path,
      workspaceId,
      rootPath: provider.rootPath,
    });
  } catch (error) {
    console.error('[API] Workspace files error:', error);

    if (isWorkspaceError(error)) {
      const status = error.code === 'NOT_FOUND' ? 404
        : error.code === 'PATH_TRAVERSAL' ? 403
        : error.code === 'PERMISSION_DENIED' ? 403
        : 500;

      return NextResponse.json(
        { error: error.message, code: error.code },
        { status }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list directory' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workspace/files
 * Create file or directory
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspaceId, path, type, content } = body as {
      workspaceId: string;
      path: string;
      type: 'file' | 'directory';
      content?: string;
    };

    if (!workspaceId || !path || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: workspaceId, path, type' },
        { status: 400 }
      );
    }

    const provider = workspaceManager.getWorkspaceProvider(workspaceId);
    if (!provider) {
      return NextResponse.json(
        { error: 'Workspace not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (!provider.isConnected()) {
      return NextResponse.json(
        { error: 'Provider not connected', code: 'CONNECTION_ERROR' },
        { status: 503 }
      );
    }

    if (type === 'directory') {
      await provider.createDirectory(path);
    } else {
      await provider.writeFile(path, Buffer.from(content ?? '', 'utf-8'));
    }

    return NextResponse.json({
      success: true,
      path,
      type,
    });
  } catch (error) {
    console.error('[API] Workspace files create error:', error);

    if (isWorkspaceError(error)) {
      const status = error.code === 'PATH_TRAVERSAL' ? 403
        : error.code === 'PERMISSION_DENIED' ? 403
        : error.code === 'CONFLICT' ? 409
        : 500;

      return NextResponse.json(
        { error: error.message, code: error.code },
        { status }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create' },
      { status: 500 }
    );
  }
}
