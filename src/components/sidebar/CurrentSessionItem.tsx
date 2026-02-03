'use client';

import { useChatStore } from '@/lib/store';
import { formatRelativeTime, formatDuration } from '@/lib/utils/time';

export function CurrentSessionItem() {
  const { currentSession, messages, sessionId } = useChatStore();

  // Don't render if no session or no messages
  if (!sessionId || messages.length === 0) {
    return null;
  }

  // Derive session info from current state
  const messageCount = messages.length;
  const name = currentSession?.name ||
               messages.find((m) => m.role === 'user')?.content?.[0]?.text?.slice(0, 50) ||
               'New Chat';
  const createdAt = currentSession?.created_at || Date.now();
  const modifiedAt = currentSession?.updated_at || Date.now();

  return (
    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
      <div className="truncate font-medium text-blue-900 dark:text-blue-100 text-sm">
        {name}
      </div>
      <div className="text-xs text-blue-700 dark:text-blue-300 mt-1 flex items-center gap-1">
        <span>{messageCount} msg{messageCount !== 1 ? 's' : ''}</span>
        <span className="text-blue-400 dark:text-blue-600">•</span>
        <span>{formatDuration(createdAt, modifiedAt)}</span>
        <span className="text-blue-400 dark:text-blue-600">•</span>
        <span>{formatRelativeTime(modifiedAt)}</span>
      </div>
    </div>
  );
}
