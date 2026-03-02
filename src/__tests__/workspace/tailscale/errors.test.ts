/**
 * Tailscale Error Classes Tests
 *
 * Tests for error class hierarchy, error codes, suggestions, and recovery handling.
 */

import { describe, it, expect } from 'vitest';
import {
  TailscaleNotInstalledError,
  TailscaleVersionError,
  TailscaleNotLoggedInError,
  TailscaleNotConnectedError,
  TailscaleDeviceNotFoundError,
  TailscaleDeviceOfflineError,
  TailscaleRelayNotAllowedError,
  TailscaleTimeoutError,
  TailscalePermissionError,
  TailscaleHostnameCollisionError,
  TailscaleInvalidIPError,
  TailscaleInvalidHostnameError,
  SSHNotAvailableError,
  isTailscaleError,
  isRecoverableError,
} from '@/lib/workspace/tailscale/errors';
import { WorkspaceError } from '@/lib/workspace/errors';

// ============================================================================
// TailscaleNotInstalledError
// ============================================================================

describe('TailscaleNotInstalledError', () => {
  it('should have correct code and message', () => {
    const error = new TailscaleNotInstalledError();
    expect(error.code).toBe('TAILSCALE_NOT_INSTALLED');
    expect(error.message).toContain('not installed');
    expect(error.name).toBe('TailscaleNotInstalledError');
  });

  it('should be recoverable', () => {
    const error = new TailscaleNotInstalledError();
    expect(error.recoverable).toBe(true);
  });

  it('should provide helpful suggestion', () => {
    const error = new TailscaleNotInstalledError();
    expect(error.suggestion).toContain('tailscale.com/download');
  });

  it('should extend WorkspaceError', () => {
    const error = new TailscaleNotInstalledError();
    expect(error).toBeInstanceOf(WorkspaceError);
    expect(error).toBeInstanceOf(Error);
  });
});

// ============================================================================
// TailscaleVersionError
// ============================================================================

describe('TailscaleVersionError', () => {
  it('should include version information', () => {
    const error = new TailscaleVersionError('1.5.0', '1.8.0');
    expect(error.code).toBe('TAILSCALE_VERSION_ERROR');
    expect(error.message).toContain('1.5.0');
    expect(error.message).toContain('1.8.0');
    expect(error.currentVersion).toBe('1.5.0');
    expect(error.minimumVersion).toBe('1.8.0');
  });

  it('should be recoverable', () => {
    const error = new TailscaleVersionError('1.5.0', '1.8.0');
    expect(error.recoverable).toBe(true);
  });

  it('should suggest update', () => {
    const error = new TailscaleVersionError('1.5.0', '1.8.0');
    expect(error.suggestion).toContain('Update');
  });
});

// ============================================================================
// TailscaleNotLoggedInError
// ============================================================================

describe('TailscaleNotLoggedInError', () => {
  it('should have correct code', () => {
    const error = new TailscaleNotLoggedInError();
    expect(error.code).toBe('TAILSCALE_NOT_LOGGED_IN');
    expect(error.message).toContain('Not logged in');
  });

  it('should suggest login command', () => {
    const error = new TailscaleNotLoggedInError();
    expect(error.suggestion).toContain('tailscale login');
  });
});

// ============================================================================
// TailscaleNotConnectedError
// ============================================================================

describe('TailscaleNotConnectedError', () => {
  it('should have correct code', () => {
    const error = new TailscaleNotConnectedError();
    expect(error.code).toBe('TAILSCALE_NOT_CONNECTED');
    expect(error.message).toContain('not connected');
  });

  it('should suggest tailscale up', () => {
    const error = new TailscaleNotConnectedError();
    expect(error.suggestion).toContain('tailscale up');
  });
});

// ============================================================================
// TailscaleDeviceNotFoundError
// ============================================================================

describe('TailscaleDeviceNotFoundError', () => {
  it('should include device ID', () => {
    const error = new TailscaleDeviceNotFoundError('node123');
    expect(error.code).toBe('TAILSCALE_DEVICE_NOT_FOUND');
    expect(error.message).toContain('node123');
    expect(error.deviceId).toBe('node123');
  });

  it('should NOT be recoverable', () => {
    const error = new TailscaleDeviceNotFoundError('node123');
    expect(error.recoverable).toBe(false);
  });

  it('should suggest checking admin console', () => {
    const error = new TailscaleDeviceNotFoundError('node123');
    expect(error.suggestion).toContain('admin console');
  });
});

