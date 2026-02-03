'use client';

import { Session } from '@/types/claude';
import { useChatStore } from '@/lib/store';
import { formatRelativeTime } from '@/lib/utils/time';

interface UISessionItemProps {
  session: Session;
}

export function UISessionItem({ session }: UISessionItemProps) {
  const { sessionId, switchSession, deleteSession } = useChatStore();
  const isActive = sessionId === session.id;

  const handleClick = () => {
    switchSession(session.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSession(session.id);
  };

  return (
    <div
      onClick={handleClick}
      className={`p-2 rounded cursor-pointer text-sm ${
        isActive
          ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
      }`}
    >
      <div className="flex items-center gap-2 truncate">
        {/* Chat icon */}
        <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span className="truncate">{session.name}</span>
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex justify-between">
        <span>{formatRelativeTime(session.updated_at)}</span>
        <button
          onClick={handleDelete}
          className="text-gray-400 hover:text-red-500"
          aria-label="Delete session"
        >
          ×
        </button>
      </div>
    </div>
  );
}
