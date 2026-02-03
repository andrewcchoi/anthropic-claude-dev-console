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
