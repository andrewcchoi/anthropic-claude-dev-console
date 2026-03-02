/**
 * Tailscale Validation Function Tests
 *
 * Tests for IP address validation, hostname validation, and DNS name validation.
 * These are pure functions focused on shell safety and command injection prevention.
 */

import { describe, it, expect } from 'vitest';
import {
  validateTailscaleIP,
  validateTailscaleIPv4,
  validateTailscaleIPv6,
  validateHostname,
  sanitizeHostname,
  validateDnsName,
  validateUsername,
  validateRemotePath,
  validateConnectionParams,
} from '@/lib/workspace/tailscale/validation';
import { TailscaleInvalidHostnameError } from '@/lib/workspace/tailscale/errors';

// ============================================================================
// IPv4 Validation
// ============================================================================

describe('validateTailscaleIPv4', () => {
  it('should accept valid Tailscale IPv4 addresses', () => {
    expect(validateTailscaleIPv4('100.64.0.1')).toBe(true);
    expect(validateTailscaleIPv4('100.100.100.100')).toBe(true);
    expect(validateTailscaleIPv4('100.127.255.255')).toBe(true);
    expect(validateTailscaleIPv4('100.64.0.0')).toBe(true);
  });

  it('should reject non-100.x.x.x addresses', () => {
    expect(validateTailscaleIPv4('192.168.1.1')).toBe(false);
    expect(validateTailscaleIPv4('10.0.0.1')).toBe(false);
    expect(validateTailscaleIPv4('172.16.0.1')).toBe(false);
    expect(validateTailscaleIPv4('8.8.8.8')).toBe(false);
  });

  it('should reject invalid IPv4 formats', () => {
    expect(validateTailscaleIPv4('100.64.0')).toBe(false);
    expect(validateTailscaleIPv4('100.64.0.1.1')).toBe(false);
    expect(validateTailscaleIPv4('100.64.0.256')).toBe(false);
    expect(validateTailscaleIPv4('100.64.0.-1')).toBe(false);
    expect(validateTailscaleIPv4('')).toBe(false);
    expect(validateTailscaleIPv4('not-an-ip')).toBe(false);
  });
});

// ============================================================================
// IPv6 Validation
// ============================================================================

describe('validateTailscaleIPv6', () => {
  it('should accept valid Tailscale IPv6 addresses', () => {
    expect(validateTailscaleIPv6('fd7a:115c:a1e0::1')).toBe(true);
    expect(validateTailscaleIPv6('fd7a:115c:a1e0:ab12::1')).toBe(true);
    expect(validateTailscaleIPv6('fd7a:115c:a1e0:ab12:cd34:ef56:7890:1234')).toBe(true);
  });

  it('should reject non-Tailscale IPv6 addresses', () => {
    expect(validateTailscaleIPv6('::1')).toBe(false);
    expect(validateTailscaleIPv6('fe80::1')).toBe(false);
    expect(validateTailscaleIPv6('2001:db8::1')).toBe(false);
    expect(validateTailscaleIPv6('fd7b:115c:a1e0::1')).toBe(false); // Wrong prefix
  });

  it('should reject invalid formats', () => {
    expect(validateTailscaleIPv6('fd7a:115c:a1e0:::')).toBe(false); // Triple colon
    expect(validateTailscaleIPv6('fd7a:115c:a1e0:')).toBe(false); // Ends with colon
  });
});

// ============================================================================
// Combined IP Validation
// ============================================================================

describe('validateTailscaleIP', () => {
  it('should accept both IPv4 and IPv6', () => {
    expect(validateTailscaleIP('100.64.0.1')).toBe(true);
    expect(validateTailscaleIP('fd7a:115c:a1e0::1')).toBe(true);
  });

  it('should reject empty and null values', () => {
    expect(validateTailscaleIP('')).toBe(false);
    expect(validateTailscaleIP(null as any)).toBe(false);
    expect(validateTailscaleIP(undefined as any)).toBe(false);
  });
});

