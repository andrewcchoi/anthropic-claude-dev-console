/**
 * GET /api/workspace/status
 * Get status of all workspace providers
 */

import { NextRequest, NextResponse } from 'next/server';
import { workspaceManager } from '@/lib/workspace';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (id) {
      // Get specific provider status
      const provider = workspaceManager.getProvider(id);
      const state = workspaceManager.getProviderState(id);

      if (!provider || !state) {
        return NextResponse.json(
          { error: 'Provider not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        id,
        type: provider.type,
        name: provider.name,
        rootPath: provider.rootPath,
        status: state.status,
        error: state.error,
        lastConnected: state.lastConnected,
        connectionSettings: state.connectionSettings,
      });
    }

    // Get all workspaces
    const workspaces = workspaceManager.getWorkspaces().map(ws => {
      const provider = workspaceManager.getProvider(ws.providerId);
      const state = workspaceManager.getProviderState(ws.providerId);

      return {
        id: ws.id,
        name: ws.name,
        providerId: ws.providerId,
        providerType: ws.providerType,
        rootPath: ws.rootPath,
        color: ws.color,
        status: state?.status ?? 'disconnected',
        error: state?.error,
        lastAccessedAt: ws.lastAccessedAt,
      };
    });

    const activeWorkspace = workspaceManager.getActiveWorkspace();

    return NextResponse.json({
      workspaces,
      activeWorkspaceId: activeWorkspace?.id ?? null,
      count: workspaces.length,
    });
  } catch (error) {
    console.error('[API] Workspace status error:', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get status' },
      { status: 500 }
    );
  }
}
