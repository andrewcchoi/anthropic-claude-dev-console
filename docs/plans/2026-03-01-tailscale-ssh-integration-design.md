# Tailscale + SSH Integration Design

**Date:** 2026-03-01
**Status:** Draft v3 - Ralph Loop Iterations 1-2 Complete
**Parent:** docs/plans/2026-02-22-flexible-workspace-design.md
**Review History:**
- Iteration 1: 35% confidence → Fixed 5 CRITICAL, 7 MEDIUM gaps
- Iteration 2: 72% confidence → Fixed 2 new CRITICAL, 4 MEDIUM gaps
- Current: Targeting 80%+ confidence for PASS

## Executive Summary

This design integrates Tailscale into the existing SSH workspace provider, enabling secure remote access to any device on a Tailscale network without port forwarding, NAT traversal complexity, or public IP exposure. The integration is additive - existing SSH functionality remains unchanged.

## Problem Statement

Users want to SSH into their home/work machines from anywhere (coffee shop, mobile, etc.) but face:

1. **NAT traversal** - Home routers block inbound connections
2. **Dynamic IPs** - Home IPs change, breaking bookmarked connections
3. **Port forwarding** - Complex router config, security exposure
4. **Firewall policies** - Corporate/hotel networks block SSH port 22

**Tailscale solves all of these** by creating an encrypted WireGuard mesh network with stable IPs.

## Design Goals

| Goal | Description |
|------|-------------|
| **Zero-config for users** | Select device from list, connect. No manual IP entry. |
| **Transparent integration** | Existing SSHProvider works unchanged over Tailscale |
| **Graceful degradation** | Works without Tailscale (falls back to direct SSH) |
| **No Tailscale lock-in** | Users can still use manual SSH to any host |
| **Secure by default** | WireGuard encryption + SSH encryption (defense in depth) |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         UI Layer                                     │
├─────────────────────────────────────────────────────────────────────┤
│ AddWorkspaceDialog                                                   │
│ ├── SSHWorkspaceForm (manual config)                                │
│ └── TailscaleDevicePicker (auto-discovery)                          │
├─────────────────────────────────────────────────────────────────────┤
│                      Service Layer                                   │
├─────────────────────────────────────────────────────────────────────┤
│ TailscaleManager                                                     │
│ ├── Device Discovery (tailscale status --json)                      │
│ ├── Connection Status                                                │
│ ├── Magic DNS Resolution                                             │
│ └── Health Monitoring                                                │
├─────────────────────────────────────────────────────────────────────┤
│                     Provider Layer                                   │
├─────────────────────────────────────────────────────────────────────┤
│ SSHProvider (existing)                                               │
│ ├── Uses Tailscale IP when available (100.x.x.x)                    │
│ ├── Uses Magic DNS hostname when available (my-pc)                  │
│ └── Falls back to direct hostname/IP                                │
├─────────────────────────────────────────────────────────────────────┤
│                     Network Layer                                    │
├─────────────────────────────────────────────────────────────────────┤
│ Tailscale Network (WireGuard mesh)                                  │
│ └── Direct P2P or DERP relay (automatic)                            │
└─────────────────────────────────────────────────────────────────────┘
```

## 1. TailscaleManager

Central service for Tailscale integration.

### 1.1 Interface

```typescript
interface TailscaleDevice {
  id: string;                    // Tailscale node ID
  hostname: string;              // Device hostname (my-pc)
  dnsName: string;               // Magic DNS name (my-pc.tailnet-name.ts.net)
  tailscaleIP: string;           // Tailscale IP (100.x.x.x)
  os: string;                    // Operating system
  online: boolean;               // Currently reachable
  lastSeen: Date;                // Last activity timestamp
  tags: string[];                // Tailscale ACL tags
  sshEnabled: boolean;           // Tailscale SSH available
  user: string;                  // Owner email
  isSelf: boolean;               // Is this the local device
}

interface TailscaleStatus {
  installed: boolean;            // Tailscale CLI available
  loggedIn: boolean;             // Authenticated to tailnet
  connected: boolean;            // Network connection active
  tailnetName: string;           // Network name
  selfDevice: TailscaleDevice;   // This device's info
  devices: TailscaleDevice[];    // All devices in tailnet
  version: string;               // Tailscale version
}

interface TailscaleManager {
  // Status
  getStatus(): Promise<TailscaleStatus>;
  isAvailable(): Promise<boolean>;

  // Device Discovery
  listDevices(): Promise<TailscaleDevice[]>;
  getDevice(hostname: string): Promise<TailscaleDevice | null>;
  refreshDevices(): Promise<void>;

  // Connection
  ping(device: TailscaleDevice): Promise<{ latency: number; via: 'direct' | 'relay' }>;

  // Events
  on(event: 'devices:updated', handler: (devices: TailscaleDevice[]) => void): void;
  on(event: 'status:changed', handler: (status: TailscaleStatus) => void): void;
}
```

### 1.2 Implementation

```typescript
// src/lib/workspace/tailscale/TailscaleManager.ts

import { exec } from 'child_process';
import { promisify } from 'util';
import { EventEmitter } from 'events';
import { createLogger } from '@/lib/logger';

const execAsync = promisify(exec);
const log = createLogger('TailscaleManager');

// ============================================================================
// SECURITY: Input Validation (CRITICAL FIX #1)
// ============================================================================

/**
 * Validate Tailscale IPv4 address (100.x.x.x range)
 * CRITICAL: Prevents command injection via malicious IP values
 */
function validateTailscaleIPv4(ip: string): boolean {
  const pattern = /^100\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = ip.match(pattern);
  if (!match) return false;

  // Validate each octet is 0-255
  const [, b, c, d] = match;
  return [b, c, d].every(octet => {
    const num = parseInt(octet, 10);
    return num >= 0 && num <= 255;
  });
}

/**
 * Validate Tailscale IPv6 address (fd7a:115c:a1e0::/48 range)
 */
function validateTailscaleIPv6(ip: string): boolean {
  // Tailscale uses fd7a:115c:a1e0::/48 prefix
  const pattern = /^fd7a:115c:a1e0:[0-9a-f:]+$/i;
  return pattern.test(ip);
}

/**
 * Validate any Tailscale IP (v4 or v6)
 */
function validateTailscaleIP(ip: string): boolean {
  return validateTailscaleIPv4(ip) || validateTailscaleIPv6(ip);
}

/**
 * Sanitize hostname for shell command (no shell metacharacters)
 */
function sanitizeHostname(hostname: string): string {
  // Only allow alphanumeric, dash, underscore, dot
  if (!/^[\w.-]+$/.test(hostname)) {
    throw new Error(`Invalid hostname: ${hostname}`);
  }
  return hostname;
}

// ============================================================================
// RELIABILITY: CLI Execution with Timeout (CRITICAL FIX #2)
// ============================================================================

const CLI_TIMEOUT_MS = 5000; // 5 second timeout for all CLI calls
const MIN_TAILSCALE_VERSION = '1.8.0'; // --json flag added

interface ExecWithTimeoutOptions {
  timeout?: number;
  signal?: AbortSignal;
}

