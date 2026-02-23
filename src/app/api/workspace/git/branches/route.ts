/**
 * Git Branches API Route
 * GET /api/workspace/git/branches?workspaceId=<id>
 * POST /api/workspace/git/branches - Switch branch
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
  const logger = createServerLogger('GitBranchesAPI', correlationId);

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

    logger.info('Getting git branches', { workspaceId });

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

    // Get branches
    const branches = await provider.getBranches();
    const currentBranch = await provider.gitBranch();

    logger.info('Git branches retrieved', { workspaceId, count: branches.length });

    return NextResponse.json({
      success: true,
      branches,
      currentBranch,
    });
  } catch (error) {
    logger.error('Error getting git branches', { error });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const correlationId = crypto.randomUUID();
  const logger = createServerLogger('GitBranchesAPI', correlationId);

  try {
    const body = await request.json();
    const { workspaceId, branch } = body;

    if (!workspaceId || !branch) {
      logger.warn('Missing required fields', { workspaceId, branch });
      return NextResponse.json(
        { error: 'workspaceId and branch are required' },
        { status: 400 }
      );
    }

    logger.info('Switching git branch', { workspaceId, branch });

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

    // Checkout branch
    await provider.checkout(branch);

    logger.info('Git branch switched', { workspaceId, branch });

    return NextResponse.json({
      success: true,
      branch,
    });
  } catch (error) {
    logger.error('Error switching git branch', { error });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
