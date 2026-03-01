/**
 * POST /api/workspace/tailscale/refresh
 *
 * Force refresh the Tailscale device list.
 * Clears cache and fetches fresh data from CLI.
 *
 * Use sparingly - cached data is usually sufficient.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import {
  getTailscaleManager,
  withRateLimit,
  isTailscaleError,
  isRecoverableError,
} from '@/lib/workspace/tailscale';

const log = createLogger('API:Tailscale:Refresh');

async function handler(request: NextRequest): Promise<NextResponse> {
  log.debug('POST /api/workspace/tailscale/refresh');

  try {
    const manager = getTailscaleManager();

    // Force refresh (clears cache)
    await manager.refreshDevices();

    // Get updated status
    const status = await manager.getStatus();

    log.info('Tailscale devices refreshed', {
      deviceCount: status.devices.length,
    });

    return NextResponse.json({
      success: true,
      deviceCount: status.devices.length,
      devices: status.devices.map((d) => ({
        id: d.id,
        hostname: d.hostname,
        online: d.online,
      })),
    });
  } catch (error) {
    log.error('Failed to refresh Tailscale devices', { error });

    const isRecoverable = isTailscaleError(error) && isRecoverableError(error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to refresh devices';

    return NextResponse.json(
      {
        error: errorMessage,
        code: isTailscaleError(error) ? error.code : 'UNKNOWN_ERROR',
        recoverable: isRecoverable,
        suggestion: isTailscaleError(error) ? error.suggestion : undefined,
      },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(handler);
