'use client';

import { ReadOnlyTerminal } from './ReadOnlyTerminal';
import { InteractiveTerminal } from './InteractiveTerminal';

interface TerminalProps {
  mode?: 'readonly' | 'interactive';
  content?: string;
  className?: string;
  minHeight?: number;
  maxHeight?: number;
  sessionId?: string;
  onConnected?: (sessionId: string) => void;
  onDisconnected?: () => void;
  onError?: (error: string) => void;
}

/**
 * Terminal facade component
 * Routes to ReadOnlyTerminal or InteractiveTerminal based on mode
 */
export function Terminal({
  mode = 'readonly',
  content = '',
  className = '',
  minHeight = 100,
  maxHeight = 400,
  sessionId,
  onConnected,
  onDisconnected,
  onError,
}: TerminalProps) {
  if (mode === 'readonly') {
    return (
      <ReadOnlyTerminal
        content={content}
        className={className}
        minHeight={minHeight}
        maxHeight={maxHeight}
      />
    );
  }

  if (mode === 'interactive') {
    return (
      <InteractiveTerminal
        className={className}
        onConnected={onConnected}
        onDisconnected={onDisconnected}
        onError={onError}
      />
    );
  }

  return null;
}
