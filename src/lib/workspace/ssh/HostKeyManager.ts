/**
 * HostKeyManager
 * Manages SSH host key verification with multiple modes
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { createHash } from 'crypto';

export type HostKeyVerificationMode = 'strict' | 'tofu' | 'ask';

interface StoredHostKey {
  hostname: string;
  port: number;
  keyType: string;
  fingerprint: string;
  key: string;
  firstSeen: number;
  lastSeen: number;
}

const KNOWN_HOSTS_FILE = process.env.SSH_KNOWN_HOSTS
  ?? join(homedir(), '.claude-ssh-hosts.json');

export class HostKeyManager {
  private knownHosts: Map<string, StoredHostKey> = new Map();
  private mode: HostKeyVerificationMode;
  private initialized = false;

  constructor(mode: HostKeyVerificationMode = 'tofu') {
    this.mode = mode;
  }

  /**
   * Initialize by loading known hosts
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const data = await fs.readFile(KNOWN_HOSTS_FILE, 'utf-8');
      const hosts: StoredHostKey[] = JSON.parse(data);

      for (const host of hosts) {
        const key = this.getHostKey(host.hostname, host.port);
        this.knownHosts.set(key, host);
      }

      this.initialized = true;
    } catch (error) {
      // File doesn't exist yet - that's ok
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.warn('Failed to load known hosts:', error);
      }
      this.initialized = true;
    }
  }

  /**
   * Verify a host key
   */
  async verifyHostKey(
    hostname: string,
    port: number,
    keyType: string,
    key: Buffer,
    askCallback?: (fingerprint: string) => Promise<boolean>
  ): Promise<boolean> {
    await this.initialize();

    const fingerprint = this.getFingerprint(key);
    const hostKey = this.getHostKey(hostname, port);
    const stored = this.knownHosts.get(hostKey);

    // Mode: strict - only accept known hosts
    if (this.mode === 'strict') {
      if (!stored) {
        throw new Error(
          `Host key verification failed: ${hostname}:${port} is not in known_hosts (strict mode)`
        );
      }

      if (stored.fingerprint !== fingerprint) {
        throw new Error(
          `Host key verification failed: ${hostname}:${port} fingerprint mismatch!\n` +
          `Expected: ${stored.fingerprint}\n` +
          `Got: ${fingerprint}\n` +
          `WARNING: This could indicate a man-in-the-middle attack!`
        );
      }

      // Update last seen
      stored.lastSeen = Date.now();
      await this.save();

      return true;
    }

    // Mode: TOFU (Trust On First Use)
    if (this.mode === 'tofu') {
      if (!stored) {
        // First time seeing this host - trust it
        const newHost: StoredHostKey = {
          hostname,
          port,
          keyType,
          fingerprint,
          key: key.toString('base64'),
          firstSeen: Date.now(),
          lastSeen: Date.now(),
        };

        this.knownHosts.set(hostKey, newHost);
        await this.save();

        return true;
      }

      // Already known - verify fingerprint
      if (stored.fingerprint !== fingerprint) {
        throw new Error(
          `Host key verification failed: ${hostname}:${port} fingerprint changed!\n` +
          `Expected: ${stored.fingerprint}\n` +
          `Got: ${fingerprint}\n` +
          `WARNING: This could indicate a man-in-the-middle attack!`
        );
      }

      // Update last seen
      stored.lastSeen = Date.now();
      await this.save();

      return true;
    }

    // Mode: ask - always ask user
    if (this.mode === 'ask') {
      if (!askCallback) {
        throw new Error('Ask mode requires askCallback to be provided');
      }

      let message = `Host: ${hostname}:${port}\n` +
                    `Key type: ${keyType}\n` +
                    `Fingerprint: ${fingerprint}`;

      if (stored) {
        if (stored.fingerprint !== fingerprint) {
          message += `\n\nWARNING: Host key has changed!\n` +
                    `Previous: ${stored.fingerprint}\n` +
                    `This could indicate a man-in-the-middle attack!`;
        } else {
          message += `\n\nHost is already known (last seen: ${new Date(stored.lastSeen).toLocaleString()})`;
        }
      } else {
        message += `\n\nThis is the first time connecting to this host.`;
      }

      const accepted = await askCallback(message);

      if (accepted) {
        const newHost: StoredHostKey = {
          hostname,
          port,
          keyType,
          fingerprint,
          key: key.toString('base64'),
          firstSeen: stored?.firstSeen ?? Date.now(),
          lastSeen: Date.now(),
        };

        this.knownHosts.set(hostKey, newHost);
        await this.save();

        return true;
      }

      throw new Error(`Host key rejected by user: ${hostname}:${port}`);
    }

    return false;
  }

  /**
   * Get fingerprint for a key
   */
  private getFingerprint(key: Buffer): string {
    const hash = createHash('sha256');
    hash.update(key);
    return `SHA256:${hash.digest('base64').replace(/=+$/, '')}`;
  }

  /**
   * Get host key string
   */
  private getHostKey(hostname: string, port: number): string {
    return `${hostname}:${port}`;
  }

  /**
   * Save known hosts to file
   */
  private async save(): Promise<void> {
    const hosts = Array.from(this.knownHosts.values());
    const data = JSON.stringify(hosts, null, 2);

    try {
      await fs.writeFile(KNOWN_HOSTS_FILE, data, 'utf-8');
    } catch (error) {
      console.error('Failed to save known hosts:', error);
      throw error;
    }
  }

  /**
   * Remove a host from known hosts
   */
  async removeHost(hostname: string, port: number): Promise<void> {
    await this.initialize();

    const hostKey = this.getHostKey(hostname, port);
    this.knownHosts.delete(hostKey);

    await this.save();
  }

  /**
   * Get all known hosts
   */
  async getKnownHosts(): Promise<StoredHostKey[]> {
    await this.initialize();
    return Array.from(this.knownHosts.values());
  }

  /**
   * Set verification mode
   */
  setMode(mode: HostKeyVerificationMode): void {
    this.mode = mode;
  }

  /**
   * Get current verification mode
   */
  getMode(): HostKeyVerificationMode {
    return this.mode;
  }
}
