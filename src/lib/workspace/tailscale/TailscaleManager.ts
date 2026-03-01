/**
 * TailscaleManager
 *
 * Central service for Tailscale integration. Handles device discovery,
 * connection status, and provides the bridge between Tailscale CLI and
 * the SSHProvider.
 *
 * SECURITY: All CLI outputs are validated before use to prevent command injection.
 */

import { exec } from 'child_process';
import { EventEmitter } from 'events';
import { createLogger } from '@/lib/logger';
import {
  validateTailscaleIP,
  validateHostname,
  sanitizeHostname,
  validateDnsName,
} from './validation';
import {
  TailscaleNotInstalledError,
  TailscaleVersionError,
  TailscaleNotLoggedInError,
  TailscaleNotConnectedError,
  TailscaleDeviceNotFoundError,
  TailscaleDeviceOfflineError,
  TailscaleTimeoutError,
  TailscalePermissionError,
  TailscaleInvalidIPError,
} from './errors';
import type {
  TailscaleDevice,
  TailscaleStatus,
  TailscaleStatusNotInstalled,
  TailscaleStatusInstalled,
  TailscalePingResult,
  TailscaleVersionCheck,
  ExecWithTimeoutOptions,
} from './types';

const log = createLogger('TailscaleManager');

// ============================================================================
// Constants
// ============================================================================

const CLI_TIMEOUT_MS = 5000; // 5 second timeout for CLI calls
const PING_TIMEOUT_MS = 10000; // 10 second timeout for ping
const MIN_TAILSCALE_VERSION = '1.8.0'; // Version that added --json flag
const CACHE_TTL_MS = 30000; // 30 second cache
const REFRESH_INTERVAL_MS = 60000; // 1 minute polling

// ============================================================================
// CLI Execution
// ============================================================================

/**
 * Execute a shell command with timeout
 *
 * @param command - Command to execute
 * @param options - Execution options
 * @returns Command output
 * @throws TailscaleTimeoutError if command times out
 * @throws TailscalePermissionError if permission denied
 * @throws TailscaleNotInstalledError if CLI not found
 */
