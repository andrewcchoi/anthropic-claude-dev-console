/**
 * SSHProvider Tailscale Integration Tests
 *
 * Tests the Tailscale integration in SSHProvider:
 * - Tailscale host resolution
 * - Magic DNS fallback
 * - requireDirect enforcement
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock socket for SSH health check
let mockSocketHandlers: Record<string, Function> = {};
let mockSocketError: Error | null = null;

const createMockSocket = () => ({
  connect: vi.fn(() => {
    // Simulate async connection
    setTimeout(() => {
      if (mockSocketError) {
        mockSocketHandlers['error']?.(mockSocketError);
      } else {
        mockSocketHandlers['connect']?.();
      }
    }, 1);
  }),
  destroy: vi.fn(),
  on: vi.fn((event: string, handler: Function) => {
    mockSocketHandlers[event] = handler;
    return createMockSocket();
  }),
});

vi.mock('net', () => {
  return {
    Socket: class MockSocket {
      connect = vi.fn(() => {
        setTimeout(() => {
          if (mockSocketError) {
            mockSocketHandlers['error']?.(mockSocketError);
          } else {
            mockSocketHandlers['connect']?.();
          }
        }, 1);
      });
      destroy = vi.fn();
      on = vi.fn((event: string, handler: Function) => {
        mockSocketHandlers[event] = handler;
        return this;
      });
    },
  };
});

// Mock the tailscale module
vi.mock('@/lib/workspace/tailscale', () => ({
  getTailscaleManager: vi.fn(),
  TailscaleDeviceNotFoundError: class extends Error {
    code = 'TAILSCALE_DEVICE_NOT_FOUND';
    constructor(deviceId: string) {
      super(`Device not found: ${deviceId}`);
    }
  },
  TailscaleDeviceOfflineError: class extends Error {
    code = 'TAILSCALE_DEVICE_OFFLINE';
    constructor(hostname: string) {
      super(`Device offline: ${hostname}`);
    }
  },
  TailscaleRelayNotAllowedError: class extends Error {
    code = 'TAILSCALE_RELAY_NOT_ALLOWED';
    constructor(hostname: string) {
      super(`Relay not allowed: ${hostname}`);
    }
  },
  SSHNotAvailableError: class extends Error {
    code = 'SSH_NOT_AVAILABLE';
    constructor(hostname: string, port: number) {
      super(`SSH not available: ${hostname}:${port}`);
    }
  },
}));

// Mock the ssh2 module
vi.mock('ssh2', () => ({
  Client: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    end: vi.fn(),
    sftp: vi.fn((cb) => cb(null, {})),
  })),
}));

// Mock the connection pool
const mockPoolInstance = {
  acquire: vi.fn().mockResolvedValue({
    client: {
      sftp: vi.fn((cb: any) => cb(null, {
        stat: vi.fn((path: any, cb: any) => cb(null, { isDirectory: () => true })),
      })),
    },
    id: 'mock-connection',
  }),
  release: vi.fn(),
};

vi.mock('@/lib/workspace/ssh/SSHConnectionPool', () => {
  return {
    SSHConnectionPool: class MockSSHConnectionPool {
      acquire = mockPoolInstance.acquire;
      release = mockPoolInstance.release;
    },
  };
});

// Mock the host key manager
vi.mock('@/lib/workspace/ssh/HostKeyManager', () => {
  return {
    HostKeyManager: class MockHostKeyManager {
      constructor() {}
    },
  };
});

// Mock logger
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import { getTailscaleManager } from '@/lib/workspace/tailscale';
import { SSHProvider } from '@/lib/workspace/providers/SSHProvider';

// ============================================================================
// Test Fixtures
// ============================================================================

const mockDevice = {
  id: 'node123',
  hostname: 'remote-server',
  dnsName: 'remote-server.tailnet.ts.net',
  tailscaleIP: '100.64.0.5',
  os: 'linux',
  online: true,
  lastSeen: new Date(),
  tags: [],
  sshEnabled: true,
  user: '12345',
  isSelf: false,
};

const mockOfflineDevice = {
  ...mockDevice,
  id: 'node456',
  hostname: 'offline-server',
  online: false,
};

function createMockManager(overrides: Partial<{
  getDeviceById: (id: string) => Promise<typeof mockDevice | null>;
  ping: (device: typeof mockDevice) => Promise<{ latency: number; via: 'direct' | 'relay' }>;
}> = {}) {
  return {
    getDeviceById: vi.fn().mockResolvedValue(mockDevice),
    ping: vi.fn().mockResolvedValue({ latency: 10, via: 'direct' }),
    ...overrides,
  };
}

function setupSocketSuccess(): void {
  mockSocketHandlers = {};
  mockSocketError = null;
}

function setupSocketFailure(errorCode: string = 'ECONNREFUSED'): void {
  mockSocketHandlers = {};
  const error = new Error('Connection refused') as NodeJS.ErrnoException;
  error.code = errorCode;
  mockSocketError = error;
}

// ============================================================================
// Tests: SSHProvider with Tailscale
// ============================================================================

describe('SSHProvider with Tailscale', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupSocketSuccess();
  });

  describe('Construction', () => {
    it('should accept config without tailscale', () => {
      const provider = new SSHProvider({
        hostname: 'example.com',
        port: 22,
        username: 'user',
        remotePath: '/home/user',
      } as any);

      expect(provider).toBeDefined();
    });

    it('should accept config with tailscale', () => {
      const provider = new SSHProvider({
        hostname: 'example.com',
        port: 22,
        username: 'user',
        remotePath: '/home/user',
        tailscale: {
          enabled: true,
          deviceId: 'node123',
          useMagicDNS: false,
          requireDirect: false,
        },
      } as any);

      expect(provider).toBeDefined();
    });
  });

  describe('Tailscale Resolution', () => {
    it('should resolve host via Tailscale IP', async () => {
      const mockManager = createMockManager();
      vi.mocked(getTailscaleManager).mockReturnValue(mockManager as any);

      const provider = new SSHProvider({
        hostname: 'remote-server',
        port: 22,
        username: 'user',
        remotePath: '/home/user',
        tailscale: {
          enabled: true,
          deviceId: 'node123',
          useMagicDNS: false,
        },
      } as any);

      await provider.connect();

      // Verify device lookup was called
      expect(mockManager.getDeviceById).toHaveBeenCalledWith('node123');
    });

    it('should use Magic DNS when enabled', async () => {
      const mockManager = createMockManager();
      vi.mocked(getTailscaleManager).mockReturnValue(mockManager as any);

      const provider = new SSHProvider({
        hostname: 'remote-server',
        port: 22,
        username: 'user',
        remotePath: '/home/user',
        tailscale: {
          enabled: true,
          deviceId: 'node123',
          useMagicDNS: true,
        },
      } as any);

      await provider.connect();

      expect(mockManager.getDeviceById).toHaveBeenCalledWith('node123');
    });

    it('should throw TailscaleDeviceNotFoundError for unknown device', async () => {
      const mockManager = createMockManager({
        getDeviceById: vi.fn().mockResolvedValue(null),
      });
      vi.mocked(getTailscaleManager).mockReturnValue(mockManager as any);

      const provider = new SSHProvider({
        hostname: 'remote-server',
        port: 22,
        username: 'user',
        remotePath: '/home/user',
        tailscale: {
          enabled: true,
          deviceId: 'unknown-device',
        },
      } as any);

      await expect(provider.connect()).rejects.toThrow('Device not found');
    });

    it('should throw TailscaleDeviceOfflineError for offline device', async () => {
      const mockManager = createMockManager({
        getDeviceById: vi.fn().mockResolvedValue(mockOfflineDevice),
      });
      vi.mocked(getTailscaleManager).mockReturnValue(mockManager as any);

      const provider = new SSHProvider({
        hostname: 'offline-server',
        port: 22,
        username: 'user',
        remotePath: '/home/user',
        tailscale: {
          enabled: true,
          deviceId: 'node456',
        },
      } as any);

      await expect(provider.connect()).rejects.toThrow('Device offline');
    });
  });

  describe('requireDirect', () => {
    it('should allow direct connection', async () => {
      const mockManager = createMockManager({
        ping: vi.fn().mockResolvedValue({ latency: 5, via: 'direct' }),
      });
      vi.mocked(getTailscaleManager).mockReturnValue(mockManager as any);

      const provider = new SSHProvider({
        hostname: 'remote-server',
        port: 22,
        username: 'user',
        remotePath: '/home/user',
        tailscale: {
          enabled: true,
          deviceId: 'node123',
          requireDirect: true,
        },
      } as any);

      await provider.connect();

      expect(mockManager.ping).toHaveBeenCalledWith(mockDevice);
    });

    it('should reject relay connection when requireDirect is true', async () => {
      const mockManager = createMockManager({
        ping: vi.fn().mockResolvedValue({ latency: 150, via: 'relay' }),
      });
      vi.mocked(getTailscaleManager).mockReturnValue(mockManager as any);

      const provider = new SSHProvider({
        hostname: 'remote-server',
        port: 22,
        username: 'user',
        remotePath: '/home/user',
        tailscale: {
          enabled: true,
          deviceId: 'node123',
          requireDirect: true,
        },
      } as any);

      await expect(provider.connect()).rejects.toThrow('Relay not allowed');
    });

    it('should not check ping when requireDirect is false', async () => {
      const mockManager = createMockManager();
      vi.mocked(getTailscaleManager).mockReturnValue(mockManager as any);

      const provider = new SSHProvider({
        hostname: 'remote-server',
        port: 22,
        username: 'user',
        remotePath: '/home/user',
        tailscale: {
          enabled: true,
          deviceId: 'node123',
          requireDirect: false,
        },
      } as any);

      await provider.connect();
      expect(mockManager.ping).not.toHaveBeenCalled();
    });
  });

  describe('SSH Health Check', () => {
    it('should detect SSH server not running', async () => {
      setupSocketFailure('ECONNREFUSED');

      const mockManager = createMockManager();
      vi.mocked(getTailscaleManager).mockReturnValue(mockManager as any);

      const provider = new SSHProvider({
        hostname: 'remote-server',
        port: 22,
        username: 'user',
        remotePath: '/home/user',
        tailscale: {
          enabled: true,
          deviceId: 'node123',
        },
      } as any);

      await expect(provider.connect()).rejects.toThrow('SSH not available');
    });
  });

  describe('Fallback to Direct SSH', () => {
    it('should connect directly when tailscale is not enabled', async () => {
      const mockManager = createMockManager();
      vi.mocked(getTailscaleManager).mockReturnValue(mockManager as any);

      const provider = new SSHProvider({
        hostname: 'example.com',
        port: 22,
        username: 'user',
        remotePath: '/home/user',
        // No tailscale config
      } as any);

      await provider.connect();

      // Should not call getTailscaleManager when tailscale is disabled
      expect(mockManager.getDeviceById).not.toHaveBeenCalled();
    });
  });
});