// ============================================================================
// Hostname Validation
// ============================================================================

describe('validateHostname', () => {
  it('should accept valid hostnames', () => {
    expect(validateHostname('my-server')).toBe(true);
    expect(validateHostname('server1')).toBe(true);
    expect(validateHostname('Server_Name')).toBe(true);
    expect(validateHostname('a')).toBe(true);
    expect(validateHostname('server.local')).toBe(true);
  });

  it('should reject empty and null values', () => {
    expect(validateHostname('')).toBe(false);
    expect(validateHostname(null as any)).toBe(false);
    expect(validateHostname(undefined as any)).toBe(false);
  });

  it('should reject shell metacharacters', () => {
    expect(validateHostname('server;rm')).toBe(false);
    expect(validateHostname('server|cat')).toBe(false);
    expect(validateHostname('server`whoami`')).toBe(false);
    expect(validateHostname('server$(whoami)')).toBe(false);
    expect(validateHostname("server'test")).toBe(false);
    expect(validateHostname('server"test')).toBe(false);
    expect(validateHostname('server&test')).toBe(false);
    expect(validateHostname('server<test')).toBe(false);
    expect(validateHostname('server>test')).toBe(false);
  });

  it('should reject invalid characters', () => {
    expect(validateHostname('server name')).toBe(false); // Space
    expect(validateHostname('server\nname')).toBe(false); // Newline
    expect(validateHostname('server\tname')).toBe(false); // Tab
  });

  it('should handle length limits', () => {
    const maxLength = 'a'.repeat(253);
    const tooLong = 'a'.repeat(254);
    expect(validateHostname(maxLength)).toBe(true);
    expect(validateHostname(tooLong)).toBe(false);
  });
});

// ============================================================================
// Hostname Sanitization (throws on invalid)
// ============================================================================

describe('sanitizeHostname', () => {
  it('should return valid hostnames unchanged', () => {
    expect(sanitizeHostname('my-server')).toBe('my-server');
    expect(sanitizeHostname('Server1')).toBe('Server1');
    expect(sanitizeHostname('server.local')).toBe('server.local');
  });

  it('should throw TailscaleInvalidHostnameError on invalid input', () => {
    expect(() => sanitizeHostname('')).toThrow(TailscaleInvalidHostnameError);
    expect(() => sanitizeHostname('server;rm')).toThrow(TailscaleInvalidHostnameError);
    expect(() => sanitizeHostname('server name')).toThrow(TailscaleInvalidHostnameError);
  });
});

// ============================================================================
// DNS Name Validation
// ============================================================================

describe('validateDnsName', () => {
  it('should accept valid DNS names', () => {
    expect(validateDnsName('my-server.tailnet.ts.net')).toBe(true);
    expect(validateDnsName('server.local')).toBe(true);
    expect(validateDnsName('a.b.c')).toBe(true);
    expect(validateDnsName('Server-Name.Domain.com')).toBe(true);
  });

  it('should reject empty and null values', () => {
    expect(validateDnsName('')).toBe(false);
    expect(validateDnsName(null as any)).toBe(false);
    expect(validateDnsName(undefined as any)).toBe(false);
  });

  it('should reject shell metacharacters', () => {
    expect(validateDnsName('server;rm.com')).toBe(false);
    expect(validateDnsName('server$(whoami).com')).toBe(false);
    expect(validateDnsName('server`test`.com')).toBe(false);
  });

  it('should handle length limits', () => {
    const maxLength = 'a'.repeat(253);
    const tooLong = 'a'.repeat(254);
    expect(validateDnsName(maxLength)).toBe(true);
    expect(validateDnsName(tooLong)).toBe(false);
  });
});

// ============================================================================
// Username Validation
// ============================================================================

