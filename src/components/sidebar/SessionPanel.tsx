'use client';

import { useEffect, useRef } from 'react';
import { useChatStore } from '@/lib/store';
import { useSessionDiscoveryStore } from '@/lib/store/sessions';
import { useWorkspaceStore } from '@/lib/store/workspaces';
import { useCliPrewarm } from '@/hooks/useCliPrewarm';
import { SessionSearch } from './SessionSearch';
import { RefreshButton } from './RefreshButton';
import { CollapseAllButton } from './CollapseAllButton';
import { WorkspacesSection } from './WorkspacesSection';
import { SystemSessionsSection } from './SystemSessionsSection';
import { UnassignedSessionsSection } from './UnassignedSessionsSection';
import { Loader2 } from 'lucide-react';
import { createLogger } from '@/lib/logger';

const log = createLogger('SessionPanel');
const STALE_THRESHOLD = 60000; // 60 seconds

export function SessionPanel() {
  const { startNewSession, isPrewarming, collapsedSections, toggleSectionCollapse } = useChatStore();
  const { activeWorkspaceId, workspaces, migrateToWorkspaces } = useWorkspaceStore();
  const {
    discoverSessions,
    sessions,
    lastDiscoveryTime,
    lastDiscoveryCount,
    systemSessionCount,
    discoveryError,
    isDiscovering,
  } = useSessionDiscoveryStore();
  const { prewarmCli } = useCliPrewarm();
  const hasDiscovered = useRef(false);

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
    // Guard against React Strict Mode double-invoke
    if (hasDiscovered.current) {
      log.debug('Discovery already initiated, skipping');
      return;
    }

    // Auto-discover on mount if stale or never discovered
    const isStale = !lastDiscoveryTime || (Date.now() - lastDiscoveryTime > STALE_THRESHOLD);
    if (isStale && !isDiscovering) {
      log.debug('Initiating session discovery and workspace migration');
      hasDiscovered.current = true;

      const init = async () => {
        try {
          log.debug('Starting initialization');

          // 1. Discover sessions
          await discoverSessions(true);

          // 2. Migrate to workspaces (includes orphan handling)
          await migrateToWorkspaces();

          log.debug('Initialization complete');
        } catch (error) {
          log.error('Initialization failed', { error });
        }
      };

      init();
    }
  }, [lastDiscoveryTime, isDiscovering, discoverSessions, migrateToWorkspaces]);

  const handleNewChat = () => {
    // Get active workspace context
    const activeWorkspace = activeWorkspaceId ? workspaces.get(activeWorkspaceId) : null;

    log.debug('New Chat button clicked', {
      workspaceId: activeWorkspace?.id,
      workspaceName: activeWorkspace?.name
    });

    // Pass workspace context to session creation
    startNewSession(activeWorkspace?.id, activeWorkspace?.rootPath);

    // NOTE: Don't pre-warm new sessions - it causes "Session ID already in use" conflicts
    // Pre-warm only happens on app startup in page.tsx for global CLI initialization
  };

  const handleRefresh = () => {
    log.debug('Refresh sessions button clicked');
    discoverSessions(true);
  };

  // Split sessions into system and unassigned
  const systemSessions = sessions.filter(s => s.isSystem);
  const unassignedSessions = sessions.filter(s => !s.isSystem && !s.projectId);

  return (
    <div className="flex flex-col h-full">
      {/* New Chat Button */}
      <div className="p-4 space-y-2">
        <button
          id="new-chat-button"
          onClick={handleNewChat}
          disabled={isPrewarming}
          className="w-full rounded-lg bg-blue-600 dark:bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:hover:bg-blue-600 active:scale-[0.98] active:bg-blue-800 dark:active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2 transition-all duration-150"
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

      {/* Scrollable Project List Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Collapse/Expand All button */}
        <div className="mb-3">
          <CollapseAllButton />
        </div>

        {/* Search and refresh controls */}
        <div className="flex items-center gap-2 mb-3" suppressHydrationWarning>
          <SessionSearch />
          <RefreshButton onRefresh={handleRefresh} isRefreshing={isDiscovering} error={discoveryError} />
        </div>

        {/* Last refresh indicator */}
        {lastDiscoveryTime && lastDiscoveryCount !== null && (
          <div className="text-xs text-gray-400 dark:text-gray-500 mb-2">
            {lastDiscoveryCount} session{lastDiscoveryCount !== 1 ? 's' : ''}
            {systemSessionCount > 0 && (
              <span className="text-gray-500 dark:text-gray-600"> (+{systemSessionCount} system)</span>
            )}
            {' • '}Last refreshed {formatRelativeTime(lastDiscoveryTime)}
          </div>
        )}

        {/* Sections: Workspaces, System, Unassigned */}
        {isDiscovering && !lastDiscoveryTime ? (
          <div className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">
            Discovering sessions...
          </div>
        ) : (
          <div className="space-y-2">
            {/* Workspaces Section */}
            <WorkspacesSection
              isCollapsed={collapsedSections.has('workspaces')}
              onToggle={() => toggleSectionCollapse('workspaces')}
            />

            {/* System Sessions */}
            {systemSessions.length > 0 && (
              <SystemSessionsSection
                sessions={systemSessions}
                isCollapsed={collapsedSections.has('system')}
                onToggle={() => toggleSectionCollapse('system')}
              />
            )}

            {/* Unassigned Sessions */}
            {unassignedSessions.length > 0 && (
              <UnassignedSessionsSection
                sessions={unassignedSessions}
                isCollapsed={collapsedSections.has('unassigned')}
                onToggle={() => toggleSectionCollapse('unassigned')}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
