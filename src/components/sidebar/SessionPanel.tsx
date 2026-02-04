'use client';

import { useEffect } from 'react';
import { useChatStore } from '@/lib/store';
import { useSessionDiscoveryStore } from '@/lib/store/sessions';
import { useCliPrewarm } from '@/hooks/useCliPrewarm';
import { SessionSearch } from './SessionSearch';
import { RefreshButton } from './RefreshButton';
import { ProjectList } from './ProjectList';

const STALE_THRESHOLD = 60000; // 60 seconds

export function SessionPanel() {
  const { startNewSession } = useChatStore();
  const { discoverSessions, lastDiscoveryTime, isDiscovering } = useSessionDiscoveryStore();
  const { prewarmCli } = useCliPrewarm();

  useEffect(() => {
    // Auto-discover on mount if stale or never discovered
    const isStale = !lastDiscoveryTime || (Date.now() - lastDiscoveryTime > STALE_THRESHOLD);
    if (isStale && !isDiscovering) {
      discoverSessions(true); // Quick scan
    }
  }, [lastDiscoveryTime, isDiscovering, discoverSessions]);

  const handleNewChat = () => {
    const newSessionId = startNewSession();
    prewarmCli(newSessionId);
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
        {/* Search and refresh controls */}
        <div className="flex items-center justify-between mb-3">
          <SessionSearch />
          <RefreshButton onRefresh={handleRefresh} isRefreshing={isDiscovering} />
        </div>

        {/* Projects with sessions - no collapsible wrapper */}
        {isDiscovering && !lastDiscoveryTime ? (
          <div className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">
            Discovering sessions...
          </div>
        ) : (
          <ProjectList />
        )}
      </div>
    </>
  );
}
