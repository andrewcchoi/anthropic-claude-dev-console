'use client';

import { useEffect, useState } from 'react';
import { useChatStore } from '@/lib/store';
import { formatRelativeTime } from '@/lib/utils/time';

export function SessionList() {
  const [isClient, setIsClient] = useState(false);
  const { sessions, sessionId, switchSession, deleteSession } = useChatStore();

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div className="text-sm text-gray-400 dark:text-gray-500">Loading...</div>;
  }

  const sorted = [...sessions].sort((a, b) => b.updated_at - a.updated_at);

  if (sorted.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
        No previous sessions
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {sorted.map((session) => (
        <div
          key={session.id}
          onClick={() => switchSession(session.id)}
          className={`p-2 rounded cursor-pointer text-sm truncate ${
            session.id === sessionId
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
          }`}
        >
          <div className="truncate">{session.name}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 flex justify-between mt-1">
            <span>{formatRelativeTime(session.updated_at)}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteSession(session.id);
              }}
              className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
