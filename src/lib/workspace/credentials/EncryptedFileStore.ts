/**
 * EncryptedFileStore
 * Fallback credential storage using AES-256-GCM encryption
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import type { CredentialStore, Credential } from './CredentialStore';

const CREDENTIALS_FILE = process.env.CLAUDE_CREDENTIALS_FILE
  ?? join(homedir(), '.claude-credentials.enc');

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;

export class EncryptedFileStore implements CredentialStore {
  private masterPassword: string | null = null;
  private credentials: Map<string, Map<string, string>> = new Map();
  private initialized = false;

  /**
   * Set master password (required before use)
   */
  setMasterPassword(password: string): void {
    if (!password || password.length < 8) {
      throw new Error('Master password must be at least 8 characters');
    }
    this.masterPassword = password;
  }

  async isAvailable(): Promise<boolean> {
    return true; // Always available as fallback
  }

  /**
   * Initialize by loading encrypted credentials
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    if (!this.masterPassword) {
      throw new Error('Master password not set');
    }

    try {
      const encrypted = await fs.readFile(CREDENTIALS_FILE);
      const decrypted = this.decrypt(encrypted, this.masterPassword);
      const data: Credential[] = JSON.parse(decrypted);

      for (const cred of data) {
        let serviceMap = this.credentials.get(cred.service);
        if (!serviceMap) {
          serviceMap = new Map();
          this.credentials.set(cred.service, serviceMap);
        }
        serviceMap.set(cred.account, cred.password);
      }

      this.initialized = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist - start fresh
        this.initialized = true;
      } else {
        throw error;
      }
    }
  }

  async setCredential(service: string, account: string, password: string): Promise<void> {
    await this.initialize();

    let serviceMap = this.credentials.get(service);
    if (!serviceMap) {
      serviceMap = new Map();
      this.credentials.set(service, serviceMap);
    }

    serviceMap.set(account, password);
    await this.save();
  }

  async getCredential(service: string, account: string): Promise<string | null> {
    await this.initialize();

    const serviceMap = this.credentials.get(service);
    return serviceMap?.get(account) ?? null;
  }

  async deleteCredential(service: string, account: string): Promise<void> {
    await this.initialize();

    const serviceMap = this.credentials.get(service);
    if (serviceMap) {
      serviceMap.delete(account);
      if (serviceMap.size === 0) {
        this.credentials.delete(service);
      }
      await this.save();
    }
  }

  async listCredentials(service: string): Promise<string[]> {
    await this.initialize();

    const serviceMap = this.credentials.get(service);
    return serviceMap ? Array.from(serviceMap.keys()) : [];
  }

  /**
   * Save credentials to encrypted file
   */
  private async save(): Promise<void> {
    if (!this.masterPassword) {
      throw new Error('Master password not set');
    }

    const data: Credential[] = [];

    for (const [service, accounts] of this.credentials) {
      for (const [account, password] of accounts) {
        data.push({ service, account, password });
      }
    }

    const json = JSON.stringify(data);
    const encrypted = this.encrypt(json, this.masterPassword);

    await fs.writeFile(CREDENTIALS_FILE, encrypted);
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  private encrypt(plaintext: string, password: string): Buffer {
    const salt = randomBytes(SALT_LENGTH);
    const iv = randomBytes(IV_LENGTH);
    const key = scryptSync(password, salt, KEY_LENGTH);

    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    // Format: salt + iv + tag + encrypted
    return Buffer.concat([salt, iv, tag, encrypted]);
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  private decrypt(ciphertext: Buffer, password: string): string {
    const salt = ciphertext.slice(0, SALT_LENGTH);
    const iv = ciphertext.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = ciphertext.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = ciphertext.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    const key = scryptSync(password, salt, KEY_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    return decipher.update(encrypted) + decipher.final('utf8');
  }
}
