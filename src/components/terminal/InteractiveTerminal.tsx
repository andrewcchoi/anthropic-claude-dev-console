'use client';

import { useEffect } from 'react';
import { useTerminal } from '@/hooks/useTerminal';
import '@xterm/xterm/css/xterm.css';

interface InteractiveTerminalProps {
  className?: string;
  onConnected?: (sessionId: string) => void;
  onDisconnected?: () => void;
  onError?: (error: string) => void;
}

export function InteractiveTerminal({
  className = '',
  onConnected,
  onDisconnected,
  onError,
}: InteractiveTerminalProps) {
  const {
    terminalRef,
    isConnected,
    sessionId,
    error,
    connect,
    disconnect,
  } = useTerminal({
    onConnected,
    onDisconnected,
    onError,
  });

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, []);

  return (
    <div className={`relative h-full w-full ${className}`}>
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
          Error: {error}
        </div>
      )}

      {/* Terminal container */}
      <div
        ref={terminalRef}
        className="h-full w-full"
        style={{ padding: '8px' }}
      />
    </div>
  );
}
