'use client';

import { Session } from '@/types/claude';
import { useChatStore } from '@/lib/store';
import { useWorkspaceStore } from '@/lib/store/workspaces';
import { formatSmartTime } from '@/lib/utils/time';
import { cn } from '@/lib/utils';
import { createLogger } from '@/lib/logger';

const log = createLogger('UISessionItem');

interface UISessionItemProps {
  session: Session;
}

export function UISessionItem({ session }: UISessionItemProps) {
  const { sessionId, switchSession, hideSession, unlinkSessionFromWorkspace } = useChatStore();
  const { activeWorkspaceId, workspaces, setActiveWorkspace } = useWorkspaceStore();
  const isActive = sessionId === session.id;

  const handleClick = async () => {
    // Auto-switch workspace if session belongs to different workspace
    if (session.workspaceId && session.workspaceId !== activeWorkspaceId) {
      // Validate workspace exists
      const workspaceExists = workspaces.has(session.workspaceId);

      if (workspaceExists) {
        log.debug('Auto-switching workspace for session', {
          sessionId: session.id,
          sessionWorkspaceId: session.workspaceId,
          currentActiveWorkspaceId: activeWorkspaceId,
        });

        setActiveWorkspace(session.workspaceId);
      } else {
        log.warn('Session references non-existent workspace', {
          sessionId: session.id,
          workspaceId: session.workspaceId,
        });

        // Unlink from non-existent workspace
        unlinkSessionFromWorkspace(session.id);
      }
    }

    // Switch to session
    await switchSession(session.id);
  };

  const handleHide = (e: React.MouseEvent) => {
    e.stopPropagation();
    hideSession(session.id);
  };

  return (
    <div
      onClick={handleClick}
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
      <div className="flex items-center gap-2 truncate">
        {/* Chat icon */}
        <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span className="truncate font-medium">{session.name}</span>
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex justify-between">
        <span>{formatSmartTime(session.updated_at)}</span>
        <button
          onClick={handleHide}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Hide session"
          title="Hide session"
        >
          ×
        </button>
      </div>
    </div>
  );
}
