import { useEffect, useRef, useState, RefObject } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import { WebSocketClient } from '@/lib/terminal/websocket-client';

interface UseTerminalOptions {
  cwd?: string;
  onConnected?: (sessionId: string) => void;
  onDisconnected?: () => void;
  onError?: (error: string) => void;
}

interface UseTerminalReturn {
  terminalRef: RefObject<HTMLDivElement | null>;
  isConnected: boolean;
  sessionId: string | null;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export function useTerminal(options: UseTerminalOptions = {}): UseTerminalReturn {
  const { cwd, onConnected, onDisconnected, onError } = options;

  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsClientRef = useRef<WebSocketClient | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const isMountedRef = useRef(true);

  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cleanup function
  const cleanup = () => {
    isMountedRef.current = false;

    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
      resizeObserverRef.current = null;
    }

    if (wsClientRef.current) {
      wsClientRef.current.close();
      wsClientRef.current = null;
    }

    if (xtermRef.current) {
      xtermRef.current.dispose();
      xtermRef.current = null;
    }

    fitAddonRef.current = null;
  };

  // Connect function
  const connect = async () => {
    // Reset mounted flag on new connection
    isMountedRef.current = true;

    if (!terminalRef.current) {
      const errorMsg = 'Terminal container ref is not available';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    try {
      setError(null);

      // Create xterm instance
      const xterm = new Terminal({
        cursorBlink: true,
        disableStdin: false,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: {
          background: '#1e1e1e',
          foreground: '#d4d4d4',
          cursor: '#ffffff',
        },
      });

      // Load addons
      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();
      const searchAddon = new SearchAddon();

      xterm.loadAddon(fitAddon);
      xterm.loadAddon(webLinksAddon);
      xterm.loadAddon(searchAddon);

      // Store refs early
      xtermRef.current = xterm;
      fitAddonRef.current = fitAddon;

      // Wait for container to have dimensions before opening
      const openTerminalAndConnect = async () => {
        const container = terminalRef.current;
        if (!container) {
          throw new Error('Terminal container ref is not available');
        }

        const rect = container.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          // Container has dimensions, safe to open
          xterm.open(container);

          // Fit - defer to allow renderer to fully initialize
          requestAnimationFrame(() => {
            fitAddon.fit();
          });

          // Create WebSocket client
          const wsClient = new WebSocketClient({
            cwd,
            onConnected: (sid: string) => {
              // Check if still mounted before updating state
              if (!isMountedRef.current) return;
              setIsConnected(true);
              setSessionId(sid);
              onConnected?.(sid);
            },
            onData: (data: string) => {
              xterm.write(data);
            },
            onError: (errorMsg: string) => {
              // Check if still mounted before updating state
              if (!isMountedRef.current) return;
              setError(errorMsg);
              onError?.(errorMsg);
            },
            onExit: (code: number) => {
              // Check if still mounted before updating state
              if (!isMountedRef.current) return;
              setIsConnected(false);
              setSessionId(null);
              onDisconnected?.();
            },
          });
          wsClientRef.current = wsClient;

          // Connect xterm input to WebSocket
          xterm.onData((data: string) => {
            wsClient.sendInput(data);
          });

          // Set up resize observer
          const resizeObserver = new ResizeObserver(() => {
            if (fitAddonRef.current && wsClientRef.current && isConnected) {
              fitAddonRef.current.fit();
              const { cols, rows } = xterm;
              wsClientRef.current.resize(cols, rows);
            }
          });

          resizeObserver.observe(container);
          resizeObserverRef.current = resizeObserver;

          // Connect WebSocket
          await wsClient.connect();

          // Check if still mounted after connection completes
          if (!isMountedRef.current) {
            wsClient.close();
            return;
          }
        } else {
          // Container not ready, wait and try again
          await new Promise(resolve => requestAnimationFrame(resolve));
          await openTerminalAndConnect();
        }
      };

      await openTerminalAndConnect();

    } catch (err) {
      // Only handle error if still mounted
      if (!isMountedRef.current) return;

      const errorMsg = err instanceof Error ? err.message : 'Failed to connect terminal';
      setError(errorMsg);
      onError?.(errorMsg);
      cleanup();
    }
  };

  // Disconnect function
  const disconnect = () => {
    setIsConnected(false);
    setSessionId(null);
    cleanup();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  return {
    terminalRef,
    isConnected,
    sessionId,
    error,
    connect,
    disconnect,
  };
}
