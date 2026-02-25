/**
 * CredentialStore Interface
 * Abstract interface for credential storage backends
 */

export interface Credential {
  service: string;
  account: string;
  password: string;
}

export interface CredentialStore {
  /**
   * Store a credential
   */
  setCredential(service: string, account: string, password: string): Promise<void>;

  /**
   * Retrieve a credential
   */
  getCredential(service: string, account: string): Promise<string | null>;

  /**
   * Delete a credential
   */
  deleteCredential(service: string, account: string): Promise<void>;

  /**
   * List all credentials for a service
   */
  listCredentials(service: string): Promise<string[]>;

  /**
   * Check if store is available
   */
  isAvailable(): Promise<boolean>;
}
