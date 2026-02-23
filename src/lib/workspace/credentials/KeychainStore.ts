/**
 * KeychainStore
 * Secure credential storage using system keychain (macOS Keychain, Windows Credential Vault, Linux Secret Service)
 */

import type { CredentialStore } from './CredentialStore';

export class KeychainStore implements CredentialStore {
  private keytar: any = null;

  constructor() {
    // Lazy load keytar (native module)
    try {
      this.keytar = require('keytar');
    } catch (error) {
      console.warn('Keytar not available:', error);
    }
  }

  async isAvailable(): Promise<boolean> {
    return this.keytar !== null;
  }

  async setCredential(service: string, account: string, password: string): Promise<void> {
    if (!this.keytar) {
      throw new Error('Keychain not available');
    }

    await this.keytar.setPassword(service, account, password);
  }

  async getCredential(service: string, account: string): Promise<string | null> {
    if (!this.keytar) {
      throw new Error('Keychain not available');
    }

    return await this.keytar.getPassword(service, account);
  }

  async deleteCredential(service: string, account: string): Promise<void> {
    if (!this.keytar) {
      throw new Error('Keychain not available');
    }

    await this.keytar.deletePassword(service, account);
  }

  async listCredentials(service: string): Promise<string[]> {
    if (!this.keytar) {
      throw new Error('Keychain not available');
    }

    const credentials = await this.keytar.findCredentials(service);
    return credentials.map((c: any) => c.account);
  }
}
