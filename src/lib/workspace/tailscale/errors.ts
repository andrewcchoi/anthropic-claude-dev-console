/**
 * Tailscale Error Classes
 *
 * Complete error hierarchy for Tailscale integration.
 * Each error includes recovery suggestions for user-friendly error handling.
 */

import { WorkspaceError } from '../errors';

/**
 * Tailscale CLI not found on system
 */
export class TailscaleNotInstalledError extends WorkspaceError {
  constructor() {
    super('TAILSCALE_NOT_INSTALLED', 'Tailscale is not installed', {
      recoverable: true,
    });
    this.name = 'TailscaleNotInstalledError';
  }

  get suggestion(): string {
    return 'Install Tailscale from https://tailscale.com/download';
  }
}

/**
 * Tailscale CLI found but version too old
 */
export class TailscaleVersionError extends WorkspaceError {
  public readonly currentVersion: string;
  public readonly minimumVersion: string;

  constructor(current: string, minimum: string) {
    super(
      'TAILSCALE_VERSION_ERROR',
      `Tailscale version ${current} is below minimum ${minimum}`,
      { recoverable: true }
    );
    this.name = 'TailscaleVersionError';
    this.currentVersion = current;
    this.minimumVersion = minimum;
  }

  get suggestion(): string {
    return 'Update Tailscale: https://tailscale.com/download';
  }
}

/**
 * User not authenticated to Tailscale
 */
export class TailscaleNotLoggedInError extends WorkspaceError {
  constructor() {
    super('TAILSCALE_NOT_LOGGED_IN', 'Not logged in to Tailscale', {
      recoverable: true,
    });
    this.name = 'TailscaleNotLoggedInError';
  }

  get suggestion(): string {
    return 'Run "tailscale login" in terminal to authenticate';
  }
}

/**
 * Tailscale daemon not running or not connected
 */
export class TailscaleNotConnectedError extends WorkspaceError {
  constructor() {
    super(
      'TAILSCALE_NOT_CONNECTED',
      'Tailscale is not connected to the network',
      { recoverable: true }
    );
    this.name = 'TailscaleNotConnectedError';
  }

  get suggestion(): string {
    return 'Run "tailscale up" or check Tailscale app is running';
  }
}

/**
 * Device ID not found in device list
 */
export class TailscaleDeviceNotFoundError extends WorkspaceError {
  public readonly deviceId: string;

  constructor(deviceId: string) {
    super(
      'TAILSCALE_DEVICE_NOT_FOUND',
      `Tailscale device not found: ${deviceId}`,
      { recoverable: false, context: { deviceId } }
    );
    this.name = 'TailscaleDeviceNotFoundError';
    this.deviceId = deviceId;
  }

  get suggestion(): string {
    return 'The device may have been removed from your Tailnet. Check Tailscale admin console.';
  }
}

/**
 * Device exists but is currently offline
 */
export class TailscaleDeviceOfflineError extends WorkspaceError {
  public readonly hostname: string;

  constructor(hostname: string) {
    super(
      'TAILSCALE_DEVICE_OFFLINE',
      `Tailscale device "${hostname}" is offline`,
      { recoverable: true, context: { hostname } }
    );
    this.name = 'TailscaleDeviceOfflineError';
    this.hostname = hostname;
  }

  get suggestion(): string {
    return 'Ensure the target device is powered on and connected to the internet';
  }
}

/**
 * Connection would use DERP relay but requireDirect is enabled
 */
export class TailscaleRelayNotAllowedError extends WorkspaceError {
  public readonly hostname: string;
  private readonly customSuggestion?: string;

  constructor(hostname: string, options?: { suggestion?: string }) {
    super(
      'TAILSCALE_RELAY_NOT_ALLOWED',
      `Direct connection to "${hostname}" not available - would use relay`,
      { recoverable: true, context: { hostname } }
    );
    this.name = 'TailscaleRelayNotAllowedError';
    this.hostname = hostname;
    this.customSuggestion = options?.suggestion;
  }

  get suggestion(): string {
    return (
      this.customSuggestion ||
      'Direct P2P connection failed. Check firewall settings or disable "requireDirect" to allow relay connections.'
    );
  }
}