// ============================================================================
// TailscaleDeviceOfflineError
// ============================================================================

describe('TailscaleDeviceOfflineError', () => {
  it('should include hostname', () => {
    const error = new TailscaleDeviceOfflineError('my-server');
    expect(error.code).toBe('TAILSCALE_DEVICE_OFFLINE');
    expect(error.message).toContain('my-server');
    expect(error.message).toContain('offline');
    expect(error.hostname).toBe('my-server');
  });

  it('should be recoverable', () => {
    const error = new TailscaleDeviceOfflineError('my-server');
    expect(error.recoverable).toBe(true);
  });
});

// ============================================================================
// TailscaleRelayNotAllowedError
// ============================================================================

describe('TailscaleRelayNotAllowedError', () => {
  it('should include hostname', () => {
    const error = new TailscaleRelayNotAllowedError('my-server');
    expect(error.code).toBe('TAILSCALE_RELAY_NOT_ALLOWED');
    expect(error.message).toContain('my-server');
    expect(error.message).toContain('relay');
    expect(error.hostname).toBe('my-server');
  });

  it('should allow custom suggestion', () => {
    const error = new TailscaleRelayNotAllowedError('my-server', {
      suggestion: 'Custom suggestion',
    });
    expect(error.suggestion).toBe('Custom suggestion');
  });

  it('should have default suggestion without custom', () => {
    const error = new TailscaleRelayNotAllowedError('my-server');
    expect(error.suggestion).toContain('firewall');
  });
});

// ============================================================================
// TailscaleTimeoutError
// ============================================================================

describe('TailscaleTimeoutError', () => {
  it('should include command and timeout', () => {
    const error = new TailscaleTimeoutError('tailscale status', 5000);
    expect(error.code).toBe('TAILSCALE_TIMEOUT');
    expect(error.message).toContain('5000ms');
    expect(error.command).toBe('tailscale status');
    expect(error.timeoutMs).toBe(5000);
  });

  it('should suggest restarting Tailscale', () => {
    const error = new TailscaleTimeoutError('tailscale status', 5000);
    expect(error.suggestion).toContain('restart');
  });
});

// ============================================================================
// TailscalePermissionError
// ============================================================================

describe('TailscalePermissionError', () => {
  it('should have correct code', () => {
    const error = new TailscalePermissionError();
    expect(error.code).toBe('TAILSCALE_PERMISSION_DENIED');
    expect(error.message).toContain('Permission denied');
  });

  it('should suggest group membership', () => {
    const error = new TailscalePermissionError();
    expect(error.suggestion).toContain('usermod');
    expect(error.suggestion).toContain('tailscale');
  });
});

// ============================================================================
// TailscaleHostnameCollisionError
// ============================================================================

describe('TailscaleHostnameCollisionError', () => {
  it('should include hostname and matching devices', () => {
    const devices = [
      { id: 'node1', hostname: 'my-server' },
      { id: 'node2', hostname: 'my-server' },
    ];
    const error = new TailscaleHostnameCollisionError('my-server', devices);
    expect(error.code).toBe('TAILSCALE_HOSTNAME_COLLISION');
    expect(error.hostname).toBe('my-server');
    expect(error.matchingDevices).toEqual(devices);
  });

  it('should suggest selecting specific device', () => {
    const error = new TailscaleHostnameCollisionError('my-server', []);
    expect(error.suggestion).toContain('specific device');
  });
});

// ============================================================================
// TailscaleInvalidIPError
// ============================================================================

describe('TailscaleInvalidIPError', () => {
  it('should include the invalid IP', () => {
    const error = new TailscaleInvalidIPError('192.168.1.1');
    expect(error.code).toBe('TAILSCALE_INVALID_IP');
    expect(error.message).toContain('192.168.1.1');
    expect(error.ip).toBe('192.168.1.1');
  });

  it('should NOT be recoverable', () => {
    const error = new TailscaleInvalidIPError('192.168.1.1');
    expect(error.recoverable).toBe(false);
  });

  it('should explain valid IP ranges', () => {
    const error = new TailscaleInvalidIPError('192.168.1.1');
    expect(error.suggestion).toContain('100.x.x.x');
    expect(error.suggestion).toContain('fd7a:115c:a1e0');
  });
});

