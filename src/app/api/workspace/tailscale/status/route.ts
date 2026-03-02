/**
 * GET /api/workspace/tailscale/status
 *
 * Get Tailscale connection status including:
 * - Installation status
 * - Login/connection state
 * - Tailnet name
 * - Self device info
 * - Available devices list
 * - Device count
 *
 * Uses caching headers to reduce client polling.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import {
  getTailscaleManager,
  withRateLimit,
  isTailscaleError,
  isRecoverableError,
} from '@/lib/workspace/tailscale';

const log = createLogger('API:Tailscale:Status');

async function handler(request: NextRequest): Promise<NextResponse> {
  log.debug('GET /api/workspace/tailscale/status');

  try {
    const manager = getTailscaleManager();
    const status = await manager.getStatus();

    // Build response with summary info
    const response = {
      installed: status.installed,
      loggedIn: status.loggedIn,
      connected: status.connected,
      tailnetName: status.tailnetName,
      version: status.version,
      selfDevice: status.selfDevice
        ? {
            hostname: status.selfDevice.hostname,
            tailscaleIP: status.selfDevice.tailscaleIP,
            os: status.selfDevice.os,
          }
        : null,
      devices: status.devices.map((d) => ({
        id: d.id,
        hostname: d.hostname,
        dnsName: d.dnsName,
        tailscaleIP: d.tailscaleIP,
        os: d.os,
        online: d.online,
        lastSeen: d.lastSeen.toISOString(),
        sshEnabled: d.sshEnabled,
        tags: d.tags,
        user: d.user,
        isSelf: d.isSelf,
      })),
      deviceCount: status.devices.length,
      error: status.error,
    };

    log.debug('Tailscale status retrieved', {
      installed: status.installed,
      connected: status.connected,
      deviceCount: status.devices.length,
    });

    // Add cache headers to reduce client polling
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, max-age=10', // Client can cache for 10s
      },
    });
  } catch (error) {
    log.error('Failed to get Tailscale status', { error });

    // Return structured error
    const isRecoverable = isTailscaleError(error) && isRecoverableError(error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to get Tailscale status';

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

export const GET = withRateLimit(handler);
