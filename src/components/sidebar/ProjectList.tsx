'use client';

import { useState } from 'react';
import { useSessionDiscoveryStore } from '@/lib/store/sessions';
import { useChatStore } from '@/lib/store';
import { SessionItem } from './SessionItem';
import { UISessionItem } from './UISessionItem';

export function ProjectList() {
  const { projects, sessions, sessionSearchQuery } = useSessionDiscoveryStore();
  const { sessions: uiSessions, sessionId, hiddenSessionIds } = useChatStore();
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  // Helper to check if text matches search query
  const matchesSearch = (text: string | undefined, query: string): boolean => {
    if (!text) return false;
    return text.toLowerCase().includes(query.toLowerCase());
  };

  const toggleProject = (projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  if (projects.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
        No projects found
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {projects.map((project) => {
        const isWorkspace = project.path === '/workspace';

        // Get CLI sessions for this project
        let cliSessions = sessions.filter((s) => s.projectId === project.id);

        // For workspace: mix in browser sessions (excluding current and hidden)
        let browserSessions = isWorkspace
          ? uiSessions.filter(s => !hiddenSessionIds.has(s.id))
          : [];

        // Apply search filter if query exists
        if (sessionSearchQuery) {
          cliSessions = cliSessions.filter((s) =>
            matchesSearch(s.name, sessionSearchQuery) ||
            matchesSearch(s.gitBranch, sessionSearchQuery)
          );
          browserSessions = browserSessions.filter((s) =>
            matchesSearch(s.name, sessionSearchQuery)
          );
        }

        // Combine and sort by recency
        type MixedSession =
          | { source: 'browser'; data: typeof uiSessions[0] }
          | { source: 'cli'; data: typeof cliSessions[0] };

        const allProjectSessions: MixedSession[] = [
          ...browserSessions.map(s => ({ source: 'browser' as const, data: s })),
          ...cliSessions.map(s => ({ source: 'cli' as const, data: s })),
        ].sort((a, b) => {
          const aTime = a.source === 'browser'
            ? (a.data.updated_at || a.data.created_at || 0)
            : (a.data.modifiedAt || a.data.createdAt || 0);
          const bTime = b.source === 'browser'
            ? (b.data.updated_at || b.data.created_at || 0)
            : (b.data.modifiedAt || b.data.createdAt || 0);
          return bTime - aTime;
        });

        const isExpanded = expandedProjects.has(project.id);

        // Skip projects with no matching sessions when searching
        if (sessionSearchQuery && allProjectSessions.length === 0) {
          return null;
        }

        return (
          <div key={project.id} className="space-y-1">
            {/* Project header */}
            <button
              onClick={() => toggleProject(project.id)}
              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-left"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <svg
                  className={`w-4 h-4 flex-shrink-0 transition-transform ${
                    isExpanded ? 'rotate-90' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {project.path === '/workspace' ? 'Current Workspace' : project.path}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {allProjectSessions.length} session{allProjectSessions.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </button>

            {/* Project sessions */}
            {isExpanded && allProjectSessions.length > 0 && (
              <div className="ml-6 space-y-1">
                {allProjectSessions.map((session) =>
                  session.source === 'browser' ? (
                    <UISessionItem key={`browser-${session.data.id}`} session={session.data} />
                  ) : (
                    <SessionItem key={`cli-${session.data.id}`} session={session.data} />
                  )
                )}
              </div>
            )}

            {isExpanded && allProjectSessions.length === 0 && (
              <div className="ml-6 text-sm text-gray-500 dark:text-gray-400 py-2">
                No sessions in this project
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
