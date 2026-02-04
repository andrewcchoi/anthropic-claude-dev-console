'use client';

import { useState } from 'react';
import { CLISession } from '@/types/sessions';
import { useChatStore } from '@/lib/store';
import { useSessionDiscoveryStore } from '@/lib/store/sessions';
import { formatSmartTime, formatDuration } from '@/lib/utils/time';
import { cn } from '@/lib/utils';

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

  const relativeTime = formatSmartTime(session.modifiedAt);

  return (
    <div
      onClick={handleClick}
      onMouseEnter={handleHover}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'p-2.5 rounded-lg cursor-pointer text-sm',
        'border-l-4 border-transparent',
        'mb-1.5 transition-colors',
        isActive && [
          'bg-blue-50 dark:bg-blue-950',
          'border-l-blue-500 dark:border-l-blue-400',
          'text-blue-900 dark:text-blue-100',
        ],
        !isActive && [
          'hover:bg-gray-50 dark:hover:bg-gray-800/50',
          'hover:border-l-gray-300 dark:hover:border-l-gray-600',
          'text-gray-700 dark:text-gray-300',
        ]
      )}
    >
      {/* Line 1: Terminal icon + session name */}
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 17l6-6-6-6M12 19h8" />
        </svg>
        <span className="truncate font-medium">{session.name}</span>
      </div>

      {/* Line 2: Git branch (if exists) */}
      {session.gitBranch && (
        <div className="mt-1 ml-6 flex items-center gap-1.5">
          <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 3v12M18 9a3 3 0 01-3 3h-6" />
          </svg>
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {session.gitBranch}
          </span>
        </div>
      )}

      {/* Line 3: Metadata */}
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
        {session.messageCount !== undefined && (
          <>
            {session.messageCount} msg{session.messageCount !== 1 ? 's' : ''}
            <span className="mx-1">·</span>
          </>
        )}
        {relativeTime}
      </div>
    </div>
  );
}
