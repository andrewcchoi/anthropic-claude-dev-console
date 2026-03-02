/**
 * GET /api/workspace/tailscale/devices
 *
 * Get list of all Tailscale devices in the tailnet.
 * Excludes the local device (self).
 *
 * Query Parameters:
 * - online: Filter to online devices only (default: false)
 * - hostname: Filter by hostname (partial match)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import {
  getTailscaleManager,
  withRateLimit,
  isTailscaleError,
  isRecoverableError,
  TailscaleDevice,
} from '@/lib/workspace/tailscale';

const log = createLogger('API:Tailscale:Devices');

async function handler(request: NextRequest): Promise<NextResponse> {
  log.debug('GET /api/workspace/tailscale/devices');

  try {
    const searchParams = request.nextUrl.searchParams;
    const onlineOnly = searchParams.get('online') === 'true';
    const hostnameFilter = searchParams.get('hostname');

    const manager = getTailscaleManager();
    let devices = await manager.listDevices();

    // Apply filters
    if (onlineOnly) {
      devices = devices.filter((d) => d.online);
    }

    if (hostnameFilter) {
      const filter = hostnameFilter.toLowerCase();
      devices = devices.filter(
        (d) =>
          d.hostname.toLowerCase().includes(filter) ||
          d.dnsName.toLowerCase().includes(filter)
      );
    }

    // Sort: online first, then alphabetically by hostname
    devices.sort((a, b) => {
      if (a.online !== b.online) {
        return a.online ? -1 : 1;
      }
      return a.hostname.localeCompare(b.hostname);
    });

    // Map to response format (exclude internal fields)
    const response = devices.map((d: TailscaleDevice) => ({
      id: d.id,
      hostname: d.hostname,
      dnsName: d.dnsName,
      tailscaleIP: d.tailscaleIP,
      os: d.os,
      online: d.online,
      lastSeen: d.lastSeen.toISOString(),
      sshEnabled: d.sshEnabled,
      tags: d.tags,
    }));

    log.debug('Devices retrieved', {
      total: response.length,
      onlineOnly,
      hostnameFilter,
    });

    return NextResponse.json({
      devices: response,
      count: response.length,
      filters: {
        onlineOnly,
        hostname: hostnameFilter,
      },
    });
  } catch (error) {
    log.error('Failed to get Tailscale devices', { error });

    const isRecoverable = isTailscaleError(error) && isRecoverableError(error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to get Tailscale devices';

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
