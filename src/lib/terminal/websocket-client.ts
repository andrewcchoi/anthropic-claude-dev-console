/**
 * WebSocket Client for Terminal
 * Browser-side WebSocket connection management
 */

import { TerminalClientMessage, TerminalServerMessage } from './types';
import { createLogger } from '../logger';

const log = createLogger('WebSocketClient');

export type TerminalEventHandler = (data: string) => void;
export type TerminalConnectedHandler = (sessionId: string) => void;
export type TerminalExitHandler = (code: number) => void;
export type TerminalErrorHandler = (message: string) => void;

export interface WebSocketClientOptions {
  url?: string;
  onData?: TerminalEventHandler;
  onConnected?: TerminalConnectedHandler;
  onExit?: TerminalExitHandler;
  onError?: TerminalErrorHandler;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private sessionId: string | null = null;
  private reconnect: boolean;
  private reconnectInterval: number;
  private maxReconnectAttempts: number;
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private intentionallyClosed = false;

  // Event handlers
  private onDataHandler?: TerminalEventHandler;
  private onConnectedHandler?: TerminalConnectedHandler;
  private onExitHandler?: TerminalExitHandler;
  private onErrorHandler?: TerminalErrorHandler;

  constructor(options: WebSocketClientOptions = {}) {
    this.url = options.url || this.getDefaultUrl();
    this.reconnect = options.reconnect ?? true;
    this.reconnectInterval = options.reconnectInterval || 1000;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;

    this.onDataHandler = options.onData;
    this.onConnectedHandler = options.onConnected;
    this.onExitHandler = options.onExit;
    this.onErrorHandler = options.onError;
  }

  /**
   * Get default WebSocket URL
   */
  private getDefaultUrl(): string {
    if (typeof window === 'undefined') {
      return 'ws://localhost:3001/terminal';
    }

    // Use environment variable if set (for Codespaces/custom deployments)
    const envUrl = process.env.NEXT_PUBLIC_TERMINAL_WS_URL;
    if (envUrl) {
      log.debug('Using env URL', { url: envUrl });
      return envUrl.endsWith('/terminal') ? envUrl : `${envUrl}/terminal`;
    }

    // For localhost, always use ws:// (server doesn't support TLS)
    const host = window.location.hostname;
    const isLocalhost = host === 'localhost' || host === '127.0.0.1';
    const protocol = isLocalhost ? 'ws:' : (window.location.protocol === 'https:' ? 'wss:' : 'ws:');
    const port = 3001;

    const url = `${protocol}//${host}:${port}/terminal`;
    log.debug('Constructed URL', { url });
    return url;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        this.intentionallyClosed = false;
        log.debug('Connecting', { url: this.url });
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          log.info('Connected to terminal server');
          this.reconnectAttempts = 0;
        };

        this.ws.onmessage = (event) => {
          try {
            const message: TerminalServerMessage = JSON.parse(event.data);

            switch (message.type) {
              case 'connected':
                if (message.id) {
                  this.sessionId = message.id;
                  log.info('Session established', { sessionId: this.sessionId });
                  this.onConnectedHandler?.(this.sessionId);
                  resolve(this.sessionId);
                }
                break;

              case 'output':
                if (message.data) {
                  this.onDataHandler?.(message.data);
                }
                break;

              case 'exit':
                log.info('Terminal exited', { code: message.code });
                this.onExitHandler?.(message.code || 0);
                this.close();
                break;

              case 'error':
                log.error('Server error', { message: message.message });
                this.onErrorHandler?.(message.message || 'Unknown error');
                break;

              default:
                log.warn('Unknown message type', { type: (message as any).type });
            }
          } catch (error) {
            log.error('Error parsing message', { error });
          }
        };

        this.ws.onerror = (event) => {
          // Ignore errors if we intentionally closed (e.g., React Strict Mode cleanup)
          if (this.intentionallyClosed) {
            log.debug('Ignoring error - connection was intentionally closed');
            return;
          }

          // Browser WebSocket errors are intentionally vague for security
          // Log what we can and check the close event for more info
          log.error('WebSocket error', { url: this.url, readyState: this.ws?.readyState });
          this.onErrorHandler?.('WebSocket connection error');
          reject(new Error(`WebSocket connection failed to ${this.url}`));
        };

        this.ws.onclose = (event) => {
          log.info('Connection closed', { code: event.code, reason: event.reason });

          // Skip reconnect logic for intentional closes
          if (this.intentionallyClosed) {
            log.debug('Connection intentionally closed');
            this.ws = null;
            return;
          }

          this.handleClose();
        };
      } catch (error) {
        log.error('Error creating WebSocket', { error });
        reject(error);
      }
    });
  }

  /**
   * Handle WebSocket close
   */
  private handleClose(): void {
    this.ws = null;

    if (!this.intentionallyClosed && this.reconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

      log.info('Reconnecting', {
        delay,
        attempt: this.reconnectAttempts,
        maxAttempts: this.maxReconnectAttempts,
      });

      this.reconnectTimeout = setTimeout(() => {
        this.connect().catch((error) => {
          log.error('Reconnection failed', { error });
        });
      }, delay);
    } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      log.error('Max reconnection attempts reached');
      this.onErrorHandler?.('Failed to reconnect to terminal server');
    }
  }

  /**
   * Send input to terminal
   */
  sendInput(data: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      log.error('WebSocket not connected');
      return;
    }

    const message: TerminalClientMessage = {
      type: 'input',
      data,
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Resize terminal
   */
  resize(cols: number, rows: number): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      log.error('WebSocket not connected');
      return;
    }

    const message: TerminalClientMessage = {
      type: 'resize',
      cols,
      rows,
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Close connection
   */
  close(): void {
    this.intentionallyClosed = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.sessionId = null;
  }

  /**
   * Get session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
