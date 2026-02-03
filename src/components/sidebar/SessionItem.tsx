'use client';

import { useState } from 'react';
import { CLISession } from '@/types/sessions';
import { useChatStore } from '@/lib/store';
import { useSessionDiscoveryStore } from '@/lib/store/sessions';
import { formatRelativeTime, formatDuration } from '@/lib/utils/time';

interface SessionItemProps {
  session: CLISession;
}

export function SessionItem({ session }: SessionItemProps) {
  const { sessionId, switchSession } = useChatStore();
  const { loadSessionDetails } = useSessionDiscoveryStore();
  const [isHovered, setIsHovered] = useState(false);
  const isActive = sessionId === session.id;

  const handleHover = () => {
    setIsHovered(true);
  };

  const handleClick = async () => {
    // Update the store to use this session
    await switchSession(session.id, session.projectId);
  };

  const duration = formatDuration(session.createdAt, session.modifiedAt);
  const relativeTime = formatRelativeTime(session.modifiedAt);

  return (
    <div
      onClick={handleClick}
      onMouseEnter={handleHover}
      onMouseLeave={() => setIsHovered(false)}
      className={`p-2 rounded cursor-pointer text-sm ${
        isActive
          ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
      }`}
    >
      {/* Session name with optional git branch badge */}
      <div className="flex items-center gap-2 truncate">
        {/* Session icon */}
        <svg
          className="w-4 h-4 flex-shrink-0 text-gray-400 dark:text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        {session.gitBranch && (
          <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
            {session.gitBranch}
          </span>
        )}
        <span className="truncate">{session.name}</span>
      </div>

      {/* Metadata line */}
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {session.messageCount !== undefined && (
          <>
            {session.messageCount} msg{session.messageCount !== 1 ? 's' : ''}
            <span className="mx-1">·</span>
          </>
        )}
        {duration}
        <span className="mx-1">·</span>
        {relativeTime}
      </div>
    </div>
  );
}
