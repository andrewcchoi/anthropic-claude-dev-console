'use client';

import { CLISession } from '@/types/sessions';
import { useChatStore } from '@/lib/store';
import { useSessionDiscoveryStore } from '@/lib/store/sessions';
import { formatISOWithRelative } from '@/lib/utils/time';
import { cn } from '@/lib/utils';
import { createLogger } from '@/lib/logger';

const log = createLogger('SessionItem');

type SectionType = 'home' | 'system' | 'unassigned';

interface SessionItemProps {
  session: CLISession;
  sectionType?: SectionType;
}

export function SessionItem({ session, sectionType = 'home' }: SessionItemProps) {
  const { sessionId, switchSession, metadataColorScheme } = useChatStore();
  const { loadSessionDetails } = useSessionDiscoveryStore();
  const isActive = sessionId === session.id;

  const handleClick = async () => {
    log.debug('Session clicked', {
      id: session.id,
      projectId: session.projectId,
      filePath: session.filePath,
    });
    // Update the store to use this session
    await switchSession(session.id, session.projectId);
  };

  // Border colors based on section type
  const borderColorClass = {
    home: 'border-l-green-500 dark:border-l-green-400',
    system: 'border-l-blue-500 dark:border-l-blue-400',
    unassigned: 'border-l-orange-500 dark:border-l-orange-400',
  }[sectionType];

  // Color classes based on metadata color scheme
  const metadataColors = metadataColorScheme === 'semantic'
    ? {
        branch: 'text-purple-600 dark:text-purple-400',
        messageCount: 'text-blue-600 dark:text-blue-400',
        dates: 'text-gray-600 dark:text-gray-400',
      }
    : {
        branch: 'text-cyan-600 dark:text-cyan-400',
        messageCount: 'text-purple-600 dark:text-purple-400',
        createdDate: 'text-amber-600 dark:text-amber-400',
        modifiedDate: 'text-red-600 dark:text-red-400',
      };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'p-2.5 rounded-lg cursor-pointer text-sm',
        'border-l-4',
        'mb-1.5 transition-colors',
        isActive && [
          'bg-blue-50 dark:bg-blue-950',
          borderColorClass,
          'text-blue-900 dark:text-blue-100',
        ],
        !isActive && [
          'border-transparent',
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
        <div className={cn("mt-1 ml-6 flex items-center gap-1.5", metadataColors.branch)}>
          <span className="text-xs">🔀</span>
          <span className="text-xs truncate">
            {session.gitBranch}
          </span>
        </div>
      )}

      {/* Line 3: Metadata with ISO dates and color coding */}
      <div className="text-xs mt-1 ml-6 flex flex-wrap gap-2">
        {session.messageCount !== undefined && (
          <span className={metadataColors.messageCount}>
            💬 {session.messageCount} msg{session.messageCount !== 1 ? 's' : ''}
          </span>
        )}
        {session.createdAt && (
          <span className={metadataColorScheme === 'semantic' ? metadataColors.dates : metadataColors.createdDate}>
            📅 {formatISOWithRelative(session.createdAt)}
          </span>
        )}
        <span className={metadataColorScheme === 'semantic' ? metadataColors.dates : metadataColors.modifiedDate}>
          🕒 {formatISOWithRelative(session.modifiedAt)}
        </span>
      </div>
    </div>
  );
}
