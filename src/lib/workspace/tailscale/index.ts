/**
 * Tailscale Integration Module
 *
 * Provides Tailscale network integration for SSH workspace provider.
 * Enables secure remote access without port forwarding or NAT traversal.
 */

// Core Manager
export {
  TailscaleManager,
  getTailscaleManager,
  __resetManagerForTesting,
} from './TailscaleManager';

// Types
export type {
  TailscaleDevice,
  TailscaleStatus,
  TailscaleStatusNotInstalled,
  TailscaleStatusInstalled,
  TailscalePingResult,
  TailscaleVersionCheck,
  TailscaleSSHConfig,
  ExecWithTimeoutOptions,
  RateLimitEntry,
  RateLimitResult,
  RateLimitConfig,
  TailscaleManagerEvents,
} from './types';

export { isTailscaleInstalled, isTailscaleConnected } from './types';

// Errors
export {
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
} from './errors';

// Validation
export {
  validateTailscaleIPv4,
  validateTailscaleIPv6,
  validateTailscaleIP,
  assertValidTailscaleIP,
  validateHostname,
  sanitizeHostname,
  validateDnsName,
  sanitizeDnsName,
  validateUsername,
  validateRemotePath,
  validateConnectionParams,
} from './validation';

// Rate Limiting
export {
  checkRateLimit,
  getRateLimitStatus,
  clearRateLimiter,
  clearAllRateLimiters,
  getRateLimiterStats,
  withRateLimit,
  __resetForTesting as __resetRateLimiterForTesting,
} from './rate-limiter';
