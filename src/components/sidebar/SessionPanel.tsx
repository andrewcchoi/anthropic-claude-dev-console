'use client';

import { useEffect, useMemo, useState } from 'react';
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

  // Collapsible sections state
  const [collapsedSections, setCollapsedSections] = useState<Set<'recentChats' | 'history'>>(new Set(['recentChats', 'history']));

  const toggleSection = (section: 'recentChats' | 'history') => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  // Keep sessions in creation order (newest prepended), just filter + slice
  const recentSessions = useMemo(() =>
    uiSessions.filter(s => s.id !== sessionId).slice(0, 5),
    [uiSessions, sessionId]
  );

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

        {/* Recent Chats section - only if there are multiple */}
        {uiSessions.length > 1 && (
          <div className="mt-4">
            <button
              onClick={() => toggleSection('recentChats')}
              className="flex items-center gap-2 w-full mb-2 group"
              aria-expanded={!collapsedSections.has('recentChats')}
              aria-label="Toggle Recent Chats section"
            >
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${
                  collapsedSections.has('recentChats') ? '' : 'rotate-90'
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Recent Chats
              </div>
            </button>
            {!collapsedSections.has('recentChats') && (
              <div className="space-y-0">
                {recentSessions.map(session => (
                  <UISessionItem key={session.id} session={session} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* History section */}
        <div className="flex items-center justify-between mb-3 mt-4">
          <button
            onClick={() => toggleSection('history')}
            className="flex items-center gap-2 group"
            aria-expanded={!collapsedSections.has('history')}
            aria-label="Toggle History section"
          >
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${
                collapsedSections.has('history') ? '' : 'rotate-90'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              History
            </div>
          </button>
          <RefreshButton onRefresh={handleRefresh} isRefreshing={isDiscovering} />
        </div>

        {!collapsedSections.has('history') && (
          <>
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
          </>
        )}
      </div>
    </>
  );
}
