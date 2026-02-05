'use client';

import { Terminal } from '@/components/terminal';

export default function TerminalPage() {
  return (
    <div className="flex flex-col h-screen bg-gray-900">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-semibold text-white">Interactive Terminal Test</h1>
        <p className="text-sm text-gray-400 mt-1">
          Testing WebSocket connection to terminal server on port 3001
        </p>
      </div>
      <div className="flex-1 p-4 overflow-hidden min-h-0">
        <Terminal mode="interactive" className="h-full" />
      </div>
    </div>
  );
}
