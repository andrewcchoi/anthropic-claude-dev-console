/**
 * POST /api/workspace/disconnect
 * Disconnect from a workspace provider
 */

import { NextRequest, NextResponse } from 'next/server';
import { workspaceManager, isWorkspaceError } from '@/lib/workspace';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body as { id: string };

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    const provider = workspaceManager.getProvider(id);

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    await workspaceManager.disconnectProvider(id);

    return NextResponse.json({
      success: true,
      id,
      status: 'disconnected',
    });
  } catch (error) {
    console.error('[API] Workspace disconnect error:', error);

    const message = isWorkspaceError(error)
      ? error.message
      : error instanceof Error
        ? error.message
        : 'Disconnect failed';

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
