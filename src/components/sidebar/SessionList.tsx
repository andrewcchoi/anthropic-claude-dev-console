'use client';

import { useEffect, useState } from 'react';
import { useChatStore } from '@/lib/store';

export function SessionList() {
  const [isClient, setIsClient] = useState(false);
  const { sessions, sessionId, switchSession, deleteSession } = useChatStore();

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div className="text-sm text-gray-400">Loading...</div>;
  }

  const sorted = [...sessions].sort((a, b) => b.updated_at - a.updated_at);

  if (sorted.length === 0) {
    return (
      <div className="text-sm text-gray-500 py-4 text-center">
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
              ? 'bg-blue-100 text-blue-900'
              : 'hover:bg-gray-100 text-gray-700'
          }`}
        >
          <div className="truncate">{session.name}</div>
          <div className="text-xs text-gray-500 flex justify-between mt-1">
            <span>{formatRelativeTime(session.updated_at)}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteSession(session.id);
              }}
              className="text-gray-400 hover:text-red-500"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
