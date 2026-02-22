'use client';

import { useEffect, useRef, useState } from 'react';
import { useTerminal } from '@/hooks/useTerminal';
import { useAppTheme } from '@/hooks/useAppTheme';
import '@xterm/xterm/css/xterm.css';

interface InteractiveTerminalProps {
  cwd?: string;
  className?: string;
  minHeight?: number;
  maxHeight?: number;
  initialCommand?: string;
  onConnected?: (sessionId: string) => void;
  onDisconnected?: () => void;
  onError?: (error: string) => void;
}

export function InteractiveTerminal({
  cwd,
  className = '',
  minHeight = 200,
  maxHeight = 400,
  initialCommand,
  onConnected,
  onDisconnected,
  onError,
}: InteractiveTerminalProps) {
  const { resolvedTheme } = useAppTheme();
  const [hasReceivedOutput, setHasReceivedOutput] = useState(false);
  const outputBufferRef = useRef('');

  const {
    terminalRef,
    isConnected,
    sessionId,
    error,
    connect,
    disconnect,
  } = useTerminal({
    cwd,
    theme: resolvedTheme === 'light' ? 'light' : 'dark',
    initialCommand,
    onConnected,
    onDisconnected,
    onError,
    onData: (data) => {
      // Only show terminal when we detect Claude's output (not just shell prompt)
      if (!hasReceivedOutput && initialCommand) {
        // Accumulate output to detect Claude
        outputBufferRef.current += data;

        // Look for Claude-specific output patterns
        // Claude outputs its logo or "Claude Code" in the first few lines
        if (
          outputBufferRef.current.includes('Claude') ||
          outputBufferRef.current.includes('▐▛███▜▌') || // Claude logo
          outputBufferRef.current.length > 500 // Or substantial output
        ) {
          setHasReceivedOutput(true);
        }
      } else if (!hasReceivedOutput && !initialCommand) {
        // If no initial command, show terminal immediately on first data
        setHasReceivedOutput(true);
      }
    },
  });

  // Track if connection has been initiated to prevent duplicates in Strict Mode
  const hasInitiatedConnectionRef = useRef(false);

  // Auto-connect on mount with debounce to avoid React Strict Mode race condition
  // Strict Mode: mount → unmount → remount happens synchronously
  // setTimeout(0) defers connect() until after this cycle completes
  // Use hasInitiatedConnectionRef to prevent duplicate connections across mount/unmount cycles
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let isCancelled = false;

    const timeoutId = setTimeout(() => {
      // Only connect if not cancelled AND haven't already initiated a connection
      if (!isCancelled && !hasInitiatedConnectionRef.current) {
        hasInitiatedConnectionRef.current = true;
        connect();
      }
    }, 0);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
      // Don't reset hasInitiatedConnectionRef here - let it persist to prevent duplicate connections
      disconnect();
    };
  }, []); // connect/disconnect are stable refs from useTerminal

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        minHeight: `${minHeight}px`,
        maxHeight: `${maxHeight}px`,
        height: `${maxHeight}px`
      }}
    >
      {/* Connection status indicator */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-2 text-xs">
        <div
          className={`h-2 w-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`}
          title={isConnected ? 'Connected' : 'Disconnected'}
        />
        {sessionId && (
          <span className="text-gray-400 font-mono">
            {sessionId.slice(0, 8)}
          </span>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="absolute top-10 left-2 right-2 z-10 bg-red-900/80 text-red-200 px-3 py-2 rounded text-sm">
          <strong>Connection Error:</strong> {error}
          {error.includes('WebSocket') && (
            <p className="mt-1 text-xs opacity-80">
              Ensure terminal server is running: npm run dev:terminal
            </p>
          )}
        </div>
      )}

      {/* Loading spinner - shown until we receive terminal output */}
      {!hasReceivedOutput && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Starting Claude session...
            </span>
          </div>
        </div>
      )}

      {/* Terminal container - hidden until we receive output */}
      <div
        ref={terminalRef}
        className={`h-full w-full transition-opacity duration-300 ${
          hasReceivedOutput ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