// ============================================================================
// TailscaleInvalidHostnameError
// ============================================================================

describe('TailscaleInvalidHostnameError', () => {
  it('should include the invalid hostname', () => {
    const error = new TailscaleInvalidHostnameError('bad;hostname');
    expect(error.code).toBe('TAILSCALE_INVALID_HOSTNAME');
    expect(error.message).toContain('bad;hostname');
    expect(error.hostname).toBe('bad;hostname');
  });

  it('should NOT be recoverable', () => {
    const error = new TailscaleInvalidHostnameError('bad;hostname');
    expect(error.recoverable).toBe(false);
  });
});

// ============================================================================
// SSHNotAvailableError
// ============================================================================

describe('SSHNotAvailableError', () => {
  it('should include hostname and port', () => {
    const error = new SSHNotAvailableError('my-server', 22);
    expect(error.code).toBe('SSH_NOT_AVAILABLE');
    expect(error.message).toContain('my-server');
    expect(error.message).toContain('22');
    expect(error.hostname).toBe('my-server');
    expect(error.port).toBe(22);
  });

  it('should be recoverable', () => {
    const error = new SSHNotAvailableError('my-server', 22);
    expect(error.recoverable).toBe(true);
  });

  it('should mention the port in suggestion', () => {
    const error = new SSHNotAvailableError('my-server', 2222);
    expect(error.suggestion).toContain('2222');
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

describe('isTailscaleError', () => {
  it('should identify Tailscale errors', () => {
    expect(isTailscaleError(new TailscaleNotInstalledError())).toBe(true);
    expect(isTailscaleError(new TailscaleDeviceOfflineError('test'))).toBe(true);
    expect(isTailscaleError(new SSHNotAvailableError('test', 22))).toBe(true);
  });

  it('should reject non-Tailscale errors', () => {
    expect(isTailscaleError(new Error('generic error'))).toBe(false);
    expect(isTailscaleError(null)).toBe(false);
    expect(isTailscaleError(undefined)).toBe(false);
    expect(isTailscaleError('string')).toBe(false);
  });
});

describe('isRecoverableError', () => {
  it('should identify recoverable errors', () => {
    expect(isRecoverableError(new TailscaleNotInstalledError())).toBe(true);
    expect(isRecoverableError(new TailscaleDeviceOfflineError('test'))).toBe(true);
    expect(isRecoverableError(new TailscaleTimeoutError('cmd', 1000))).toBe(true);
  });

  it('should identify non-recoverable errors', () => {
    expect(isRecoverableError(new TailscaleDeviceNotFoundError('node1'))).toBe(false);
    expect(isRecoverableError(new TailscaleInvalidIPError('1.2.3.4'))).toBe(false);
  });

  it('should return false for non-WorkspaceErrors', () => {
    expect(isRecoverableError(new Error('generic'))).toBe(false);
    expect(isRecoverableError(null)).toBe(false);
  });
});

// ============================================================================
// Error Hierarchy
// ============================================================================

describe('Error Hierarchy', () => {
  const allErrors = [
    new TailscaleNotInstalledError(),
    new TailscaleVersionError('1.0', '2.0'),
    new TailscaleNotLoggedInError(),
    new TailscaleNotConnectedError(),
    new TailscaleDeviceNotFoundError('node'),
    new TailscaleDeviceOfflineError('host'),
    new TailscaleRelayNotAllowedError('host'),
    new TailscaleTimeoutError('cmd', 1000),
    new TailscalePermissionError(),
    new TailscaleHostnameCollisionError('host', []),
    new TailscaleInvalidIPError('ip'),
    new TailscaleInvalidHostnameError('host'),
    new SSHNotAvailableError('host', 22),
  ];

  it('all errors should extend WorkspaceError', () => {
    for (const error of allErrors) {
      expect(error).toBeInstanceOf(WorkspaceError);
    }
  });

  it('all errors should have unique codes', () => {
    const codes = allErrors.map((e) => e.code);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });

  it('all errors should have suggestions', () => {
    for (const error of allErrors) {
      expect(error.suggestion).toBeDefined();
      expect(error.suggestion.length).toBeGreaterThan(0);
    }
  });

  it('all errors should have names matching class names', () => {
    for (const error of allErrors) {
      expect(error.name).toBe(error.constructor.name);
    }
  });
});