async function execWithTimeout(
  command: string,
  options: ExecWithTimeoutOptions = {}
): Promise<{ stdout: string; stderr: string }> {
  const timeout = options.timeout ?? CLI_TIMEOUT_MS;

  return new Promise((resolve, reject) => {
    const child = exec(command, { timeout }, (error, stdout, stderr) => {
      if (error) {
        // Handle specific error types
        if (error.killed) {
          reject(new TailscaleTimeoutError(command, timeout));
        } else if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          reject(new TailscaleNotInstalledError());
        } else if (
          error.message.includes('permission denied') ||
          error.message.includes('Permission denied')
        ) {
          reject(new TailscalePermissionError());
        } else {
          reject(error);
        }
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

// ============================================================================
// TailscaleManager Class
// ============================================================================

export class TailscaleManager extends EventEmitter {
  private statusCache: TailscaleStatus | null = null;
  private cacheExpiry: number = 0;
  private refreshInterval: NodeJS.Timeout | null = null;
  private isRefreshing: boolean = false;
  private pendingStatusRequest: Promise<TailscaleStatus> | null = null;

  // ============================================================================
  // Availability Checks
  // ============================================================================

  /**
   * Check if Tailscale CLI is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await execWithTimeout('tailscale version', { timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check Tailscale version meets minimum requirements
   */
  async checkVersion(): Promise<TailscaleVersionCheck> {
    try {
      const { stdout } = await execWithTimeout('tailscale version', {
        timeout: 2000,
      });
      const versionMatch = stdout.match(/(\d+\.\d+\.\d+)/);
      const version = versionMatch?.[1] ?? '0.0.0';

      const [major, minor, patch] = version.split('.').map(Number);
      const [minMajor, minMinor, minPatch] = MIN_TAILSCALE_VERSION.split(
        '.'
      ).map(Number);

      const valid =
        major > minMajor ||
        (major === minMajor && minor > minMinor) ||
        (major === minMajor && minor === minMinor && patch >= minPatch);

      return { valid, version, minimum: MIN_TAILSCALE_VERSION };
    } catch {
      return { valid: false, version: '0.0.0', minimum: MIN_TAILSCALE_VERSION };
    }
  }

  // ============================================================================
  // Status & Device Discovery
  // ============================================================================

  /**
   * Get Tailscale status with device list
   *
   * Uses caching and request deduplication to minimize CLI calls.
   */
  async getStatus(): Promise<TailscaleStatus> {
    // Return cached if fresh
    if (this.statusCache && Date.now() < this.cacheExpiry) {
      return this.statusCache;
    }

    // Deduplicate concurrent requests
    if (this.pendingStatusRequest) {
      return this.pendingStatusRequest;
    }

    // Start new request
    this.pendingStatusRequest = this._fetchStatus();

    try {
      return await this.pendingStatusRequest;
    } finally {
      this.pendingStatusRequest = null;
    }
  }

  /**
   * Internal status fetch (not cached or deduplicated)
   */
  private async _fetchStatus(): Promise<TailscaleStatus> {
    // Check if installed
    const installed = await this.isAvailable();
    if (!installed) {
      const status: TailscaleStatusNotInstalled = {
        installed: false,
        loggedIn: false,
        connected: false,
        tailnetName: '',
        selfDevice: null,
        devices: [],
        version: '',
      };
      this.statusCache = status;
      return status;
    }

    // Check version
    const versionCheck = await this.checkVersion();
    if (!versionCheck.valid) {
      log.warn('Tailscale version too old', versionCheck);
      const status: TailscaleStatusInstalled = {
        installed: true,
        loggedIn: false,
        connected: false,
        tailnetName: '',
        selfDevice: null,
        devices: [],
        version: versionCheck.version,
        error: `Tailscale version ${versionCheck.version} is below minimum ${versionCheck.minimum}. Please upgrade.`,
      };
      this.statusCache = status;
      return status;
    }

    try {
      // Get full status as JSON
      const { stdout } = await execWithTimeout('tailscale status --json');
      const data = JSON.parse(stdout);

      // Parse devices with validation
      const devices: TailscaleDevice[] = [];

      for (const [id, peer] of Object.entries(data.Peer || {})) {
        try {
          const p = peer as Record<string, unknown>;
          const tailscaleIP = (p.TailscaleIPs as string[])?.[0] || '';

          // Validate IP
          if (tailscaleIP && !validateTailscaleIP(tailscaleIP)) {
            log.warn('Skipping device with invalid Tailscale IP', {
              id,
              ip: tailscaleIP,
            });
            continue;
          }

          // Validate DNS name
          const dnsName = (p.DNSName as string) || '';
          if (dnsName && !validateDnsName(dnsName)) {
            log.warn('Skipping device with invalid DNS name', { id, dnsName });
            continue;
          }

          // Validate hostname
          const hostname = (p.HostName as string) || 'unknown';
          let safeHostname: string;
          try {
            safeHostname = sanitizeHostname(hostname);
          } catch {
            safeHostname = 'unknown';
            log.warn('Invalid hostname sanitized', { id, hostname });
          }

          devices.push({
            id,
            hostname: safeHostname,
            dnsName,
            tailscaleIP,
            os: (p.OS as string) || 'unknown',
            online: (p.Online as boolean) ?? false,
            lastSeen: new Date((p.LastSeen as string) || 0),
            tags: (p.Tags as string[]) || [],
            sshEnabled: ((p.SSH as Record<string, unknown>)?.SSH as boolean) ?? false,
            user: String((p.UserID as number) || ''),
            isSelf: false,
          });
        } catch (peerError) {
          log.warn('Failed to parse Tailscale peer, skipping', {
            id,
            error: peerError,
          });
          continue;
        }
      }

      // Parse self device
      const self = data.Self as Record<string, unknown> | undefined;
      let selfDevice: TailscaleDevice | null = null;

      if (self) {
        const selfIP = (self.TailscaleIPs as string[])?.[0] || '';
        const selfHostname = (self.HostName as string) || 'this-device';

        try {
          selfDevice = {
            id: (self.ID as string) || '',
            hostname: validateHostname(selfHostname) ? selfHostname : 'this-device',
            dnsName: (self.DNSName as string) || '',
            tailscaleIP: validateTailscaleIP(selfIP) ? selfIP : '',
            os: (self.OS as string) || process.platform,
            online: true,
            lastSeen: new Date(),
            tags: (self.Tags as string[]) || [],
            sshEnabled: false,
            user: String((self.UserID as number) || ''),
            isSelf: true,
          };
        } catch (selfError) {
          log.warn('Failed to parse self device', { error: selfError });
        }
      }

      const status: TailscaleStatusInstalled = {
        installed: true,
        loggedIn: !!data.Self,
        connected: data.BackendState === 'Running',
        tailnetName: (data.MagicDNSSuffix as string) || '',
        selfDevice,
        devices,
        version: (data.Version as string) || versionCheck.version,
      };

      this.statusCache = status;
      this.cacheExpiry = Date.now() + CACHE_TTL_MS;

      return status;
    } catch (error) {
      log.error('Failed to get Tailscale status', { error });

      const status: TailscaleStatusInstalled = {
        installed: true,
        loggedIn: false,
        connected: false,
        tailnetName: '',
        selfDevice: null,
        devices: [],
        version: versionCheck.version,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      // Don't cache error states
      return status;
    }
  }

  /**
   * Get all devices (excluding self)
   */
  async listDevices(): Promise<TailscaleDevice[]> {
    const status = await this.getStatus();
    return status.devices.filter((d) => !d.isSelf);
  }

  /**
   * Get devices matching a hostname (may return multiple for collisions)
   */
  async getDevicesByHostname(hostname: string): Promise<TailscaleDevice[]> {
    const devices = await this.listDevices();
    return devices.filter(
      (d) =>
        d.hostname === hostname ||
        d.dnsName.startsWith(hostname + '.') ||
        d.tailscaleIP === hostname
    );
  }

  /**
   * Get device by unique Tailscale node ID (preferred method)
   */
  async getDeviceById(deviceId: string): Promise<TailscaleDevice | null> {
    const devices = await this.listDevices();
    return devices.find((d) => d.id === deviceId) || null;
  }

  /**
   * @deprecated Use getDeviceById() for unambiguous selection
   */
  async getDevice(hostname: string): Promise<TailscaleDevice | null> {
    const matches = await this.getDevicesByHostname(hostname);
    if (matches.length > 1) {
      log.warn('Multiple devices match hostname, returning first', {
        hostname,
        matches: matches.map((d) => ({ id: d.id, hostname: d.hostname })),
      });
    }
    return matches[0] || null;
  }

  /**
   * Force refresh device list
   */
  async refreshDevices(): Promise<void> {
    // Backpressure: skip if already refreshing
    if (this.isRefreshing) {
      log.debug('Skipping refresh, already in progress');
      return;
    }

    this.isRefreshing = true;
    try {
      this.statusCache = null;
      this.cacheExpiry = 0;
      const status = await this.getStatus();
      this.emit('devices:updated', status.devices);
    } finally {
      this.isRefreshing = false;
    }
  }

  // ============================================================================
  // Connectivity
  // ============================================================================

  /**
   * Ping a device to test connectivity
   *
   * @param device - Device to ping
   * @returns Ping result with latency and connection type
   */
  async ping(device: TailscaleDevice): Promise<TailscalePingResult> {
    // Validate IP before use in shell command
    if (!validateTailscaleIP(device.tailscaleIP)) {
      log.error('Refusing to ping invalid Tailscale IP', {
        ip: device.tailscaleIP,
      });
      return {
        latency: -1,
        via: 'relay',
        error: 'Invalid Tailscale IP address',
      };
    }

    try {
      const { stdout } = await execWithTimeout(
        `tailscale ping --c 1 ${device.tailscaleIP}`,
        { timeout: PING_TIMEOUT_MS }
      );

      // Parse output: "pong from my-pc (100.x.x.x) via DERP(nyc) in 45ms"
      // or: "pong from my-pc (100.x.x.x) via 192.168.1.5:41641 in 2ms"
      const latencyMatch = stdout.match(/in (\d+)ms/);
      const latency = latencyMatch ? parseInt(latencyMatch[1], 10) : 0;

      const via: 'direct' | 'relay' = stdout.includes('via DERP')
        ? 'relay'
        : 'direct';

      log.debug('Ping successful', {
        device: device.hostname,
        latency,
        via,
      });

      return { latency, via };
    } catch (error) {
      log.warn('Ping failed', {
        device: device.hostname,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        latency: -1,
        via: 'relay',
        error: error instanceof Error ? error.message : 'Ping failed',
      };
    }
  }

  // ============================================================================
  // Polling
  // ============================================================================

  /**
   * Start background polling for status updates
   */
  startPolling(): void {
    if (this.refreshInterval) {
      return;
    }

    log.info('Starting Tailscale status polling', {
      interval: REFRESH_INTERVAL_MS,
    });

    this.refreshInterval = setInterval(async () => {
      const oldStatus = this.statusCache;
      await this.refreshDevices();

      if (oldStatus?.connected !== this.statusCache?.connected) {
        this.emit('status:changed', this.statusCache);
      }
    }, REFRESH_INTERVAL_MS);
  }

  /**
   * Stop background polling
   */
  stopPolling(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      log.info('Stopped Tailscale status polling');
    }
  }

  /**
   * Check if polling is active
   */
  isPolling(): boolean {
    return this.refreshInterval !== null;
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopPolling();
    this.removeAllListeners();
    this.statusCache = null;
    this.pendingStatusRequest = null;
    log.debug('TailscaleManager destroyed');
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let manager: TailscaleManager | null = null;

/**
 * Get the singleton TailscaleManager instance
 */
export function getTailscaleManager(): TailscaleManager {
  if (!manager) {
    manager = new TailscaleManager();
  }
  return manager;
}

/**
 * Reset singleton (for testing)
 */
export function __resetManagerForTesting(): void {
  if (manager) {
    manager.destroy();
    manager = null;
  }
}
