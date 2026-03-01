/**
 * Tailscale Input Validation
 *
 * SECURITY-CRITICAL: All input validation for Tailscale integration.
 * These functions MUST be called before any shell command execution
 * to prevent command injection attacks.
 */

import { createLogger } from '@/lib/logger';
import {
  TailscaleInvalidIPError,
  TailscaleInvalidHostnameError,
} from './errors';

const log = createLogger('TailscaleValidation');

// ============================================================================
// IP Address Validation
// ============================================================================

/**
 * Validate Tailscale IPv4 address (100.x.x.x CGNAT range)
 *
 * CRITICAL: Prevents command injection via malicious IP values.
 * Tailscale uses 100.64.0.0/10 (CGNAT) for IPv4 addresses.
 *
 * @param ip - IP address to validate
 * @returns true if valid Tailscale IPv4 address
 */
export function validateTailscaleIPv4(ip: string): boolean {
  // Pattern: 100.x.x.x where x is 0-255
  const pattern = /^100\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = ip.match(pattern);

  if (!match) {
    return false;
  }

  // Validate each octet is 0-255
  const [, b, c, d] = match;
  const octets = [b, c, d];

  return octets.every((octet) => {
    const num = parseInt(octet, 10);
    return num >= 0 && num <= 255;
  });
}

/**
 * Validate Tailscale IPv6 address (fd7a:115c:a1e0::/48 ULA range)
 *
 * Tailscale uses a specific ULA (Unique Local Address) prefix.
 * Note: This validation is intentionally permissive for the suffix
 * since IPv6 addresses can have various compression formats.
 *
 * @param ip - IP address to validate
 * @returns true if valid Tailscale IPv6 address
 */
export function validateTailscaleIPv6(ip: string): boolean {
  // Tailscale uses fd7a:115c:a1e0::/48 prefix
  // Must start with fd7a:115c:a1e0: and contain only hex and colons
  const pattern = /^fd7a:115c:a1e0:[0-9a-f:]+$/i;

  if (!pattern.test(ip)) {
    return false;
  }

  // Additional check: no consecutive colons at end (invalid format)
  if (ip.endsWith(':') || ip.includes(':::')) {
    return false;
  }

  return true;
}

/**
 * Validate any Tailscale IP address (IPv4 or IPv6)
 *
 * @param ip - IP address to validate
 * @returns true if valid Tailscale IP address
 */
export function validateTailscaleIP(ip: string): boolean {
  if (!ip || typeof ip !== 'string') {
    return false;
  }

  return validateTailscaleIPv4(ip) || validateTailscaleIPv6(ip);
}

/**
 * Assert that an IP is valid, throwing if not
 *
 * @param ip - IP address to validate
 * @throws TailscaleInvalidIPError if invalid
 */
export function assertValidTailscaleIP(ip: string): void {
  if (!validateTailscaleIP(ip)) {
    log.error('Invalid Tailscale IP rejected', { ip });
    throw new TailscaleInvalidIPError(ip);
  }
}

// ============================================================================
// Hostname Validation
// ============================================================================

/**
 * Shell metacharacters that must be blocked
 */
