/**
 * WebSocket Client for Terminal
 * Browser-side WebSocket connection management
 */

import { TerminalClientMessage, TerminalServerMessage } from './types';

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

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = process.env.NEXT_PUBLIC_TERMINAL_PORT || 3001;

    return `${protocol}//${host}:${port}/terminal`;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        this.intentionallyClosed = false;
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('[WebSocketClient] Connected to terminal server');
          this.reconnectAttempts = 0;
        };

        this.ws.onmessage = (event) => {
          try {
            const message: TerminalServerMessage = JSON.parse(event.data);

            switch (message.type) {
              case 'connected':
                if (message.id) {
                  this.sessionId = message.id;
                  console.log(`[WebSocketClient] Session established: ${this.sessionId}`);
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
                console.log(`[WebSocketClient] Terminal exited with code ${message.code}`);
                this.onExitHandler?.(message.code || 0);
                this.close();
                break;

              case 'error':
                console.error('[WebSocketClient] Server error:', message.message);
                this.onErrorHandler?.(message.message || 'Unknown error');
                break;

              default:
                console.warn('[WebSocketClient] Unknown message type:', (message as any).type);
            }
          } catch (error) {
            console.error('[WebSocketClient] Error parsing message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[WebSocketClient] WebSocket error:', error);
          this.onErrorHandler?.('WebSocket connection error');
          reject(new Error('WebSocket connection error'));
        };

        this.ws.onclose = (event) => {
          console.log(`[WebSocketClient] Connection closed: ${event.code} ${event.reason}`);
          this.handleClose();
        };
      } catch (error) {
        console.error('[WebSocketClient] Error creating WebSocket:', error);
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

      console.log(`[WebSocketClient] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

      this.reconnectTimeout = setTimeout(() => {
        this.connect().catch((error) => {
          console.error('[WebSocketClient] Reconnection failed:', error);
        });
      }, delay);
    } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocketClient] Max reconnection attempts reached');
      this.onErrorHandler?.('Failed to reconnect to terminal server');
    }
  }

  /**
   * Send input to terminal
   */
  sendInput(data: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[WebSocketClient] WebSocket not connected');
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
      console.error('[WebSocketClient] WebSocket not connected');
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
