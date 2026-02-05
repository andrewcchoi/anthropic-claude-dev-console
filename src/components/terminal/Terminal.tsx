'use client';

import dynamic from 'next/dynamic';

// Dynamically import terminal components with SSR disabled
// xterm uses browser globals (self, window) that don't exist during SSR
const ReadOnlyTerminal = dynamic(
  () => import('./ReadOnlyTerminal').then(mod => ({ default: mod.ReadOnlyTerminal })),
  { ssr: false, loading: () => <TerminalSkeleton /> }
);

const InteractiveTerminal = dynamic(
  () => import('./InteractiveTerminal').then(mod => ({ default: mod.InteractiveTerminal })),
  { ssr: false, loading: () => <TerminalSkeleton /> }
);

function TerminalSkeleton() {
  return (
    <div className="h-full w-full bg-gray-100 dark:bg-gray-900 rounded animate-pulse flex items-center justify-center">
      <span className="text-gray-400 dark:text-gray-500 text-sm">Loading terminal...</span>
    </div>
  );
}

interface TerminalProps {
  mode?: 'readonly' | 'interactive';
  content?: string;
  cwd?: string;
  className?: string;
  minHeight?: number;
  maxHeight?: number;
  sessionId?: string;
  initialCommand?: string;
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
  cwd,
  className = '',
  minHeight = 100,
  maxHeight = 400,
  sessionId,
  initialCommand,
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
        cwd={cwd}
        className={className}
        initialCommand={initialCommand}
        onConnected={onConnected}
        onDisconnected={onDisconnected}
        onError={onError}
      />
    );
  }

  // Exhaustive check: if we reach here, mode is neither 'readonly' nor 'interactive'
  const _exhaustiveCheck: never = mode;
  return _exhaustiveCheck;
}
