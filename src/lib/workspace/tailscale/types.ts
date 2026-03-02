/**
 * Tailscale Integration Types
 *
 * Type definitions for Tailscale device discovery and connection management.
 * Used by TailscaleManager and SSHProvider integration.
 */

/**
 * Represents a device in the Tailscale network
 */
export interface TailscaleDevice {
  /** Tailscale node ID (unique identifier) */
  id: string;
  /** Device hostname (e.g., "my-pc") */
  hostname: string;
  /** Magic DNS name (e.g., "my-pc.tailnet-name.ts.net") */
  dnsName: string;
  /** Tailscale IP address (100.x.x.x or fd7a:...) */
  tailscaleIP: string;
  /** Operating system (e.g., "linux", "windows", "macOS") */
  os: string;
  /** Whether the device is currently online */
  online: boolean;
  /** Last time the device was seen */
  lastSeen: Date;
  /** Tailscale ACL tags */
  tags: string[];
  /** Whether Tailscale SSH is enabled on this device */
  sshEnabled: boolean;
  /** Owner user ID */
  user: string;
  /** Whether this is the local device */
  isSelf: boolean;
}

/**
 * Status when Tailscale is not installed
 */
export interface TailscaleStatusNotInstalled {
  installed: false;
  loggedIn: false;
  connected: false;
  tailnetName: '';
  selfDevice: null;
  devices: [];
  version: '';
  error?: string;
}

/**
 * Status when Tailscale is installed (may or may not be connected)
 */
export interface TailscaleStatusInstalled {
  installed: true;
  loggedIn: boolean;
  connected: boolean;
  tailnetName: string;
  selfDevice: TailscaleDevice | null;
  devices: TailscaleDevice[];
  version: string;
  error?: string;
}

/**
 * Union type for Tailscale status
 */
export type TailscaleStatus = TailscaleStatusNotInstalled | TailscaleStatusInstalled;

/**
 * Ping result from Tailscale device
 */
export interface TailscalePingResult {
  /** Latency in milliseconds (-1 if failed) */
  latency: number;
  /** Connection type */
  via: 'direct' | 'relay';
  /** Error message if ping failed */
  error?: string;
}

/**
 * Version check result
 */
export interface TailscaleVersionCheck {
  /** Whether version meets minimum requirements */
  valid: boolean;
  /** Current installed version */
  version: string;
  /** Minimum required version */
  minimum: string;
}

/**
 * Tailscale configuration for SSHProvider
 */
export interface TailscaleSSHConfig {
  /** Enable Tailscale for this connection */
  enabled: boolean;
  /** Tailscale device ID (required - unique identifier) */
  deviceId: string;
  /** Use Magic DNS instead of IP (default: false) */
  useMagicDNS?: boolean;
  /** Fail if connection would use DERP relay (default: false) */
  requireDirect?: boolean;
}

/**
 * Options for CLI execution
 */
export interface ExecWithTimeoutOptions {
  /** Timeout in milliseconds */
  timeout?: number;
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
}

/**
 * Rate limit entry for API protection
 */
export interface RateLimitEntry {
  /** Request count in current window */
  count: number;
  /** Window expiration time */
  resetTime: number;
  /** Cleanup timer reference */
  cleanupTimer: NodeJS.Timeout;
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  /** Whether request is allowed */
  allowed: boolean;
  /** Seconds until rate limit resets (if blocked) */
  retryAfter?: number;
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Maximum requests per window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

/**
 * TailscaleManager event types
 */
export interface TailscaleManagerEvents {
  'devices:updated': (devices: TailscaleDevice[]) => void;
  'status:changed': (status: TailscaleStatus) => void;
}

/**
 * Type guard to check if status indicates Tailscale is installed
 */
export function isTailscaleInstalled(
  status: TailscaleStatus
): status is TailscaleStatusInstalled {
  return status.installed === true;
}

/**
 * Type guard to check if status indicates Tailscale is connected
 */
export function isTailscaleConnected(
  status: TailscaleStatus
): status is TailscaleStatusInstalled & { connected: true; loggedIn: true } {
  return status.installed && status.connected && status.loggedIn;
}