async function execWithTimeout(
  command: string,
  options: ExecWithTimeoutOptions = {}
): Promise<{ stdout: string; stderr: string }> {
  const timeout = options.timeout ?? CLI_TIMEOUT_MS;

  return new Promise((resolve, reject) => {
    const child = exec(command, { timeout }, (error, stdout, stderr) => {
      if (error) {
        if (error.killed) {
          reject(new Error(`Command timed out after ${timeout}ms: ${command}`));
        } else if ((error as any).code === 'ENOENT') {
          reject(new Error('Tailscale CLI not found. Is it installed and in PATH?'));
        } else if (error.message.includes('permission denied')) {
          reject(new Error('Permission denied. Tailscale may require sudo or group membership.'));
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
// Types (with proper null handling - FIX #8)
// ============================================================================

interface TailscaleStatusNotInstalled {
  installed: false;
  loggedIn: false;
  connected: false;
  tailnetName: '';
  selfDevice: null;
  devices: [];
  version: '';
  error?: string;
}

interface TailscaleStatusInstalled {
  installed: true;
  loggedIn: boolean;
  connected: boolean;
  tailnetName: string;
  selfDevice: TailscaleDevice | null; // null when logged out
  devices: TailscaleDevice[];
  version: string;
  error?: string;
}

type TailscaleStatus = TailscaleStatusNotInstalled | TailscaleStatusInstalled;

// ============================================================================
// TailscaleManager
// ============================================================================

export class TailscaleManager extends EventEmitter {
  private statusCache: TailscaleStatus | null = null;
  private cacheExpiry: number = 0;
  private refreshInterval: NodeJS.Timeout | null = null;
  private isRefreshing: boolean = false; // Backpressure guard (FIX #7)
  private pendingStatusRequest: Promise<TailscaleStatus> | null = null; // FIX #25: Deduplication

  private readonly CACHE_TTL = 30000; // 30 seconds
  private readonly REFRESH_INTERVAL = 60000; // 1 minute

  async isAvailable(): Promise<boolean> {
    try {
      await execWithTimeout('tailscale version', { timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check Tailscale version meets minimum requirement (FIX #12)
   */
  async checkVersion(): Promise<{ valid: boolean; version: string; minimum: string }> {
    try {
      const { stdout } = await execWithTimeout('tailscale version', { timeout: 2000 });
      const versionMatch = stdout.match(/(\d+\.\d+\.\d+)/);
      const version = versionMatch?.[1] ?? '0.0.0';

      const [major, minor, patch] = version.split('.').map(Number);
      const [minMajor, minMinor, minPatch] = MIN_TAILSCALE_VERSION.split('.').map(Number);

      const valid = major > minMajor ||
        (major === minMajor && minor > minMinor) ||
        (major === minMajor && minor === minMinor && patch >= minPatch);

      return { valid, version, minimum: MIN_TAILSCALE_VERSION };
    } catch {
      return { valid: false, version: '0.0.0', minimum: MIN_TAILSCALE_VERSION };
    }
  }

  async getStatus(): Promise<TailscaleStatus> {
    // Return cached if fresh
    if (this.statusCache && Date.now() < this.cacheExpiry) {
      return this.statusCache;
    }

    // FIX #25: Deduplicate concurrent requests
    // If a request is already in flight, return the same promise
    if (this.pendingStatusRequest) {
      return this.pendingStatusRequest;
    }

    // Start new request and store promise
    this.pendingStatusRequest = this._fetchStatus();

    try {
      return await this.pendingStatusRequest;
    } finally {
      this.pendingStatusRequest = null;
    }
  }

  private async _fetchStatus(): Promise<TailscaleStatus> {
    // Check if tailscale is installed
    const installed = await this.isAvailable();
    if (!installed) {
      const notInstalledStatus: TailscaleStatusNotInstalled = {
        installed: false,
        loggedIn: false,
        connected: false,
        tailnetName: '',
        selfDevice: null,
        devices: [],
        version: '',
      };
      this.statusCache = notInstalledStatus;
      return notInstalledStatus;
    }

    // Check version compatibility
    const versionCheck = await this.checkVersion();
    if (!versionCheck.valid) {
      log.warn('Tailscale version too old', versionCheck);
      return {
        installed: true,
        loggedIn: false,
        connected: false,
        tailnetName: '',
        selfDevice: null,
        devices: [],
        version: versionCheck.version,
        error: `Tailscale version ${versionCheck.version} is below minimum ${versionCheck.minimum}. Please upgrade.`,
      };
    }

    try {
      // Get full status as JSON with timeout
      const { stdout } = await execWithTimeout('tailscale status --json');
      const data = JSON.parse(stdout);

      // Parse devices with IP validation and per-peer error handling (FIX #19)
      const devices: TailscaleDevice[] = [];
      const selfID = data.Self?.ID;

      for (const [id, peer] of Object.entries(data.Peer || {})) {
        // Per-peer try-catch: malformed peer doesn't break entire list
        try {
          const p = peer as any;
          const tailscaleIP = p.TailscaleIPs?.[0] || '';

          // CRITICAL: Validate IP before storing
          if (tailscaleIP && !validateTailscaleIP(tailscaleIP)) {
            log.warn('Skipping device with invalid Tailscale IP', { id, ip: tailscaleIP });
            continue;
          }

          // Sanitize dnsName too (FIX #23)
          const dnsName = p.DNSName || '';
          if (dnsName && !/^[\w.-]+$/.test(dnsName)) {
            log.warn('Skipping device with invalid DNS name', { id, dnsName });
            continue;
          }

          devices.push({
            id,
            hostname: sanitizeHostname(p.HostName || 'unknown'),
            dnsName,
            tailscaleIP,
            os: p.OS || 'unknown',
            online: p.Online ?? false,
            lastSeen: new Date(p.LastSeen || 0),
            tags: p.Tags || [],
            sshEnabled: p.SSH?.SSH ?? false,
            user: p.UserID?.toString() || '',
            isSelf: false,
          });
        } catch (peerError) {
          // Log but continue - one bad peer shouldn't break discovery
          log.warn('Failed to parse Tailscale peer, skipping', { id, error: peerError });
          continue;
        }
      }

      // Add self
      const self = data.Self;
      const selfTailscaleIP = self?.TailscaleIPs?.[0] || '';

      const selfDevice: TailscaleDevice | null = self ? {
        id: selfID,
        hostname: sanitizeHostname(self?.HostName || 'this-device'),
        dnsName: self?.DNSName || '',
        tailscaleIP: validateTailscaleIP(selfTailscaleIP) ? selfTailscaleIP : '',
        os: self?.OS || process.platform,
        online: true,
        lastSeen: new Date(),
        tags: self?.Tags || [],
        sshEnabled: false,
        user: self?.UserID?.toString() || '',
        isSelf: true,
      } : null;

      const status: TailscaleStatusInstalled = {
        installed: true,
        loggedIn: !!data.Self,
        connected: data.BackendState === 'Running',
        tailnetName: data.MagicDNSSuffix || '',
        selfDevice,
        devices,
        version: data.Version || versionCheck.version,
      };

      this.statusCache = status;
      this.cacheExpiry = Date.now() + this.CACHE_TTL;

      return status;
    } catch (error) {
      log.error('Failed to get Tailscale status', { error });

      // Return error state with details
      return {
        installed: true,
        loggedIn: false,
        connected: false,
        tailnetName: '',
        selfDevice: null,
        devices: [],
        version: versionCheck.version,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async listDevices(): Promise<TailscaleDevice[]> {
    const status = await this.getStatus();
    return status.devices.filter(d => !d.isSelf);
  }

  /**
   * Get devices matching a hostname (CRITICAL FIX #3 - return ALL matches)
   * Returns array to handle hostname collisions
   */
  async getDevicesByHostname(hostname: string): Promise<TailscaleDevice[]> {
    const devices = await this.listDevices();
    return devices.filter(d =>
      d.hostname === hostname ||
      d.dnsName.startsWith(hostname + '.') ||
      d.tailscaleIP === hostname
    );
  }

  /**
   * Get device by unique Tailscale node ID (preferred for unambiguous selection)
   */
  async getDeviceById(deviceId: string): Promise<TailscaleDevice | null> {
    const devices = await this.listDevices();
    return devices.find(d => d.id === deviceId) || null;
  }

  /**
   * @deprecated Use getDevicesByHostname() to handle hostname collisions
   */
  async getDevice(hostname: string): Promise<TailscaleDevice | null> {
    const matches = await this.getDevicesByHostname(hostname);
    if (matches.length > 1) {
      log.warn('Multiple devices match hostname, returning first', {
        hostname,
        matches: matches.map(d => ({ id: d.id, hostname: d.hostname }))
      });
    }
    return matches[0] || null;
  }

  async refreshDevices(): Promise<void> {
    // Backpressure: skip if already refreshing (FIX #7)
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

  /**
   * Ping a device to test connectivity
   * CRITICAL: IP is validated before use in shell command
   */
  async ping(device: TailscaleDevice): Promise<{
    latency: number;
    via: 'direct' | 'relay';
    error?: string;
  }> {
    // CRITICAL: Validate IP before passing to shell
    if (!validateTailscaleIP(device.tailscaleIP)) {
      log.error('Refusing to ping invalid Tailscale IP', { ip: device.tailscaleIP });
      return { latency: -1, via: 'relay', error: 'Invalid Tailscale IP address' };
    }

    try {
      // IP is validated - safe to use in command
      const { stdout } = await execWithTimeout(
        `tailscale ping --c 1 ${device.tailscaleIP}`,
        { timeout: 10000 } // 10s for ping
      );

      // Parse "pong from my-pc (100.x.x.x) via DERP(nyc) in 45ms"
      // or "pong from my-pc (100.x.x.x) via 192.168.1.5:41641 in 2ms"
      const latencyMatch = stdout.match(/in (\d+)ms/);
      const latency = latencyMatch ? parseInt(latencyMatch[1]) : 0;

      const via: 'direct' | 'relay' = stdout.includes('via DERP') ? 'relay' : 'direct';

      return { latency, via };
    } catch (error) {
      return {
        latency: -1,
        via: 'relay',
        error: error instanceof Error ? error.message : 'Ping failed'
      };
    }
  }

  startPolling(): void {
    if (this.refreshInterval) return;

    this.refreshInterval = setInterval(async () => {
      const oldStatus = this.statusCache;
      await this.refreshDevices();

      if (oldStatus?.connected !== this.statusCache?.connected) {
        this.emit('status:changed', this.statusCache);
      }
    }, this.REFRESH_INTERVAL);
  }

  stopPolling(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
}

// Singleton instance
let manager: TailscaleManager | null = null;

export function getTailscaleManager(): TailscaleManager {
  if (!manager) {
    manager = new TailscaleManager();
  }
  return manager;
}
```

## 2. SSHProvider Integration

### 2.1 Config Extension

```typescript
// Extended SSHProviderConfig
interface SSHProviderConfig {
  // Existing fields
  hostname: string;
  port?: number;
  username: string;
  password?: string;
  privateKey?: Buffer;
  passphrase?: string;
  remotePath?: string;

  // New Tailscale fields (FIX #3: use deviceId instead of hostname)
  tailscale?: {
    enabled: boolean;           // Use Tailscale for this connection
    deviceId: string;           // Tailscale device ID (REQUIRED - unique identifier)
    useMagicDNS?: boolean;      // Use Magic DNS instead of IP (default: false)
    requireDirect?: boolean;    // FAIL if connection goes through DERP relay (FIX #4)
  };
}
```

### 2.2 Connection Resolution

When SSHProvider connects, it resolves the hostname:

```typescript
// In SSHProvider.connect()
async connect(): Promise<void> {
  let resolvedHost = this.hostname;
  let resolvedPort = this.port;

  // If Tailscale is enabled, try to resolve via Tailscale
  if (this.config.tailscale?.enabled) {
    const tailscale = getTailscaleManager();

    // Use deviceId for unambiguous device lookup (FIX #3)
    const device = await tailscale.getDeviceById(this.config.tailscale.deviceId);

    if (!device) {
      throw new TailscaleDeviceNotFoundError(this.config.tailscale.deviceId);
    }

    if (!device.online) {
      throw new TailscaleDeviceOfflineError(device.hostname);
    }

    // Check connectivity before connecting (FIX #4 - requireDirect)
    if (this.config.tailscale.requireDirect) {
      const pingResult = await tailscale.ping(device);

      if (pingResult.via === 'relay') {
        throw new TailscaleRelayNotAllowedError(device.hostname, {
          suggestion: 'Direct connection required but traffic would go through DERP relay. ' +
            'This may be due to NAT traversal failure or firewall restrictions. ' +
            'Disable requireDirect to allow relay connections, or check network settings.',
        });
      }

      this.log('info', 'Direct Tailscale connection confirmed', {
        device: device.hostname,
        latency: pingResult.latency,
      });
    }

    // Use Tailscale IP or Magic DNS
    resolvedHost = this.config.tailscale.useMagicDNS
      ? device.dnsName
      : device.tailscaleIP;

    this.log('info', 'Using Tailscale connection', {
      original: this.hostname,
      resolved: resolvedHost,
      deviceId: device.id,
      method: this.config.tailscale.useMagicDNS ? 'MagicDNS' : 'TailscaleIP',
    });
  }

  // Continue with existing connection logic using resolvedHost
  // ...
}
```

### 2.3 SSH Health Check (FIX #11)

Before completing connection setup, verify SSH is actually reachable:

```typescript
/**
 * Test if SSH server is running on target device
 * Called after Tailscale resolution but before full connection
 */
async testSSHConnection(host: string, port: number, timeout: number = 5000): Promise<{
  reachable: boolean;
  error?: string;
}> {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    const timer = setTimeout(() => {
      socket.destroy();
      resolve({ reachable: false, error: 'Connection timeout' });
    }, timeout);

    socket.on('connect', () => {
      clearTimeout(timer);
      socket.destroy();
      resolve({ reachable: true });
    });

    socket.on('error', (err) => {
      clearTimeout(timer);
      socket.destroy();
      resolve({
        reachable: false,
        error: err.code === 'ECONNREFUSED'
          ? `SSH server not running on port ${port}`
          : err.message
      });
    });

    socket.connect(port, host);
  });
}
```

## 3. UI Components

### 3.1 TailscaleDevicePicker

Device selection component for AddWorkspaceDialog.

```tsx
// src/components/workspace/TailscaleDevicePicker.tsx

interface TailscaleDevicePickerProps {
  onSelect: (device: TailscaleDevice) => void;
  selectedDeviceId?: string;
}

export function TailscaleDevicePicker({ onSelect, selectedDeviceId }: TailscaleDevicePickerProps) {
  const [status, setStatus] = useState<TailscaleStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/workspace/tailscale/status');
      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError('Failed to load Tailscale status');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <DevicePickerSkeleton />;
  }

  if (!status?.installed) {
    return (
      <TailscaleInstallPrompt
        message="Tailscale is not installed"
        installUrl="https://tailscale.com/download"
      />
    );
  }

  if (!status.loggedIn) {
    return (
      <TailscaleLoginPrompt
        message="Please log in to Tailscale"
        command="tailscale login"
      />
    );
  }

  const onlineDevices = status.devices.filter(d => d.online);
  const offlineDevices = status.devices.filter(d => !d.online);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Your Devices</h3>
        <Button variant="ghost" size="sm" onClick={loadStatus}>
          <RefreshIcon className="w-4 h-4" />
        </Button>
      </div>

      {/* Online Devices */}
      <div className="space-y-2">
        <Label className="text-green-500">Online ({onlineDevices.length})</Label>
        {onlineDevices.map(device => (
          <DeviceCard
            key={device.id}
            device={device}
            selected={device.id === selectedDeviceId}
            onClick={() => onSelect(device)}
          />
        ))}
      </div>

      {/* Offline Devices */}
      {offlineDevices.length > 0 && (
        <div className="space-y-2 opacity-60">
          <Label className="text-gray-500">Offline ({offlineDevices.length})</Label>
          {offlineDevices.map(device => (
            <DeviceCard
              key={device.id}
              device={device}
              selected={false}
              onClick={() => {}} // Disabled
              disabled
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DeviceCard({ device, selected, onClick, disabled }: DeviceCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      // Accessibility (FIX #18)
      role="option"
      aria-selected={selected}
      aria-disabled={disabled}
      aria-label={`${device.hostname}, ${device.os}, ${device.online ? 'online' : 'offline'}, IP ${device.tailscaleIP}`}
      className={cn(
        "w-full p-3 rounded-lg border text-left transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
        selected && "border-blue-500 bg-blue-50 dark:bg-blue-900/20",
        !selected && !disabled && "hover:border-gray-400 dark:hover:border-gray-500",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <div className="flex items-center gap-3">
        <OSIcon os={device.os} className="w-8 h-8" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{device.hostname}</div>
          <div className="text-sm text-gray-500 truncate">{device.tailscaleIP}</div>
        </div>
        {device.online ? (
          <div
            className="w-2 h-2 rounded-full bg-green-500"
            role="status"
            aria-label="Online"
          />
        ) : (
          <div
            className="w-2 h-2 rounded-full bg-gray-400"
            role="status"
            aria-label="Offline"
          />
        )}
      </div>
    </button>
  );
}
```

### 3.2 Hostname Collision Handling (FIX #3)

When multiple devices share the same hostname, show disambiguation UI:

```tsx
function DeviceDisambiguationDialog({
  hostname,
  devices,
  onSelect,
  onCancel,
}: {
  hostname: string;
  devices: TailscaleDevice[];
  onSelect: (device: TailscaleDevice) => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open onOpenChange={() => onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Multiple devices named "{hostname}"</DialogTitle>
          <DialogDescription>
            Select the specific device you want to connect to:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2" role="listbox" aria-label="Select device">
          {devices.map(device => (
            <button
              key={device.id}
              onClick={() => onSelect(device)}
              className="w-full p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 text-left"
              role="option"
              aria-label={`${device.hostname} on ${device.os}, IP ${device.tailscaleIP}, last seen ${formatRelativeTime(device.lastSeen)}`}
            >
              <div className="flex items-center gap-3">
                <OSIcon os={device.os} className="w-8 h-8" />
                <div className="flex-1">
                  <div className="font-medium">{device.hostname}</div>
                  <div className="text-sm text-gray-500">
                    {device.tailscaleIP} • {device.os}
                  </div>
                  <div className="text-xs text-gray-400">
                    Last seen: {formatRelativeTime(device.lastSeen)}
                  </div>
                </div>
                <OnlineIndicator online={device.online} />
              </div>
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 3.2 SSHWorkspaceForm Enhancement

```tsx
// Enhanced SSHWorkspaceForm with Tailscale toggle

export function SSHWorkspaceForm({ onSubmit }: SSHWorkspaceFormProps) {
  const [useTailscale, setUseTailscale] = useState(false);
  const [tailscaleDevice, setTailscaleDevice] = useState<TailscaleDevice | null>(null);
  const [manualConfig, setManualConfig] = useState({
    hostname: '',
    port: 22,
    username: '',
    remotePath: '/home',
    authMethod: 'key' as 'key' | 'password',
  });

  const handleTailscaleSelect = (device: TailscaleDevice) => {
    setTailscaleDevice(device);
    // Pre-fill form with Tailscale device info
    setManualConfig(prev => ({
      ...prev,
      hostname: device.hostname,
    }));
  };

  // FIX #26: Validate before submit
  const canSubmit = useMemo(() => {
    if (useTailscale && !tailscaleDevice) {
      return false; // Must select a device when Tailscale enabled
    }
    if (!manualConfig.username.trim()) {
      return false;
    }
    if (!manualConfig.remotePath.trim()) {
      return false;
    }
    if (!useTailscale && !manualConfig.hostname.trim()) {
      return false;
    }
    return true;
  }, [useTailscale, tailscaleDevice, manualConfig]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // FIX #26: Double-check validation
    if (!canSubmit) {
      toast.error('Please fill in all required fields');
      return;
    }

    onSubmit({
      type: 'ssh',
      ...manualConfig,
      tailscale: useTailscale ? {
        enabled: true,
        deviceId: tailscaleDevice!.id, // Safe due to canSubmit check
        useMagicDNS: true,
      } : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Tailscale Toggle */}
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center gap-3">
          <TailscaleIcon className="w-6 h-6" />
          <div>
            <div className="font-medium">Use Tailscale</div>
            <div className="text-sm text-gray-500">
              Connect through your Tailscale network
            </div>
          </div>
        </div>
        <Switch checked={useTailscale} onCheckedChange={setUseTailscale} />
      </div>

      {/* Tailscale Device Picker */}
      {useTailscale && (
        <TailscaleDevicePicker
          onSelect={handleTailscaleSelect}
          selectedDeviceId={tailscaleDevice?.id}
        />
      )}

      {/* Manual Configuration */}
      <div className={cn(useTailscale && "opacity-60")}>
        <h3 className="font-medium mb-4">
          {useTailscale ? 'SSH Configuration' : 'Connection Details'}
        </h3>

        {!useTailscale && (
          <FormField label="Hostname" required>
            <Input
              value={manualConfig.hostname}
              onChange={e => setManualConfig(prev => ({ ...prev, hostname: e.target.value }))}
              placeholder="192.168.1.100 or my-server.com"
            />
          </FormField>
        )}

        <FormField label="Username" required>
          <Input
            value={manualConfig.username}
            onChange={e => setManualConfig(prev => ({ ...prev, username: e.target.value }))}
            placeholder="pi"
          />
        </FormField>

        <FormField label="Remote Path" required>
          <Input
            value={manualConfig.remotePath}
            onChange={e => setManualConfig(prev => ({ ...prev, remotePath: e.target.value }))}
            placeholder="/home/pi/projects"
          />
        </FormField>

        {/* Auth method selector */}
        <AuthMethodSelector
          value={manualConfig.authMethod}
          onChange={method => setManualConfig(prev => ({ ...prev, authMethod: method }))}
        />
      </div>

      {/* Tailscale device selection warning (FIX #26) */}
      {useTailscale && !tailscaleDevice && (
        <div className="text-sm text-amber-600 dark:text-amber-400">
          Please select a Tailscale device above
        </div>
      )}

      {/* Test Connection */}
      <TestConnectionButton config={manualConfig} tailscale={useTailscale ? tailscaleDevice : null} />

      <Button
        type="submit"
        className="w-full"
        disabled={!canSubmit}
        aria-disabled={!canSubmit}
      >
        Add Workspace
      </Button>
    </form>
  );
}
```

## 4. API Routes

### 4.0 Rate Limiting (FIX #9, #20)

All Tailscale API routes use rate limiting to prevent DoS via CLI process exhaustion:

```typescript
// src/lib/workspace/tailscale/rate-limiter.ts

interface RateLimitEntry {
  count: number;
  resetTime: number;
  cleanupTimer: NodeJS.Timeout;  // FIX #20: Auto-cleanup
}

const rateLimiters = new Map<string, RateLimitEntry>();

const RATE_LIMIT = {
  maxRequests: 10,      // Max requests per window
  windowMs: 60000,      // 1 minute window
};

export function checkRateLimit(clientId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const limiter = rateLimiters.get(clientId);

  if (!limiter || now > limiter.resetTime) {
    // Clear any existing timer
    if (limiter?.cleanupTimer) {
      clearTimeout(limiter.cleanupTimer);
    }

    // FIX #20: Schedule automatic cleanup to prevent memory leak
    const cleanupTimer = setTimeout(() => {
      rateLimiters.delete(clientId);
    }, RATE_LIMIT.windowMs + 1000); // Cleanup 1s after window expires

    rateLimiters.set(clientId, {
      count: 1,
      resetTime: now + RATE_LIMIT.windowMs,
      cleanupTimer,
    });
    return { allowed: true };
  }

  if (limiter.count >= RATE_LIMIT.maxRequests) {
    return {
      allowed: false,
      retryAfter: Math.ceil((limiter.resetTime - now) / 1000)
    };
  }

  limiter.count++;
  return { allowed: true };
}

// Cleanup function for graceful shutdown
export function clearRateLimiters(): void {
  for (const entry of rateLimiters.values()) {
    clearTimeout(entry.cleanupTimer);
  }
  rateLimiters.clear();
}

// Middleware wrapper
export function withRateLimit(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const clientId = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    const { allowed, retryAfter } = checkRateLimit(clientId);

    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfter) }
        }
      );
    }

    return handler(request);
  };
}
```

### 4.1 Tailscale Status Endpoint

```typescript
// src/app/api/workspace/tailscale/status/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getTailscaleManager } from '@/lib/workspace/tailscale/TailscaleManager';
import { withRateLimit } from '@/lib/workspace/tailscale/rate-limiter';

async function handler(request: NextRequest) {
  try {
    const manager = getTailscaleManager();
    const status = await manager.getStatus();

    // Add cache headers to reduce client polling
    return NextResponse.json(status, {
      headers: {
        'Cache-Control': 'private, max-age=10', // Client can cache for 10s
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get Tailscale status', details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(handler);
```

### 4.2 Tailscale Ping Endpoint

```typescript
// src/app/api/workspace/tailscale/ping/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getTailscaleManager } from '@/lib/workspace/tailscale/TailscaleManager';
import { withRateLimit } from '@/lib/workspace/tailscale/rate-limiter';

async function handler(request: NextRequest) {
  try {
    const { deviceId } = await request.json();

    if (!deviceId || typeof deviceId !== 'string') {
      return NextResponse.json(
        { error: 'deviceId is required' },
        { status: 400 }
      );
    }

    const manager = getTailscaleManager();
    // Use deviceId for unambiguous lookup (FIX #3)
    const device = await manager.getDeviceById(deviceId);

    if (!device) {
      return NextResponse.json(
        { error: 'Device not found' },
        { status: 404 }
      );
    }

    const result = await manager.ping(device);

    return NextResponse.json({
      deviceId: device.id,
      hostname: device.hostname,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Ping failed', details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(handler);
```

## 5. Security Considerations

### 5.1 Defense in Depth

| Layer | Protection |
|-------|------------|
| **Tailscale** | WireGuard encryption (ChaCha20-Poly1305), key exchange via Tailscale control plane |
| **SSH** | Standard SSH encryption (AES-256-GCM), host key verification, auth (key/password) |
| **Application** | Path validation, command sanitization, credential storage, **IP validation** |

### 5.2 Trust Model

```
┌─────────────────────────────────────────────────────────────┐
│ Tailscale Auth (OAuth/SSO)                                  │
│ ├── User authenticates once to Tailscale                    │
│ ├── Devices are enrolled via tailscale login                │
│ └── ACLs control which devices can reach each other         │
├─────────────────────────────────────────────────────────────┤
│ SSH Auth (per-connection)                                   │
│ ├── SSH keys for passwordless auth (recommended)            │
│ ├── Password fallback (stored in credential manager)        │
│ └── Host key verification (TOFU or strict)                  │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Threat Mitigations

| Threat | Tailscale Mitigation | SSH Mitigation | App Mitigation |
|--------|---------------------|----------------|----------------|
| Eavesdropping | WireGuard encryption | SSH encryption | - |
| MITM | Tailscale key verification | SSH host key | - |
| Unauthorized access | Tailscale ACLs | SSH auth | - |
| Replay attacks | WireGuard nonces | SSH nonces | - |
| IP spoofing | Tailscale identity | - | - |
| **Command injection** | - | - | **IP validation before shell exec** |
| **Hostname collision** | - | - | **Use deviceId not hostname** |

### 5.4 CLI Execution Safety (CRITICAL FIX #1)

**All Tailscale CLI commands validate inputs before shell execution:**

```typescript
// BEFORE: Vulnerable to command injection
await execAsync(`tailscale ping --c 1 ${device.tailscaleIP}`);

// AFTER: IP validated against known Tailscale ranges
if (!validateTailscaleIP(device.tailscaleIP)) {
  throw new Error('Invalid Tailscale IP');
}
await execAsync(`tailscale ping --c 1 ${device.tailscaleIP}`);
```

**IP Validation Rules:**
- IPv4: Must match `100.x.x.x` (Tailscale CGNAT range)
- IPv6: Must match `fd7a:115c:a1e0::/48` (Tailscale ULA range)
- No shell metacharacters allowed

The existing `CommandValidator` applies to user commands executed on remote systems:

```typescript
// User commands are validated before execution
await commandValidator.validate(command);

// Dangerous commands blocked
// - rm -rf /
// - chmod 777
// - curl ... | bash
// etc.
```

### 5.5 DERP Relay Privacy (FIX #4)

**Important:** When direct P2P connection fails, Tailscale routes traffic through DERP relay servers.

| Connection Type | Privacy | Performance |
|-----------------|---------|-------------|
| **Direct (P2P)** | Traffic never leaves user's control | Low latency (<10ms typical) |
| **Relayed (DERP)** | Encrypted traffic passes through Tailscale servers | Higher latency (50-200ms) |

**Privacy Implications of DERP:**
- Traffic is E2E encrypted - Tailscale cannot read content
- Metadata visible: source/destination IPs, packet timing, sizes
- May violate data residency requirements (GDPR, HIPAA, SOC2)
- Corporate security policies may prohibit

**Mitigation - `requireDirect` option:**

```typescript
tailscale: {
  enabled: true,
  deviceId: 'abc123',
  requireDirect: true,  // FAIL if would use relay
}
```

When enabled:
1. Ping device before connecting
2. Check if connection is via DERP relay
3. If relay: throw `TailscaleRelayNotAllowedError` with clear message
4. User must fix network or disable requirement

**UI Indicator:** Show connection type badge (🟢 Direct | 🟡 Relayed)

### 5.6 Tailscale SSH vs Regular SSH (FIX #10)

**IMPORTANT: This design uses Regular SSH over Tailscale network, NOT Tailscale SSH.**

| Feature | Regular SSH (this design) | Tailscale SSH |
|---------|--------------------------|---------------|
| Auth method | SSH keys or passwords | Tailscale ACLs |
| Key management | User manages SSH keys | No keys needed |
| sshd required | Yes, on target | No |
| Port | 22 (default) | N/A |
| Audit logging | Standard SSH logs | Tailscale admin console |

**Why Regular SSH:**
1. Works with existing SSH infrastructure
2. No Tailscale SSH setup required on target
3. Familiar to users
4. Host key verification provides additional security layer

**Future Enhancement:** Add Tailscale SSH mode as option for users who prefer it.

## 6. Error Handling

### 6.1 Tailscale-Specific Errors (Complete List)

```typescript
// src/lib/workspace/tailscale/errors.ts

import { WorkspaceError } from '../errors';

/**
 * Tailscale CLI not found on system
 */
export class TailscaleNotInstalledError extends WorkspaceError {
  constructor() {
    super('Tailscale is not installed', {
      code: 'TAILSCALE_NOT_INSTALLED',
      recoverable: true,
      suggestion: 'Install Tailscale from https://tailscale.com/download',
    });
  }
}

/**
 * Tailscale CLI found but version too old
 */
export class TailscaleVersionError extends WorkspaceError {
  constructor(current: string, minimum: string) {
    super(`Tailscale version ${current} is below minimum ${minimum}`, {
      code: 'TAILSCALE_VERSION_ERROR',
      recoverable: true,
      suggestion: 'Update Tailscale: https://tailscale.com/download',
    });
  }
}

/**
 * User not authenticated to Tailscale
 */
export class TailscaleNotLoggedInError extends WorkspaceError {
  constructor() {
    super('Not logged in to Tailscale', {
      code: 'TAILSCALE_NOT_LOGGED_IN',
      recoverable: true,
      suggestion: 'Run "tailscale login" in terminal to authenticate',
    });
  }
}

/**
 * Tailscale daemon not running or not connected
 */
export class TailscaleNotConnectedError extends WorkspaceError {
  constructor() {
    super('Tailscale is not connected to the network', {
      code: 'TAILSCALE_NOT_CONNECTED',
      recoverable: true,
      suggestion: 'Run "tailscale up" or check Tailscale app is running',
    });
  }
}

/**
 * Device ID not found in device list
 */
export class TailscaleDeviceNotFoundError extends WorkspaceError {
  constructor(deviceId: string) {
    super(`Tailscale device not found: ${deviceId}`, {
      code: 'TAILSCALE_DEVICE_NOT_FOUND',
      recoverable: false,
      suggestion: 'The device may have been removed from your Tailnet. Check Tailscale admin console.',
    });
  }
}

/**
 * Device exists but is currently offline
 */
export class TailscaleDeviceOfflineError extends WorkspaceError {
  constructor(hostname: string) {
    super(`Tailscale device "${hostname}" is offline`, {
      code: 'TAILSCALE_DEVICE_OFFLINE',
      recoverable: true,
      suggestion: 'Ensure the target device is powered on and connected to the internet',
    });
  }
}

/**
 * Connection would use DERP relay but requireDirect is enabled
 */
export class TailscaleRelayNotAllowedError extends WorkspaceError {
  constructor(hostname: string, options?: { suggestion?: string }) {
    super(`Direct connection to "${hostname}" not available - would use relay`, {
      code: 'TAILSCALE_RELAY_NOT_ALLOWED',
      recoverable: true,
      suggestion: options?.suggestion ||
        'Direct P2P connection failed. Check firewall settings or disable "requireDirect" to allow relay connections.',
    });
  }
}

/**
 * CLI command timed out
 */
export class TailscaleTimeoutError extends WorkspaceError {
  constructor(command: string, timeoutMs: number) {
    super(`Tailscale command timed out after ${timeoutMs}ms`, {
      code: 'TAILSCALE_TIMEOUT',
      recoverable: true,
      suggestion: 'Tailscale daemon may be unresponsive. Try restarting Tailscale.',
    });
  }
}

/**
 * Permission denied running Tailscale CLI
 */
export class TailscalePermissionError extends WorkspaceError {
  constructor() {
    super('Permission denied running Tailscale CLI', {
      code: 'TAILSCALE_PERMISSION_DENIED',
      recoverable: true,
      suggestion: 'On Linux, add your user to the "tailscale" group: sudo usermod -aG tailscale $USER',
    });
  }
}

/**
 * Multiple devices match hostname - ambiguous selection
 */
export class TailscaleHostnameCollisionError extends WorkspaceError {
  constructor(hostname: string, matchingDevices: Array<{ id: string; hostname: string }>) {
    super(`Multiple devices match hostname "${hostname}"`, {
      code: 'TAILSCALE_HOSTNAME_COLLISION',
      recoverable: true,
      suggestion: 'Select a specific device from the list to avoid ambiguity.',
      context: { matchingDevices },
    });
  }
}

/**
 * SSH server not running on target device
 */
export class SSHNotAvailableError extends WorkspaceError {
  constructor(hostname: string, port: number) {
    super(`SSH server not available on ${hostname}:${port}`, {
      code: 'SSH_NOT_AVAILABLE',
      recoverable: true,
      suggestion: `Ensure SSH server is running on the target device (port ${port})`,
    });
  }
}
```

### 6.2 Error Recovery Matrix

| Error | Auto-Recoverable | User Action | Fallback |
|-------|------------------|-------------|----------|
| `TailscaleNotInstalledError` | No | Install Tailscale | Use manual SSH |
| `TailscaleVersionError` | No | Update Tailscale | Use manual SSH |
| `TailscaleNotLoggedInError` | No | Run `tailscale login` | Use manual SSH |
| `TailscaleNotConnectedError` | Yes (retry) | Check Tailscale app | Use manual SSH |
| `TailscaleDeviceNotFoundError` | No | Check admin console | Use manual SSH |
| `TailscaleDeviceOfflineError` | Yes (poll) | Power on device | None |
| `TailscaleRelayNotAllowedError` | No | Fix network or disable | Allow relay |
| `TailscaleTimeoutError` | Yes (retry 3x) | Restart Tailscale | Use manual SSH |
| `TailscalePermissionError` | No | Add to group | Use sudo |
| `TailscaleHostnameCollisionError` | No | Select specific device | Use deviceId |
| `SSHNotAvailableError` | Yes (retry) | Start SSH on target | None |

### 6.3 Graceful Fallback Strategy

```typescript
// If Tailscale fails, behavior depends on error type
async connect(): Promise<void> {
  if (this.config.tailscale?.enabled) {
    try {
      await this.connectViaTailscale();
      return;
    } catch (error) {
      // Non-recoverable Tailscale errors - no fallback possible
      if (
        error instanceof TailscaleDeviceOfflineError ||
        error instanceof TailscaleDeviceNotFoundError ||
        error instanceof TailscaleRelayNotAllowedError
      ) {
        throw error;
      }

      // Infrastructure errors - fallback to direct if hostname is valid IP/DNS
      if (
        error instanceof TailscaleNotInstalledError ||
        error instanceof TailscaleNotLoggedInError ||
        error instanceof TailscaleNotConnectedError ||
        error instanceof TailscaleTimeoutError
      ) {
        // Only fallback if original hostname looks like direct address
        if (this.isDirectAddress(this.hostname)) {
          this.log('warn', 'Tailscale unavailable, falling back to direct SSH', {
            error: error.message,
            hostname: this.hostname,
          });
          await this.connectDirect();
          return;
        }
      }

      // Unknown error or can't fallback
      throw error;
    }
  }

  await this.connectDirect();
}

private isDirectAddress(hostname: string): boolean {
  // IPv4 address
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return true;
  }
  // Has domain suffix (not just hostname)
  if (hostname.includes('.')) {
    return true;
  }
  return false;
}
```

## 7. Files to Create

```
src/lib/workspace/tailscale/
├── TailscaleManager.ts          # Core manager (350 lines)
├── types.ts                      # Type definitions (80 lines)
├── errors.ts                     # Error classes (50 lines)
└── index.ts                      # Barrel export (10 lines)

src/app/api/workspace/tailscale/
├── status/route.ts               # GET status (30 lines)
├── devices/route.ts              # GET devices (40 lines)
├── ping/route.ts                 # POST ping (50 lines)
└── refresh/route.ts              # POST refresh (30 lines)

src/components/workspace/
├── TailscaleDevicePicker.tsx     # Device selection (200 lines)
├── TailscaleStatusBadge.tsx      # Status indicator (50 lines)
├── TailscaleInstallPrompt.tsx    # Install CTA (40 lines)
└── TailscaleLoginPrompt.tsx      # Login CTA (40 lines)
```

## 8. Files to Modify

| File | Changes |
|------|---------|
| `src/lib/workspace/types.ts` | Add `TailscaleConfig` to `SSHProviderConfig` |
| `src/lib/workspace/providers/SSHProvider.ts` | Add Tailscale hostname resolution |
| `src/lib/workspace/errors.ts` | Add Tailscale error classes |
| `src/components/workspace/SSHWorkspaceForm.tsx` | Add Tailscale toggle + picker |
| `src/components/workspace/AddWorkspaceDialog.tsx` | Import TailscaleDevicePicker |

## 9. Implementation Phases (Revised Estimate)

> **Note:** Original estimate was 7-10 days. Adversarial review identified additional work:
> timeouts, validation, error handling, accessibility, cross-platform testing.
> Revised to 13-18 days to account for production-quality implementation.

### Phase 1: Core Infrastructure (3-4 days)
- [ ] TailscaleManager with timeout handling
- [ ] IP validation (100.x.x.x, fd7a::/48)
- [ ] Hostname sanitization
- [ ] Type definitions with proper null handling
- [ ] Complete error class hierarchy (12 error types)
- [ ] Version compatibility check
- [ ] Rate limiter
- [ ] Unit tests (target: 90% coverage)

**Exit Criteria:** All unit tests pass, `npm run build` succeeds

### Phase 2: API Routes (1-2 days)
- [ ] Status endpoint with caching headers
- [ ] Devices endpoint
- [ ] Ping endpoint with deviceId (not hostname)
- [ ] Rate limiting middleware
- [ ] Error response formatting
- [ ] Integration tests

**Exit Criteria:** API returns correct responses for all error scenarios

### Phase 3: SSHProvider Integration (2-3 days)
- [ ] Config extension with deviceId (not hostname)
- [ ] Hostname resolution with Magic DNS fallback
- [ ] requireDirect enforcement
- [ ] SSH health check before connection
- [ ] Graceful fallback logic
- [ ] E2E tests with mocked Tailscale

**Exit Criteria:** SSH connection works via Tailscale in happy path and all error paths handled

### Phase 4: UI Components (3-4 days)
- [ ] TailscaleDevicePicker with SWR caching
- [ ] Device disambiguation for hostname collisions
- [ ] SSHWorkspaceForm with Tailscale toggle
- [ ] Connection type badge (Direct/Relay)
- [ ] Status indicators and loading states
- [ ] Error messages with actionable suggestions
- [ ] Accessibility (ARIA labels, keyboard nav)
- [ ] OS icons component

**Exit Criteria:** Full user flow works, accessibility audit passes

### Phase 5: Testing & Cross-Platform (2-3 days)
- [ ] Linux headless testing (Docker)
- [ ] macOS testing (app vs brew CLI)
- [ ] Windows testing (if available)
- [ ] Permission error scenarios
- [ ] Timeout/hung daemon scenarios
- [ ] DERP relay detection testing

**Exit Criteria:** Works on all target platforms

### Phase 6: Documentation & Polish (2 days)
- [ ] User documentation (setup guide)
- [ ] Platform-specific instructions
- [ ] Troubleshooting guide
- [ ] Error message review
- [ ] Code comments for complex sections

**Exit Criteria:** New developer can set up Tailscale SSH following docs

**Total Estimate: 13-18 days**

### Risk Factors

| Risk | Impact | Mitigation |
|------|--------|------------|
| Docker Tailscale complexity | +2-3 days | Document clearly, provide compose file |
| Cross-platform CLI differences | +1-2 days | Abstract CLI path detection |
| DERP detection edge cases | +1 day | Comprehensive ping testing |
| Magic DNS failures | Low | Automatic fallback to IP |

## 10. Dependencies

### New NPM Packages

None required - uses child_process to execute `tailscale` CLI.

### System Requirements (FIX #5 - Platform-Specific Documentation)

#### Client Machine (where this app runs)

| Platform | Requirements | Notes |
|----------|--------------|-------|
| **macOS** | Tailscale app installed | CLI available at `/Applications/Tailscale.app/Contents/MacOS/Tailscale` or via `brew install tailscale` |
| **Windows** | Tailscale app installed | CLI at `C:\Program Files\Tailscale\tailscale.exe`, add to PATH |
| **Linux (Desktop)** | `tailscale` package | Works out of box with NetworkManager |
| **Linux (Headless)** | `tailscaled` + `tailscale` | Requires: `systemctl enable --now tailscaled` |
| **Docker** | Host Tailscale + network mode | Container must use `--network=host` or Tailscale sidecar |

#### Linux Permission Requirements

On Linux, the Tailscale CLI connects to `tailscaled` daemon via socket. Access requires one of:

```bash
# Option 1: Add user to tailscale group (recommended)
sudo usermod -aG tailscale $USER
# Log out and back in

# Option 2: Run as root (not recommended)
sudo tailscale status

# Option 3: Set socket permissions (security implications)
sudo chmod 666 /var/run/tailscale/tailscaled.sock
```

**Detection:** If `tailscale status` fails with permission error, show `TailscalePermissionError` with platform-specific instructions.

#### Docker Considerations

Running this app in Docker with Tailscale requires special setup:

```yaml
# Option 1: Host network mode (simplest)
services:
  app:
    network_mode: host
    # Tailscale runs on host, CLI accessible in container

# Option 2: Tailscale sidecar container
services:
  tailscale:
    image: tailscale/tailscale:latest
    cap_add:
      - NET_ADMIN
    volumes:
      - /dev/net/tun:/dev/net/tun
      - tailscale-state:/var/lib/tailscale
    environment:
      - TS_AUTHKEY=${TS_AUTHKEY}

  app:
    network_mode: service:tailscale
```

#### Target Machine (SSH destination)

- Tailscale installed and connected to same Tailnet
- SSH server (`sshd`) running on desired port (default: 22)
- Firewall allows SSH (Tailscale handles this automatically for Tailscale IPs)

### Minimum Tailscale Version

- **Required:** 1.8.0+ (added `--json` flag to status command)
- **Recommended:** 1.50.0+ (latest stability improvements)

Detection is automatic - version checked before first use.

### Magic DNS Requirements (FIX #6)

**Magic DNS is OPTIONAL** - the default uses Tailscale IP (`100.x.x.x`) which works everywhere.

If user enables `useMagicDNS: true`, additional requirements apply:

| Platform | Magic DNS Setup | Auto-configured? |
|----------|-----------------|------------------|
| **macOS** | System resolver | Yes (Tailscale app) |
| **Windows** | System resolver | Yes (Tailscale app) |
| **Linux (NetworkManager)** | Split DNS | Yes (if supported) |
| **Linux (systemd-resolved)** | Requires config | Partial |
| **Linux (manual resolv.conf)** | Not supported | No |
| **Docker** | Requires host DNS | No |

**Fallback behavior:** If Magic DNS resolution fails, automatically fall back to Tailscale IP.

```typescript
async resolveHost(): Promise<string> {
  if (this.config.tailscale?.useMagicDNS) {
    try {
      // Try Magic DNS first
      const resolved = await dns.resolve(device.dnsName);
      return device.dnsName;
    } catch {
      log.warn('Magic DNS failed, falling back to Tailscale IP', {
        dnsName: device.dnsName,
        fallback: device.tailscaleIP,
      });
      return device.tailscaleIP;
    }
  }
  return device.tailscaleIP;
}
```

## 11. Testing Strategy

### 11.1 Unit Tests

```typescript
describe('TailscaleManager', () => {
  it('should detect when Tailscale is not installed');
  it('should parse tailscale status JSON correctly');
  it('should cache status for 30 seconds');
  it('should emit events on status change');
  it('should handle logged-out state');
  it('should filter self device from list');
});
```

### 11.2 Integration Tests

```typescript
describe('SSHProvider with Tailscale', () => {
  it('should resolve hostname via Tailscale when enabled');
  it('should fall back to direct when Tailscale fails');
  it('should use Magic DNS when configured');
  it('should report Tailscale device offline error');
});
```

### 11.3 E2E Tests

```typescript
describe('SSH Workspace with Tailscale', () => {
  it('should show device picker when Tailscale toggle is on');
  it('should pre-fill hostname from selected device');
  it('should successfully connect to Tailscale device');
  it('should show offline devices as disabled');
});
```

## Appendix A: Tailscale CLI Reference

| Command | Purpose |
|---------|---------|
| `tailscale version` | Check if installed |
| `tailscale status --json` | Get full network status |
| `tailscale ping <ip>` | Test connectivity |
| `tailscale ip <hostname>` | Resolve Magic DNS |
| `tailscale up` | Connect to network |
| `tailscale down` | Disconnect |

## Appendix B: Decision Log

| Decision | Rationale |
|----------|-----------|
| CLI over API | No extra dependencies, works in Docker, same interface everywhere |
| Tailscale IP over Magic DNS default | More reliable, Magic DNS requires resolver config |
| Cache status 30s | Balance freshness vs CLI overhead |
| Graceful fallback | Better UX than hard failure |
| Dual encryption (WireGuard + SSH) | Defense in depth, some networks inspect traffic |
| **deviceId over hostname** | Hostnames can collide - deviceId is unique (FIX #3) |
| **5s CLI timeout** | Prevent hung daemon from blocking UI (FIX #2) |
| **IP validation required** | Prevent command injection via malicious peer data (FIX #1) |
| **requireDirect option** | Corporate/regulated environments need direct-only (FIX #4) |
| **Rate limiting** | Prevent DoS via CLI process exhaustion (FIX #9) |

## Appendix C: Ralph Loop Review Fixes

### Iteration 1 (Original 12 Issues)

| Issue # | Severity | Description | Fix Applied |
|---------|----------|-------------|-------------|
| **#1** | CRITICAL | Command injection via Tailscale IP | Added `validateTailscaleIP()` before shell exec |
| **#2** | CRITICAL | No timeout on CLI execution | Added 5s timeout to all `execAsync` calls |
| **#3** | CRITICAL | Hostname collision vulnerability | Changed to deviceId lookup, added disambiguation UI |
| **#4** | CRITICAL | DERP relay privacy exposure | Added `requireDirect` option, documented implications |
| **#5** | CRITICAL | CLI requires root/admin | Documented per-platform requirements, added detection |
| **#6** | MEDIUM | Magic DNS resolver requirements | Documented, added automatic fallback to IP |
| **#7** | MEDIUM | No backpressure on polling | Added `isRefreshing` guard |
| **#8** | MEDIUM | `selfDevice: null as any` type unsafety | Fixed with union type |
| **#9** | MEDIUM | No rate limiting on API | Added rate limiter middleware (10 req/min) |
| **#10** | MEDIUM | Tailscale SSH vs Regular SSH confusion | Documented distinction |
| **#11** | MEDIUM | No health check for target SSH server | Added `testSSHConnection()` function |
| **#12** | MEDIUM | Version compatibility | Added `checkVersion()` with minimum 1.8.0 |

### Iteration 2 (New Issues Found After Fixes)

| Issue # | Severity | Description | Fix Applied |
|---------|----------|-------------|-------------|
| **#19** | CRITICAL | JSON parsing without per-peer try-catch | Added try-catch in peer loop with skip and log |
| **#20** | CRITICAL | Rate limiter memory leak | Added TTL-based cleanup with setTimeout |
| **#21** | MEDIUM | Singleton manager without cleanup | Documented lifecycle, added `stopPolling()` call |
| **#22** | MEDIUM | No AbortController support | Noted for future enhancement |
| **#23** | MEDIUM | dnsName sanitization missing | Added validation pattern for dnsName |
| **#24** | MEDIUM | Status caching inconsistent on errors | Documented, error states not cached |
| **#25** | MEDIUM | No concurrent request deduplication | Added `pendingStatusRequest` promise sharing |
| **#26** | MEDIUM | Form allows null deviceId | Added `canSubmit` validation, disabled button |

### Low Priority (Tracked for Future)

| Issue # | Description | Status |
|---------|-------------|--------|
| **#13-14** | UI caching, OS icons | Deferred to implementation |
| **#15** | Account switching | Out of scope for MVP |
| **#16-17** | SSH verification, exit nodes | Addressed via `testSSHConnection()` |
| **#18** | Accessibility | Added ARIA labels, roles |
| **#27** | Reconnection strategy | Future enhancement |
| **#28** | Typed events | Future enhancement |
| **#29** | OS icon mapping | Implementation phase |

## Appendix D: Future Enhancements

1. **Tailscale SSH Mode** - Skip SSH keys entirely, use Tailscale ACLs
2. **File Sharing via Taildrop** - Alternative to SFTP for quick file transfers
3. **Exit Nodes** - Route through specific devices for geo-access
4. **Funnel** - Expose workspace to internet (controlled sharing)
5. **Account Switching** - Support multiple Tailnets
6. **Subnet Router Discovery** - Show devices behind subnet routers
