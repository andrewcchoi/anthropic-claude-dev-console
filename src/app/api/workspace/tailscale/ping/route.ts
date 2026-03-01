/**
 * POST /api/workspace/tailscale/ping
 *
 * Ping a Tailscale device to test connectivity.
 * Returns latency and connection type (direct or relay).
 *
 * Request Body:
 * - deviceId: string (required) - Tailscale node ID
 *
 * Response:
 * - deviceId: string
 * - hostname: string
 * - latency: number (ms, -1 if failed)
 * - via: 'direct' | 'relay'
 * - error?: string (if ping failed)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import {
  getTailscaleManager,
  withRateLimit,
  isTailscaleError,
  isRecoverableError,
  TailscaleDeviceOfflineError,
} from '@/lib/workspace/tailscale';

const log = createLogger('API:Tailscale:Ping');

async function handler(request: NextRequest): Promise<NextResponse> {
  log.debug('POST /api/workspace/tailscale/ping');

  try {
    // Parse request body
    let body: { deviceId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body', code: 'INVALID_REQUEST' },
        { status: 400 }
      );
    }

    const { deviceId } = body;

    // Validate deviceId
    if (!deviceId || typeof deviceId !== 'string') {
      return NextResponse.json(
        {
          error: 'deviceId is required and must be a string',
          code: 'INVALID_REQUEST',
        },
        { status: 400 }
      );
    }

    // Use deviceId for unambiguous lookup (not hostname which may collide)
    const manager = getTailscaleManager();
    const device = await manager.getDeviceById(deviceId);

    if (!device) {
      return NextResponse.json(
        {
          error: 'Device not found',
          code: 'DEVICE_NOT_FOUND',
          deviceId,
        },
        { status: 404 }
      );
    }

    // Check if device is online
    if (!device.online) {
      throw new TailscaleDeviceOfflineError(device.hostname);
    }

    // Ping the device
    const result = await manager.ping(device);

    log.debug('Ping completed', {
      deviceId,
      hostname: device.hostname,
      latency: result.latency,
      via: result.via,
    });

    return NextResponse.json({
      deviceId: device.id,
      hostname: device.hostname,
      tailscaleIP: device.tailscaleIP,
      latency: result.latency,
      via: result.via,
      error: result.error,
    });
  } catch (error) {
    log.error('Ping failed', { error });

    const isRecoverable = isTailscaleError(error) && isRecoverableError(error);
    const errorMessage =
      error instanceof Error ? error.message : 'Ping failed';
    const statusCode = isTailscaleError(error) && error.code === 'TAILSCALE_DEVICE_OFFLINE' ? 503 : 500;

    return NextResponse.json(
      {
        error: errorMessage,
        code: isTailscaleError(error) ? error.code : 'UNKNOWN_ERROR',
        recoverable: isRecoverable,
        suggestion: isTailscaleError(error) ? error.suggestion : undefined,
      },
      { status: statusCode }
    );
  }
}

export const POST = withRateLimit(handler);