describe('validateUsername', () => {
  it('should accept valid usernames', () => {
    expect(validateUsername('user')).toBe(true);
    expect(validateUsername('pi')).toBe(true);
    expect(validateUsername('user_name')).toBe(true);
    expect(validateUsername('user-name')).toBe(true);
    expect(validateUsername('user.name')).toBe(true);
  });

  it('should reject empty and null values', () => {
    expect(validateUsername('')).toBe(false);
    expect(validateUsername(null as any)).toBe(false);
  });

  it('should reject shell metacharacters', () => {
    expect(validateUsername('user;rm')).toBe(false);
    expect(validateUsername('user$(whoami)')).toBe(false);
  });

  it('should reject spaces', () => {
    expect(validateUsername('user name')).toBe(false);
  });

  it('should enforce length limit', () => {
    const maxLength = 'a'.repeat(32);
    const tooLong = 'a'.repeat(33);
    expect(validateUsername(maxLength)).toBe(true);
    expect(validateUsername(tooLong)).toBe(false);
  });
});

// ============================================================================
// Remote Path Validation
// ============================================================================

describe('validateRemotePath', () => {
  it('should accept valid paths', () => {
    expect(validateRemotePath('/home/user')).toBe(true);
    expect(validateRemotePath('/var/www')).toBe(true);
    expect(validateRemotePath('/tmp')).toBe(true);
    expect(validateRemotePath('/')).toBe(true);
  });

  it('should require leading slash', () => {
    expect(validateRemotePath('home/user')).toBe(false);
    expect(validateRemotePath('relative/path')).toBe(false);
  });

  it('should reject path traversal', () => {
    expect(validateRemotePath('/home/../etc/passwd')).toBe(false);
    expect(validateRemotePath('/home/user/..')).toBe(false);
  });

  it('should reject shell metacharacters', () => {
    expect(validateRemotePath('/home;rm -rf /')).toBe(false);
    expect(validateRemotePath('/home$(whoami)')).toBe(false);
    expect(validateRemotePath('/home`id`')).toBe(false);
  });

  it('should enforce length limit', () => {
    const maxPath = '/' + 'a'.repeat(4095);
    const tooLong = '/' + 'a'.repeat(4096);
    expect(validateRemotePath(maxPath)).toBe(true);
    expect(validateRemotePath(tooLong)).toBe(false);
  });
});

// ============================================================================
// Combined Connection Params Validation
// ============================================================================

describe('validateConnectionParams', () => {
  it('should pass with all valid params', () => {
    const result = validateConnectionParams({
      hostname: 'my-server',
      tailscaleIP: '100.64.0.1',
      username: 'pi',
      remotePath: '/home/pi',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should collect all errors', () => {
    const result = validateConnectionParams({
      hostname: 'invalid;host',
      tailscaleIP: '192.168.1.1',
      username: 'user name',
      remotePath: 'relative/path',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(4);
  });

  it('should handle partial params', () => {
    const result = validateConnectionParams({
      hostname: 'valid-host',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should skip validation for undefined params', () => {
    const result = validateConnectionParams({
      hostname: undefined,
      tailscaleIP: undefined,
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

// ============================================================================
// Security - Command Injection Prevention
// ============================================================================

describe('Security - Command Injection Prevention', () => {
  const maliciousInputs = [
    '; rm -rf /',
    '$(whoami)',
    '`whoami`',
    '| cat /etc/passwd',
    '&& cat /etc/passwd',
    "'; DROP TABLE users; --",
    '<script>alert(1)</script>',
  ];

  it('should reject all malicious hostnames', () => {
    for (const input of maliciousInputs) {
      expect(validateHostname(input)).toBe(false);
    }
  });

  it('should reject all malicious usernames', () => {
    for (const input of maliciousInputs) {
      expect(validateUsername(input)).toBe(false);
    }
  });

  it('should reject all malicious paths (with /)', () => {
    for (const input of maliciousInputs) {
      expect(validateRemotePath('/' + input)).toBe(false);
    }
  });

  it('should reject all malicious DNS names', () => {
    for (const input of maliciousInputs) {
      expect(validateDnsName(input)).toBe(false);
    }
  });
});