const DANGEROUS_CHARS = /[;&|`$(){}[\]<>!\\'"]/;

/**
 * Valid hostname pattern (alphanumeric, dash, underscore, dot)
 */
const VALID_HOSTNAME_PATTERN = /^[\w.-]+$/;

/**
 * Valid DNS name pattern (more permissive for FQDNs)
 */
const VALID_DNS_PATTERN = /^[\w.-]+$/;

/**
 * Validate hostname for shell safety
 *
 * CRITICAL: Prevents command injection via malicious hostnames.
 *
 * @param hostname - Hostname to validate
 * @returns true if hostname is safe to use in shell commands
 */
export function validateHostname(hostname: string): boolean {
  if (!hostname || typeof hostname !== 'string') {
    return false;
  }

  // Check for shell metacharacters
  if (DANGEROUS_CHARS.test(hostname)) {
    return false;
  }

  // Check for valid pattern
  if (!VALID_HOSTNAME_PATTERN.test(hostname)) {
    return false;
  }

  // Additional safety checks
  if (hostname.length > 253) {
    return false; // Max DNS name length
  }

  return true;
}

/**
 * Sanitize hostname, throwing if invalid
 *
 * @param hostname - Hostname to sanitize
 * @returns The hostname if valid
 * @throws TailscaleInvalidHostnameError if invalid
 */
export function sanitizeHostname(hostname: string): string {
  if (!validateHostname(hostname)) {
    log.error('Invalid hostname rejected', { hostname });
    throw new TailscaleInvalidHostnameError(hostname);
  }
  return hostname;
}

/**
 * Validate DNS name (FQDN)
 *
 * @param dnsName - DNS name to validate
 * @returns true if DNS name is safe
 */
export function validateDnsName(dnsName: string): boolean {
  if (!dnsName || typeof dnsName !== 'string') {
    return false;
  }

  // Check for shell metacharacters
  if (DANGEROUS_CHARS.test(dnsName)) {
    return false;
  }

  // Check for valid pattern
  if (!VALID_DNS_PATTERN.test(dnsName)) {
    return false;
  }

  // Max DNS name length
  if (dnsName.length > 253) {
    return false;
  }

  return true;
}

/**
 * Sanitize DNS name, returning empty string if invalid
 * (non-throwing variant for optional fields)
 *
 * @param dnsName - DNS name to sanitize
 * @returns The DNS name if valid, empty string otherwise
 */
export function sanitizeDnsName(dnsName: string): string {
  if (validateDnsName(dnsName)) {
    return dnsName;
  }
  log.warn('Invalid DNS name sanitized to empty', { dnsName });
  return '';
}

// ============================================================================
// Username Validation
// ============================================================================

/**
 * Validate username for shell safety
 *
 * @param username - Username to validate
 * @returns true if username is safe
 */
export function validateUsername(username: string): boolean {
  if (!username || typeof username !== 'string') {
    return false;
  }

  // Check for shell metacharacters
  if (DANGEROUS_CHARS.test(username)) {
    return false;
  }

  // Valid username pattern
  if (!/^[\w.-]+$/.test(username)) {
    return false;
  }

  // Reasonable length
  if (username.length > 32) {
    return false;
  }

  return true;
}

// ============================================================================
// Path Validation
// ============================================================================

/**
 * Validate remote path for shell safety
 *
 * @param path - Path to validate
 * @returns true if path is safe
 */
export function validateRemotePath(path: string): boolean {
  if (!path || typeof path !== 'string') {
    return false;
  }

  // Must start with /
  if (!path.startsWith('/')) {
    return false;
  }

  // Check for shell metacharacters (except / which is valid in paths)
  const dangerousExceptSlash = /[;&|`$(){}[\]<>!\\'"]/;
  if (dangerousExceptSlash.test(path)) {
    return false;
  }

  // No path traversal
  if (path.includes('..')) {
    return false;
  }

  // Reasonable length
  if (path.length > 4096) {
    return false;
  }

  return true;
}

// ============================================================================
// Export Validation Summary
// ============================================================================

/**
 * Validate all Tailscale connection parameters at once
 *
 * @param params - Connection parameters to validate
 * @returns Object with validation results and any errors
 */
export function validateConnectionParams(params: {
  hostname?: string;
  tailscaleIP?: string;
  username?: string;
  remotePath?: string;
}): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (params.hostname && !validateHostname(params.hostname)) {
    errors.push(`Invalid hostname: ${params.hostname}`);
  }

  if (params.tailscaleIP && !validateTailscaleIP(params.tailscaleIP)) {
    errors.push(`Invalid Tailscale IP: ${params.tailscaleIP}`);
  }

  if (params.username && !validateUsername(params.username)) {
    errors.push(`Invalid username: ${params.username}`);
  }

  if (params.remotePath && !validateRemotePath(params.remotePath)) {
    errors.push(`Invalid remote path: ${params.remotePath}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
