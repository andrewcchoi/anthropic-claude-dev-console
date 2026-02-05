'use client';

import { useEffect } from 'react';
import { useChatStore } from '@/lib/store';
import { useSessionDiscoveryStore } from '@/lib/store/sessions';
import { useCliPrewarm } from '@/hooks/useCliPrewarm';
import { SessionSearch } from './SessionSearch';
import { RefreshButton } from './RefreshButton';
import { ProjectList } from './ProjectList';
import { Loader2 } from 'lucide-react';

const STALE_THRESHOLD = 60000; // 60 seconds

export function SessionPanel() {
  const { startNewSession, isPrewarming } = useChatStore();
  const {
    discoverSessions,
    lastDiscoveryTime,
    lastDiscoveryCount,
    discoveryError,
    isDiscovering,
  } = useSessionDiscoveryStore();
  const { prewarmCli } = useCliPrewarm();

  // Helper to format relative time
  const formatRelativeTime = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

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
          disabled={isPrewarming}
          className="w-full rounded-lg bg-blue-600 dark:bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isPrewarming ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Initializing...
            </>
          ) : (
            '+ New Chat'
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Search and refresh controls */}
        <div className="flex items-center gap-2 mb-3">
          <SessionSearch />
          <RefreshButton onRefresh={handleRefresh} isRefreshing={isDiscovering} error={discoveryError} />
        </div>

        {/* Last refresh indicator */}
        {lastDiscoveryTime && lastDiscoveryCount !== null && (
          <div className="text-xs text-gray-400 dark:text-gray-500 mb-2">
            {lastDiscoveryCount} session{lastDiscoveryCount !== 1 ? 's' : ''} • Last refreshed {formatRelativeTime(lastDiscoveryTime)}
          </div>
        )}

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
