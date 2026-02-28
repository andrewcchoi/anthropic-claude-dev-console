'use client';

import { useCallback, useState } from 'react';
import { useSessionDiscoveryStore } from '@/lib/store/sessions';
import { useChatStore } from '@/lib/store';
import { useWorkspaceStore } from '@/lib/store/workspaces';
import { useClaudeChat } from '@/hooks/useClaudeChat';
import { SessionItem } from './SessionItem';
import { UISessionItem } from './UISessionItem';
import { HomeSessionsSection } from './HomeSessionsSection';
import { Tooltip } from '@/components/ui/Tooltip';
import { createLogger } from '@/lib/logger';
import { showToast } from '@/lib/utils/toast';
import { encodeProjectPath } from '@/lib/utils/projectPath';

const log = createLogger('ProjectList');

export function ProjectList() {
  console.log('🔥🔥🔥 ProjectList COMPONENT RENDERING 🔥🔥🔥');

  const { projects, sessions, sessionSearchQuery } = useSessionDiscoveryStore();
  const { sessions: uiSessions, sessionId, hiddenSessionIds, collapsedProjects, collapsedSections, toggleProjectCollapse, toggleSectionCollapse, switchSession, setCurrentSession, isStreaming } = useChatStore();
  const { validateLastActiveSession, getMostRecentSessionForWorkspace, updateWorkspaceLastActiveSession, setActiveWorkspace, workspaces } = useWorkspaceStore();
  const { cleanupStream } = useClaudeChat();
  const [announcement, setAnnouncement] = useState('');

  console.log('🔥 ProjectList state:', {
    projects: projects.length,
    sessions: sessions.length,
    uiSessions: uiSessions.length,
    setActiveWorkspace: typeof setActiveWorkspace,
  });

  // Split sessions into user and system sessions
  const userSessions = sessions.filter(s => !s.isSystem);
  const systemSessions = sessions.filter(s => s.isSystem);

  // Helper to check if text matches search query
  const matchesSearch = (text: string | undefined, query: string): boolean => {
    if (!text) return false;
    return text.toLowerCase().includes(query.toLowerCase());
  };

  // Workspace click handler with auto-session-selection
  const handleWorkspaceClick = useCallback(async (project: any) => {
    console.log('🔥 WORKSPACE CLICKED:', project.id, project.path);
    log.debug('Workspace clicked', { projectId: project.id, path: project.path });

    // Step 1: Cleanup active stream if any
    if (isStreaming) {
      cleanupStream();
      showToast('Stopped active conversation', 'info');
    }

    // NOTE: React 18 automatically batches state updates, preventing UI flicker
    // Multiple setState calls below are batched into a single render

    // Step 2: Update current workspace (sync)
    console.log('🔥 Attempting to set active workspace:', project.id);
    if (setActiveWorkspace) {
      setActiveWorkspace(project.id);
    } else {
      console.warn('⚠️ setActiveWorkspace not available');
    }

    // Step 3: Find workspace from store (if it exists)
    const workspace = workspaces.get(project.id);

    // Step 4: Find sessions for this project/workspace
    const projectSessions = uiSessions.filter(
      s => s.workspaceId === project.id && !hiddenSessionIds.has(s.id)
    );

    if (projectSessions.length === 0) {
      // No sessions - show empty state
      log.debug('No sessions for workspace, showing empty state', {
        projectId: project.id,
      });
      setCurrentSession(null);

      // Auto-focus "New Chat" button after render
      setTimeout(() => {
        document.getElementById('new-chat-button')?.focus();
      }, 100);
      return;
    }

    // Step 5: Validate lastActiveSessionId
    let sessionToActivate = validateLastActiveSession(
      project.id,
      workspace?.lastActiveSessionId
    );

    if (!sessionToActivate) {
      // Fall back to most recent
      const mostRecent = getMostRecentSessionForWorkspace(project.id);
      sessionToActivate = mostRecent?.id || projectSessions[0]?.id;

      if (workspace?.lastActiveSessionId) {
        log.warn('Invalid lastActiveSessionId, falling back', {
          projectId: project.id,
          invalidSessionId: workspace.lastActiveSessionId,
          fallbackSessionId: sessionToActivate,
        });
        showToast('Restored most recent session', 'info');
      }
    }

    // Step 6: Update workspace tracking and load session (batched by React 18)
    if (sessionToActivate) {
      updateWorkspaceLastActiveSession(project.id, sessionToActivate);

      // Async message loading
      await switchSession(sessionToActivate, project.id);

      // Announce to screen readers
      const session = projectSessions.find(s => s.id === sessionToActivate);
      const workspaceName = project.path === '/workspace' ? 'Current Workspace' : project.path;
      setAnnouncement(`Switched to ${workspaceName}, ${session?.name || 'session'} active`);
    } else {
      // No sessions to activate
      const workspaceName = project.path === '/workspace' ? 'Current Workspace' : project.path;
      setAnnouncement(`Switched to ${workspaceName}, no sessions`);
    }
  }, [
    isStreaming,
    cleanupStream,
    setActiveWorkspace,
    validateLastActiveSession,
    getMostRecentSessionForWorkspace,
    updateWorkspaceLastActiveSession,
    switchSession,
    setCurrentSession,
    workspaces,
    uiSessions,
    hiddenSessionIds,
  ]);


  // Ensure /workspace project always exists when there are browser sessions
  const workspaceExists = projects.some(p => p.path === '/workspace');
  const hasBrowserSessions = uiSessions.filter(s => !hiddenSessionIds.has(s.id)).length > 0;

  // Create virtual workspace project if needed
  const displayProjects = workspaceExists || !hasBrowserSessions
    ? projects
    : [
        {
          id: '-workspace',
          path: '/workspace',
          sessionCount: 0,
          lastActivity: Date.now(),
        },
        ...projects,
      ];


  if (displayProjects.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
        No projects found
      </div>
    );
  }

  return (
    <>
      {/* DEBUG: Visible test that code is loading */}
      <div style={{ background: 'red', color: 'white', padding: '10px', fontWeight: 'bold' }}>
        🔥 CODE UPDATED - Projects: {projects.length} - Sessions: {sessions.length}
      </div>

      {/* Live region for announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      <div className="space-y-2">
        {displayProjects.map((project) => {
        const isWorkspace = project.path === '/workspace';

        // Get CLI sessions for this project (excluding system sessions)
        let cliSessions = userSessions.filter((s) => s.projectId === project.id);

        // Debug logging for Current Workspace
        if (project.id === '-workspace') {
          console.log('🔥 Current Workspace Debug:', {
            projectId: project.id,
            projectPath: project.path,
            totalUserSessions: userSessions.length,
            cliSessionsFound: cliSessions.length,
            firstFewProjectIds: userSessions.slice(0, 5).map(s => s.projectId),
            uiSessionsCount: uiSessions.length,
          });
        }

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

        const isExpanded = !collapsedProjects.has(project.id);

        // Skip projects with no matching sessions when searching
        if (sessionSearchQuery && allProjectSessions.length === 0) {
          return null;
        }

        // Find workspace for this project to get last active session
        const workspace = Array.from(workspaces.values()).find(w => w.projectId === project.id);
        const lastActiveSession = workspace?.lastActiveSessionId
          ? allProjectSessions.find(s =>
              s.source === 'browser'
                ? s.data.id === workspace.lastActiveSessionId
                : s.data.id === workspace.lastActiveSessionId
            )
          : null;

        const tooltipContent = lastActiveSession
          ? `Last session: ${lastActiveSession.source === 'browser' ? lastActiveSession.data.name : lastActiveSession.data.name}`
          : allProjectSessions.length > 0
          ? `${allProjectSessions.length} session${allProjectSessions.length !== 1 ? 's' : ''}`
          : 'No sessions in this workspace';

        return (
          <div key={project.id} className="space-y-1">
            {/* Project header */}
            <Tooltip content={tooltipContent}>
              <button
              onClick={() => {
                handleWorkspaceClick(project);
                toggleProjectCollapse(project.id);
              }}
              aria-label={`Switch to ${project.path === '/workspace' ? 'Current Workspace' : project.path}, ${allProjectSessions.length} session${allProjectSessions.length !== 1 ? 's' : ''}`}
              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-left focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
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
            </Tooltip>

            {/* Home Sessions Section (CLI sessions only) */}
            {isExpanded && cliSessions.length > 0 && (
              <div className="ml-2">
                <HomeSessionsSection
                  workspaceId={project.id}
                  sessions={cliSessions}
                  isCollapsed={collapsedSections.has(`home-${project.id}`)}
                  onToggle={() => toggleSectionCollapse(`home-${project.id}`)}
                />
              </div>
            )}

            {/* Browser Sessions (if workspace) */}
            {isExpanded && browserSessions.length > 0 && (
              <div className="ml-6 space-y-1">
                {browserSessions.map((session) => (
                  <UISessionItem key={`browser-${session.id}`} session={session} />
                ))}
              </div>
            )}

            {/* Empty State */}
            {isExpanded && allProjectSessions.length === 0 && (
              <div className="ml-6 text-sm text-gray-500 dark:text-gray-400 py-2">
                No sessions in this project
              </div>
            )}
          </div>
        );
      })}

      {/* System Sessions - separate collapsible section */}
      {systemSessions.length > 0 && (
        <div className="space-y-1 mt-4">
          {/* System Sessions header */}
          <button
            onClick={() => toggleProjectCollapse('__system__')}
            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-left"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <svg
                className={`w-4 h-4 flex-shrink-0 transition-transform ${
                  !collapsedProjects.has('__system__') ? 'rotate-90' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  System Sessions
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {systemSessions.length} session{systemSessions.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </button>

          {/* System sessions list */}
          {!collapsedProjects.has('__system__') && (
            <div className="ml-6 space-y-1">
              {systemSessions
                .filter((s) =>
                  !sessionSearchQuery ||
                  matchesSearch(s.name, sessionSearchQuery) ||
                  matchesSearch(s.gitBranch, sessionSearchQuery)
                )
                .map((session) => (
                  <SessionItem key={`system-${session.id}`} session={session} />
                ))}
            </div>
          )}
        </div>
      )}
      </div>
    </>
  );
}
