/**
 * Git Status API Route
 * GET /api/workspace/git/status?workspaceId=<id>
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerLogger } from '@/lib/logger/server';
import { WorkspaceManager } from '@/lib/workspace/WorkspaceManager';
import { GitProvider } from '@/lib/workspace/providers/GitProvider';

// Singleton workspace manager
let workspaceManager: WorkspaceManager | null = null;

function getWorkspaceManager(): WorkspaceManager {
  if (!workspaceManager) {
    workspaceManager = new WorkspaceManager();
  }
  return workspaceManager;
}

export async function GET(request: NextRequest) {
  const correlationId = crypto.randomUUID();
  const logger = createServerLogger('GitStatusAPI', correlationId);

  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      logger.warn('Missing workspaceId parameter');
      return NextResponse.json(
        { error: 'workspaceId parameter is required' },
        { status: 400 }
      );
    }

    logger.info('Getting git status', { workspaceId });

    const manager = getWorkspaceManager();
    const provider = manager.getProvider(workspaceId);

    if (!provider) {
      logger.warn('Provider not found', { workspaceId });
      return NextResponse.json(
        { error: `Provider not found: ${workspaceId}` },
        { status: 404 }
      );
    }

    if (!(provider instanceof GitProvider)) {
      logger.warn('Provider is not a GitProvider', { workspaceId, type: provider.type });
      return NextResponse.json(
        { error: 'Provider is not a git workspace' },
        { status: 400 }
      );
    }

    if (!provider.isConnected()) {
      logger.warn('Provider not connected', { workspaceId });
      return NextResponse.json(
        { error: 'Provider is not connected' },
        { status: 400 }
      );
    }

    // Get git status
    const status = await provider.gitStatus();

    logger.info('Git status retrieved', { workspaceId, modified: status.modified?.length ?? 0 });

    return NextResponse.json({
      success: true,
      status,
    });
  } catch (error) {
    logger.error('Error getting git status', { error });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
