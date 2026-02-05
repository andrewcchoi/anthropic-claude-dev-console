'use client';

import { Terminal } from '@/components/terminal';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { createLogger } from '@/lib/logger';

const log = createLogger('TerminalPage');

function TerminalContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  useEffect(() => {
    if (sessionId) {
      log.info('Terminal page loaded with session', {
        sessionId,
        sessionIdShort: sessionId.slice(0, 8)
      });
    } else {
      log.info('Terminal page loaded without session');
    }
  }, [sessionId]);

  // If sessionId exists, construct command to resume the Claude session
  // Match the flags used in the main chat UI (see src/app/api/claude/route.ts)
  const initialCommand = sessionId
    ? `claude --allow-dangerously-skip-permissions --resume ${sessionId}\n`
    : undefined;

  if (sessionId) {
    log.debug('Constructed initial command for session resumption', {
      sessionId: sessionId.slice(0, 8),
      command: initialCommand?.trim()
    });
  }

  const title = sessionId
    ? 'Interactive Terminal (Claude Session)'
    : 'Interactive Terminal';

  const description = sessionId
    ? `Connected to Claude Code session: ${sessionId.slice(0, 8)}...`
    : 'Testing WebSocket connection to terminal server on port 3001';

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-semibold text-white">{title}</h1>
        <p className="text-sm text-gray-400 mt-1">{description}</p>
      </div>
      <div className="flex-1 p-4 overflow-hidden min-h-0">
        <Terminal mode="interactive" className="h-full" initialCommand={initialCommand} />
      </div>
    </div>
  );
}

export default function TerminalPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col h-screen bg-gray-900 items-center justify-center">
        <p className="text-gray-400">Loading terminal...</p>
      </div>
    }>
      <TerminalContent />
    </Suspense>
  );
}
