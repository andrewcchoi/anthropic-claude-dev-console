/**
 * POST /api/workspace/connect
 * Connect to a workspace provider
 */

import { NextRequest, NextResponse } from 'next/server';
import { workspaceManager, ProviderConfig, isWorkspaceError } from '@/lib/workspace';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, config } = body as { id: string; config: ProviderConfig };

    if (!id || !config) {
      return NextResponse.json(
        { error: 'Missing required fields: id, config' },
        { status: 400 }
      );
    }

    // Check if provider already exists
    let provider = workspaceManager.getProvider(id);

    if (!provider) {
      // Register new provider
      provider = await workspaceManager.registerProvider({ ...config, id });
    }

    // Connect
    await workspaceManager.connectProvider(id);

    return NextResponse.json({
      success: true,
      id,
      status: 'connected',
      rootPath: provider.rootPath,
    });
  } catch (error) {
    console.error('[API] Workspace connect error:', error);

    const message = isWorkspaceError(error)
      ? error.message
      : error instanceof Error
        ? error.message
        : 'Connection failed';

    const code = isWorkspaceError(error) ? error.code : 'CONNECTION_ERROR';

    return NextResponse.json(
      { error: message, code },
      { status: 500 }
    );
  }
}
