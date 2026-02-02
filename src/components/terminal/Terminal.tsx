'use client';

import { ReadOnlyTerminal } from './ReadOnlyTerminal';

interface TerminalProps {
  mode?: 'readonly' | 'interactive';
  content?: string;
  className?: string;
  minHeight?: number;
  maxHeight?: number;
  sessionId?: string;
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
  sessionId
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

  // Interactive mode will be implemented in Phase 3
  return (
    <div className="p-4 text-center text-gray-500">
      Interactive terminal coming in Phase 3...
    </div>
  );
}