/**
 * CLI command timed out
 */
export class TailscaleTimeoutError extends WorkspaceError {
  public readonly command: string;
  public readonly timeoutMs: number;

  constructor(command: string, timeoutMs: number) {
    super(
      'TAILSCALE_TIMEOUT',
      `Tailscale command timed out after ${timeoutMs}ms`,
      { recoverable: true, context: { command, timeoutMs } }
    );
    this.name = 'TailscaleTimeoutError';
    this.command = command;
    this.timeoutMs = timeoutMs;
  }

  get suggestion(): string {
    return 'Tailscale daemon may be unresponsive. Try restarting Tailscale.';
  }
}

/**
 * Permission denied running Tailscale CLI
 */
export class TailscalePermissionError extends WorkspaceError {
  constructor() {
    super(
      'TAILSCALE_PERMISSION_DENIED',
      'Permission denied running Tailscale CLI',
      { recoverable: true }
    );
    this.name = 'TailscalePermissionError';
  }

  get suggestion(): string {
    return 'On Linux, add your user to the "tailscale" group: sudo usermod -aG tailscale $USER';
  }
}

/**
 * Multiple devices match hostname - ambiguous selection
 */
export class TailscaleHostnameCollisionError extends WorkspaceError {
  public readonly hostname: string;
  public readonly matchingDevices: Array<{ id: string; hostname: string }>;

  constructor(
    hostname: string,
    matchingDevices: Array<{ id: string; hostname: string }>
  ) {
    super(
      'TAILSCALE_HOSTNAME_COLLISION',
      `Multiple devices match hostname "${hostname}"`,
      { recoverable: true, context: { hostname, matchingDevices } }
    );
    this.name = 'TailscaleHostnameCollisionError';
    this.hostname = hostname;
    this.matchingDevices = matchingDevices;
  }

  get suggestion(): string {
    return 'Select a specific device from the list to avoid ambiguity.';
  }
}

/**
 * Invalid Tailscale IP address (potential security issue)
 */
export class TailscaleInvalidIPError extends WorkspaceError {
  public readonly ip: string;

  constructor(ip: string) {
    super('TAILSCALE_INVALID_IP', `Invalid Tailscale IP address: ${ip}`, {
      recoverable: false,
      context: { ip },
    });
    this.name = 'TailscaleInvalidIPError';
    this.ip = ip;
  }

  get suggestion(): string {
    return 'Tailscale IPs must be in the 100.x.x.x (IPv4) or fd7a:115c:a1e0::/48 (IPv6) range.';
  }
}

/**
 * SSH server not running on target device
 */
export class SSHNotAvailableError extends WorkspaceError {
  public readonly hostname: string;
  public readonly port: number;

  constructor(hostname: string, port: number) {
    super(
      'SSH_NOT_AVAILABLE',
      `SSH server not available on ${hostname}:${port}`,
      { recoverable: true, context: { hostname, port } }
    );
    this.name = 'SSHNotAvailableError';
    this.hostname = hostname;
    this.port = port;
  }

  get suggestion(): string {
    return `Ensure SSH server is running on the target device (port ${this.port})`;
  }
}

/**
 * Invalid hostname (contains shell metacharacters)
 */
export class TailscaleInvalidHostnameError extends WorkspaceError {
  public readonly hostname: string;

  constructor(hostname: string) {
    super(
      'TAILSCALE_INVALID_HOSTNAME',
      `Invalid hostname: ${hostname}`,
      { recoverable: false, context: { hostname } }
    );
    this.name = 'TailscaleInvalidHostnameError';
    this.hostname = hostname;
  }

  get suggestion(): string {
    return 'Hostnames can only contain letters, numbers, dashes, underscores, and dots.';
  }
}

/**
 * Check if error is a Tailscale error
 */
export function isTailscaleError(error: unknown): error is WorkspaceError {
  return (
    error instanceof WorkspaceError &&
    typeof error.code === 'string' &&
    error.code.startsWith('TAILSCALE_')
  );
}

/**
 * Check if error is recoverable
 */
export function isRecoverableError(error: unknown): boolean {
  if (error instanceof WorkspaceError) {
    return error.recoverable ?? false;
  }
  return false;
}
