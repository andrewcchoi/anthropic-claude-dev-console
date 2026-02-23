/**
 * SSHConnectionPool
 * Manages pooled SSH connections with per-host limits
 */

import { Client as SSHClient } from 'ssh2';
import { EventEmitter } from 'events';

export interface PooledConnection {
  client: SSHClient;
  hostname: string;
  port: number;
  lastUsed: number;
  inUse: boolean;
  reconnectAttempts: number;
}

export interface ConnectionConfig {
  hostname: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: Buffer;
  passphrase?: string;
}

const MAX_CONNECTIONS_PER_HOST = parseInt(process.env.SSH_MAX_CONNECTIONS_PER_HOST ?? '5', 10);
const CONNECTION_IDLE_TIMEOUT = parseInt(process.env.SSH_IDLE_TIMEOUT_MS ?? '300000', 10); // 5 min
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_BASE_DELAY = 1000; // 1 second

export class SSHConnectionPool extends EventEmitter {
  private connections: Map<string, PooledConnection[]> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.startCleanupTimer();
  }

  /**
   * Acquire a connection from the pool (or create new one)
   */
  async acquire(config: ConnectionConfig): Promise<PooledConnection> {
    const hostKey = this.getHostKey(config.hostname, config.port);
    const pool = this.connections.get(hostKey) ?? [];

    // Try to find an idle connection
    const idle = pool.find(conn => !conn.inUse);
    if (idle) {
      idle.inUse = true;
      idle.lastUsed = Date.now();
      return idle;
    }

    // Check if we can create a new connection
    if (pool.length >= MAX_CONNECTIONS_PER_HOST) {
      // Wait for a connection to become available
      return this.waitForAvailableConnection(hostKey, config);
    }

    // Create new connection
    const connection = await this.createConnection(config);
    pool.push(connection);
    this.connections.set(hostKey, pool);

    return connection;
  }

  /**
   * Release a connection back to the pool
   */
  release(connection: PooledConnection): void {
    connection.inUse = false;
    connection.lastUsed = Date.now();
    connection.reconnectAttempts = 0; // Reset on successful use

    this.emit('connection:released', {
      hostname: connection.hostname,
      port: connection.port,
    });
  }

  /**
   * Remove and close a connection
   */
  async remove(connection: PooledConnection): Promise<void> {
    const hostKey = this.getHostKey(connection.hostname, connection.port);
    const pool = this.connections.get(hostKey);

    if (pool) {
      const index = pool.indexOf(connection);
      if (index !== -1) {
        pool.splice(index, 1);
      }

      if (pool.length === 0) {
        this.connections.delete(hostKey);
      }
    }

    connection.client.end();
  }

  /**
   * Create a new SSH connection
   */
  private async createConnection(config: ConnectionConfig): Promise<PooledConnection> {
    return new Promise((resolve, reject) => {
      const client = new SSHClient();

      const connection: PooledConnection = {
        client,
        hostname: config.hostname,
        port: config.port,
        lastUsed: Date.now(),
        inUse: true,
        reconnectAttempts: 0,
      };

      client.on('ready', () => {
        this.emit('connection:created', {
          hostname: config.hostname,
          port: config.port,
        });
        resolve(connection);
      });

      client.on('error', (error) => {
        this.emit('connection:error', {
          hostname: config.hostname,
          port: config.port,
          error,
        });
        reject(error);
      });

      client.on('close', () => {
        this.emit('connection:closed', {
          hostname: config.hostname,
          port: config.port,
        });

        // Auto-reconnect if connection was in use
        if (connection.inUse && connection.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          this.reconnect(connection, config).catch((error) => {
            console.error('Failed to reconnect:', error);
          });
        }
      });

      // Connect
      client.connect({
        host: config.hostname,
        port: config.port,
        username: config.username,
        password: config.password,
        privateKey: config.privateKey,
        passphrase: config.passphrase,
        readyTimeout: 30000,
        keepaliveInterval: 10000,
        keepaliveCountMax: 3,
      });
    });
  }

  /**
   * Reconnect a dropped connection with exponential backoff
   */
  private async reconnect(
    connection: PooledConnection,
    config: ConnectionConfig
  ): Promise<void> {
    connection.reconnectAttempts++;

    const delay = RECONNECT_BASE_DELAY * Math.pow(2, connection.reconnectAttempts - 1);

    this.emit('connection:reconnecting', {
      hostname: config.hostname,
      port: config.port,
      attempt: connection.reconnectAttempts,
      delay,
    });

    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      const newClient = new SSHClient();

      await new Promise<void>((resolve, reject) => {
        newClient.on('ready', () => resolve());
        newClient.on('error', reject);

        newClient.connect({
          host: config.hostname,
          port: config.port,
          username: config.username,
          password: config.password,
          privateKey: config.privateKey,
          passphrase: config.passphrase,
          readyTimeout: 30000,
        });
      });

      // Replace old client with new one
      connection.client.removeAllListeners();
      connection.client.end();
      connection.client = newClient;
      connection.reconnectAttempts = 0;

      this.emit('connection:reconnected', {
        hostname: config.hostname,
        port: config.port,
      });
    } catch (error) {
      this.emit('connection:reconnect-failed', {
        hostname: config.hostname,
        port: config.port,
        attempt: connection.reconnectAttempts,
        error,
      });

      if (connection.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        // Try again
        await this.reconnect(connection, config);
      } else {
        // Give up
        await this.remove(connection);
      }
    }
  }

  /**
   * Wait for a connection to become available
   */
  private async waitForAvailableConnection(
    hostKey: string,
    config: ConnectionConfig
  ): Promise<PooledConnection> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.off('connection:released', listener);
        reject(new Error(`Timeout waiting for available connection to ${config.hostname}:${config.port}`));
      }, 30000); // 30 second timeout

      const listener = (data: { hostname: string; port: number }) => {
        const key = this.getHostKey(data.hostname, data.port);
        if (key === hostKey) {
          clearTimeout(timeout);
          this.off('connection:released', listener);

          const pool = this.connections.get(hostKey);
          const idle = pool?.find(conn => !conn.inUse);

          if (idle) {
            idle.inUse = true;
            idle.lastUsed = Date.now();
            resolve(idle);
          } else {
            // Try again
            this.waitForAvailableConnection(hostKey, config)
              .then(resolve)
              .catch(reject);
          }
        }
      };

      this.on('connection:released', listener);
    });
  }

  /**
   * Clean up idle connections
   */
  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();

      for (const [hostKey, pool] of this.connections.entries()) {
        const toRemove: PooledConnection[] = [];

        for (const conn of pool) {
          if (!conn.inUse && now - conn.lastUsed > CONNECTION_IDLE_TIMEOUT) {
            toRemove.push(conn);
          }
        }

        for (const conn of toRemove) {
          this.remove(conn).catch((error) => {
            console.error('Failed to remove idle connection:', error);
          });
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Close all connections
   */
  async closeAll(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    const promises: Promise<void>[] = [];

    for (const pool of this.connections.values()) {
      for (const conn of pool) {
        promises.push(this.remove(conn));
      }
    }

    await Promise.all(promises);
    this.connections.clear();
  }

  /**
   * Get host key string
   */
  private getHostKey(hostname: string, port: number): string {
    return `${hostname}:${port}`;
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    totalConnections: number;
    hostsConnected: number;
    idleConnections: number;
    activeConnections: number;
  } {
    let total = 0;
    let idle = 0;
    let active = 0;

    for (const pool of this.connections.values()) {
      total += pool.length;
      for (const conn of pool) {
        if (conn.inUse) {
          active++;
        } else {
          idle++;
        }
      }
    }

    return {
      totalConnections: total,
      hostsConnected: this.connections.size,
      idleConnections: idle,
      activeConnections: active,
    };
  }
}
