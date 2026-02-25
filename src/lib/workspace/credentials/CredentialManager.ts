/**
 * CredentialManager
 * Unified credential access with keychain fallback to encrypted file
 */

import { KeychainStore } from './KeychainStore';
import { EncryptedFileStore } from './EncryptedFileStore';
import type { CredentialStore } from './CredentialStore';

export class CredentialManager {
  private primaryStore: CredentialStore;
  private fallbackStore: CredentialStore;
  private useKeychain = true;

  constructor(masterPassword?: string) {
    this.primaryStore = new KeychainStore();
    this.fallbackStore = new EncryptedFileStore();

    if (masterPassword) {
      (this.fallbackStore as EncryptedFileStore).setMasterPassword(masterPassword);
    }
  }

  /**
   * Initialize and determine which store to use
   */
  async initialize(): Promise<void> {
    this.useKeychain = await this.primaryStore.isAvailable();

    if (!this.useKeychain) {
      console.log('Keychain not available, using encrypted file storage');
    }
  }

  /**
   * Store a credential (with host:port in key)
   */
  async setSSHCredential(
    hostname: string,
    port: number,
    username: string,
    password?: string,
    privateKey?: string
  ): Promise<void> {
    await this.initialize();

    const service = `claude-workspace-ssh`;
    const account = `${username}@${hostname}:${port}`;

    const store = this.useKeychain ? this.primaryStore : this.fallbackStore;

    if (password) {
      await store.setCredential(service, `${account}:password`, password);
    }

    if (privateKey) {
      await store.setCredential(service, `${account}:privateKey`, privateKey);
    }
  }

  /**
   * Retrieve SSH credentials
   */
  async getSSHCredential(
    hostname: string,
    port: number,
    username: string
  ): Promise<{ password?: string; privateKey?: string }> {
    await this.initialize();

    const service = `claude-workspace-ssh`;
    const account = `${username}@${hostname}:${port}`;

    const store = this.useKeychain ? this.primaryStore : this.fallbackStore;

    const password = await store.getCredential(service, `${account}:password`);
    const privateKey = await store.getCredential(service, `${account}:privateKey`);

    return {
      password: password ?? undefined,
      privateKey: privateKey ?? undefined,
    };
  }

  /**
   * Delete SSH credentials
   */
  async deleteSSHCredential(hostname: string, port: number, username: string): Promise<void> {
    await this.initialize();

    const service = `claude-workspace-ssh`;
    const account = `${username}@${hostname}:${port}`;

    const store = this.useKeychain ? this.primaryStore : this.fallbackStore;

    try {
      await store.deleteCredential(service, `${account}:password`);
    } catch {}

    try {
      await store.deleteCredential(service, `${account}:privateKey`);
    } catch {}
  }

  /**
   * Store Git credentials
   */
  async setGitCredential(repoUrl: string, username: string, password: string): Promise<void> {
    await this.initialize();

    const service = `claude-workspace-git`;
    const store = this.useKeychain ? this.primaryStore : this.fallbackStore;

    await store.setCredential(service, `${repoUrl}:${username}`, password);
  }

  /**
   * Retrieve Git credentials
   */
  async getGitCredential(repoUrl: string, username: string): Promise<string | null> {
    await this.initialize();

    const service = `claude-workspace-git`;
    const store = this.useKeychain ? this.primaryStore : this.fallbackStore;

    return await store.getCredential(service, `${repoUrl}:${username}`);
  }
}

// Singleton instance
let instance: CredentialManager | null = null;

export function getCredentialManager(): CredentialManager {
  if (!instance) {
    instance = new CredentialManager();
  }
  return instance;
}

export function setMasterPassword(password: string): void {
  const manager = getCredentialManager();
  ((manager as any).fallbackStore as EncryptedFileStore).setMasterPassword(password);
}
