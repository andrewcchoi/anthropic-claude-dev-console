'use client';

import { useEffect } from 'react';
import { useChatStore } from '@/lib/store';
import { useSessionDiscoveryStore } from '@/lib/store/sessions';
import { SessionSearch } from './SessionSearch';
import { RefreshButton } from './RefreshButton';
import { ProjectList } from './ProjectList';
import { CurrentSessionItem } from './CurrentSessionItem';
import { UISessionItem } from './UISessionItem';

const STALE_THRESHOLD = 60000; // 60 seconds

export function SessionPanel() {
  const { startNewSession, sessions: uiSessions, sessionId } = useChatStore();
  const { discoverSessions, lastDiscoveryTime, isDiscovering, projects } = useSessionDiscoveryStore();

  useEffect(() => {
    // Auto-discover on mount if stale or never discovered
    const isStale = !lastDiscoveryTime || (Date.now() - lastDiscoveryTime > STALE_THRESHOLD);
    if (isStale && !isDiscovering) {
      discoverSessions(true); // Quick scan
    }
  }, [lastDiscoveryTime, isDiscovering, discoverSessions]);

  const handleNewChat = () => {
    startNewSession();
  };

  const handleRefresh = () => {
    discoverSessions(true);
  };

  return (
    <>
      <div className="p-4 space-y-2">
        <button
          onClick={handleNewChat}
          className="w-full rounded-lg bg-blue-600 dark:bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:hover:bg-blue-600"
        >
          + New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Current Session section */}
        <CurrentSessionItem />

        {/* UI Sessions section - only if there are multiple */}
        {uiSessions.length > 1 && (
          <div className="mt-4">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Recent Chats
            </div>
            <div className="space-y-1">
              {uiSessions
                .filter(s => s.id !== sessionId) // Exclude current (shown in CurrentSessionItem)
                .slice(0, 5) // Limit to 5
                .map(session => (
                  <UISessionItem key={session.id} session={session} />
                ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-3 mt-4">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            History
          </div>
          <RefreshButton onRefresh={handleRefresh} isRefreshing={isDiscovering} />
        </div>

        <div className="mb-3">
          <SessionSearch />
        </div>

        {isDiscovering && !lastDiscoveryTime ? (
          <div className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">
            Discovering sessions...
          </div>
        ) : projects.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
            No sessions found
          </div>
        ) : (
          <ProjectList />
        )}
      </div>
    </>
  );
}
