'use client';

import { useEffect, useState, useMemo } from 'react';
import { useChatStore } from '@/lib/store';
import { useSessionDiscoveryStore } from '@/lib/store/sessions';
import { useWorkspaceStore } from '@/lib/store/workspaces';
import { formatRelativeTime } from '@/lib/utils/time';
import { Session } from '@/types/claude';
import { CLISession } from '@/types/sessions';
import { getProjectIdFromWorkspace, encodeProjectPath } from '@/lib/utils/projectPath';
import { logDiagnosticError, diagnosticAssert } from '@/lib/logger/diagnostic';
import { createLogger } from '@/lib/logger';

const log = createLogger('SessionList');

export function SessionList() {
  const [isClient, setIsClient] = useState(false);
  const { sessions: uiSessions, sessionId, switchSession, deleteSession, hiddenSessionIds } = useChatStore();
  const { sessions: cliSessions } = useSessionDiscoveryStore();
  const { activeWorkspaceId, workspaces, setActiveWorkspace } = useWorkspaceStore();

  // Debug logging (enable with enableDebug() in console)
  log.debug('SessionList render', {
    activeWorkspaceId,
    totalWorkspaces: workspaces.size,
    uiSessions: uiSessions.length,
    cliSessions: cliSessions.length,
  });

  // Combine UI sessions and CLI discovered sessions
  // Convert CLI sessions to Session format
  const allSessions = useMemo(() => {
    const combined: Session[] = [
      // UI sessions (excluding hidden)
      ...uiSessions.filter(s => !hiddenSessionIds.has(s.id)),
      // CLI sessions (excluding system sessions)
      ...cliSessions
        .filter(s => !s.isSystem)
        .map((cli: CLISession): Session => ({
          id: cli.id,
          name: cli.name || 'Untitled Session',
          created_at: cli.createdAt,
          updated_at: cli.modifiedAt,
          cwd: cli.cwd || '',
          workspaceId: cli.projectId, // Map projectId to workspaceId
          messageCount: cli.messageCount, // Preserve message count
          gitBranch: cli.gitBranch,       // Preserve git branch
        })),
    ];

    // Deduplicate by ID (prefer UI sessions over CLI sessions)
    const seen = new Set<string>();
    return combined.filter(s => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
  }, [uiSessions, cliSessions, hiddenSessionIds]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Get active workspace to check path matching
  const activeWorkspace = activeWorkspaceId ? workspaces.get(activeWorkspaceId) : null;

  // Build session index once per render (O(n) complexity instead of O(n²))
  // Maps workspace ID → array of sessions matching that workspace
  const sessionsByWorkspace = useMemo(() => {
    const map = new Map<string, Session[]>();
    const workspaceArray = Array.from(workspaces.values());

    // For each session, determine which workspace(s) it belongs to
    for (const session of allSessions) {
      for (const workspace of workspaceArray) {
        if (!workspace.rootPath) continue;

        // Get encoded project path for this workspace (e.g., "/workspace" → "-workspace")
        const projectId = encodeProjectPath(workspace.rootPath);

        // Check if session matches this workspace using same logic as before
        let matches = false;

        // Match by encoded project path (CLI uses this format)
        if (session.workspaceId === projectId) {
          matches = true;
        }

        // Also match if session's workspaceId starts with workspace's project path
        // e.g., "-workspace-docs" matches "-workspace" (subdirectory sessions)
        if (!matches && session.workspaceId) {
          if (session.workspaceId.startsWith(projectId + '-') ||
              session.workspaceId.startsWith(projectId)) {
            matches = true;
          }
        }

        // Path-based matching for old sessions without workspaceId
        if (!matches && !session.workspaceId && session.cwd && workspace.rootPath) {
          const normalizedCwd = session.cwd.replace(/\/$/, '');
          const normalizedRoot = workspace.rootPath.replace(/\/$/, '');
          if (normalizedCwd === normalizedRoot ||
              normalizedCwd.startsWith(normalizedRoot + '/')) {
            matches = true;
          }
        }

        if (matches) {
          if (!map.has(workspace.id)) {
            map.set(workspace.id, []);
          }
          map.get(workspace.id)!.push(session);
        }
      }
    }

    return map;
  }, [allSessions, workspaces]);

  // Helper function to get sessions for a specific workspace (now O(1) lookup)
  const getSessionsForWorkspace = (workspaceId: string) => {
    return sessionsByWorkspace.get(workspaceId) || [];
  };

  // Handle session click in overview mode (opens workspace tab)
  const handleSessionClickInOverview = (session: Session, workspaceId: string) => {
    // DIAGNOSTIC: Validate inputs to catch type mismatches early
    diagnosticAssert(
      typeof workspaceId === 'string' && workspaceId.length > 0,
      'SessionList',
      'TYPE_MISMATCH',
      'handleSessionClickInOverview: workspaceId is invalid',
      {
        component: 'SessionList',
        action: 'handleSessionClickInOverview',
        expected: 'non-empty string (workspace UUID)',
        actual: workspaceId,
        session: { id: session.id, workspaceId: session.workspaceId },
      }
    );

    setActiveWorkspace(workspaceId); // Open the workspace tab

    const projectId = getProjectIdFromWorkspace(session.workspaceId, workspaces);

    // DIAGNOSTIC: Log if projectId conversion failed
    if (!projectId) {
      logDiagnosticError('SessionList', 'NOT_FOUND', 'Failed to get projectId from workspace', {
        component: 'SessionList',
        action: 'handleSessionClickInOverview',
        sessionWorkspaceId: session.workspaceId,
        availableWorkspaces: Array.from(workspaces.keys()),
        hint: 'Session workspaceId should be a workspace UUID, not an encoded path',
      });
    }

    log.debug('Switching session', {
      sessionId: session.id,
      projectId,
      workspaceId,
    });

    switchSession(session.id, projectId); // Switch to the session
  };

  // Filter sessions by active workspace (memoized for performance)
  const workspaceSessions = useMemo(() => {
    // No workspace selected - show all (backwards compat)
    if (!activeWorkspace) {
      return allSessions;
    }

    // Filter by workspace - handle both CLI and UI sessions
    return allSessions.filter(s => {
      // CLISession has projectId (encoded path like "-workspace")
      if ('projectId' in s && s.projectId) {
        return s.projectId === activeWorkspace.projectId;
      }

      // UI Session has workspaceId - could be:
      // 1. Workspace UUID (new sessions created in UI)
      // 2. Encoded path (legacy or CLI-discovered)
      if (s.workspaceId) {
        // Match by workspace UUID (UI sessions store this)
        if (s.workspaceId === activeWorkspace.id) {
          return true;
        }

        // Match by projectId (encoded path)
        if (s.workspaceId === activeWorkspace.projectId) {
          return true;
        }
      }

      return false;
    });
  }, [allSessions, activeWorkspace]);

  // Unassigned sessions: don't match any workspace's encoded project path
  const unassignedSessions = useMemo(() => {
    const allWorkspaces = Array.from(workspaces.values());

    return allSessions.filter(s => {
      // Check if session's workspaceId matches any workspace's encoded project path
      if (s.workspaceId) {
        for (const workspace of allWorkspaces) {
          if (!workspace.rootPath) continue;
          const projectId = encodeProjectPath(workspace.rootPath);
          // Match exact or subdirectory
          if (s.workspaceId === projectId || s.workspaceId.startsWith(projectId + '-') || s.workspaceId.startsWith(projectId)) {
            return false; // Matches a workspace, not unassigned
          }
        }
      }

      // Check if it matches any workspace's path (for sessions without workspaceId)
      if (!s.workspaceId && s.cwd) {
        const normalizedCwd = s.cwd.replace(/\/$/, '');

        for (const workspace of allWorkspaces) {
          if (!workspace.rootPath) continue;

          const normalizedRoot = workspace.rootPath.replace(/\/$/, '');
          if (normalizedCwd === normalizedRoot || normalizedCwd.startsWith(normalizedRoot + '/')) {
            return false; // Matches a workspace, not unassigned
          }
        }
      }

      return true; // Doesn't match any workspace
    });
  }, [allSessions, workspaces]);

  if (!isClient) {
    return <div className="text-sm text-gray-400 dark:text-gray-500">Loading...</div>;
  }

  // ========================================================================
  // OVERVIEW MODE: Show all workspaces when no workspace is active
  // ========================================================================
  if (!activeWorkspaceId) {
    const workspaceArray = Array.from(workspaces.values());

    // Group sessions by workspace
    const workspaceSessionGroups = workspaceArray.map(workspace => ({
      workspace,
      sessions: getSessionsForWorkspace(workspace.id)
        .sort((a, b) => b.updated_at - a.updated_at),
    })).filter(group => group.sessions.length > 0); // Only show workspaces with sessions

    const sortedUnassigned = [...unassignedSessions].sort((a, b) => b.updated_at - a.updated_at);

    if (workspaceSessionGroups.length === 0 && sortedUnassigned.length === 0) {
      return (
        <div className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
          No sessions yet
          <div className="text-xs mt-2">Create a new chat to get started</div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Show each workspace as a section */}
        {workspaceSessionGroups.map(({ workspace, sessions: wsSessions }) => (
          <div key={workspace.id}>
            {/* Workspace header */}
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 px-3 py-2 border-t border-gray-200 dark:border-gray-700 first:border-t-0">
              {workspace.name}
            </div>

            {/* Sessions in this workspace */}
            <div className="space-y-1">
              {wsSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => handleSessionClickInOverview(session, workspace.id)}
                  className={`p-2 rounded cursor-pointer text-sm truncate ${
                    session.id === sessionId
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="truncate">{session.name}</div>
                  {session.gitBranch && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 3v12M18 9a3 3 0 01-3 3h-6" />
                      </svg>
                      <span className="truncate">{session.gitBranch}</span>
                    </div>
                  )}
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex justify-between mt-1">
                    <span>
                      {session.messageCount !== undefined && (
                        <>
                          {session.messageCount} msg{session.messageCount !== 1 ? 's' : ''}
                          <span className="mx-1">·</span>
                        </>
                      )}
                      {formatRelativeTime(session.updated_at)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(session.id);
                      }}
                      className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Unassigned sessions */}
        {sortedUnassigned.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 px-3 py-2 border-t border-gray-200 dark:border-gray-700">
              Unassigned
            </div>
            <div className="space-y-1">
              {sortedUnassigned.map((session) => (
                <div
                  key={session.id}
                  onClick={() => {
                    const projectId = getProjectIdFromWorkspace(session.workspaceId, workspaces);
                    switchSession(session.id, projectId);
                  }}
                  className={`p-2 rounded cursor-pointer text-sm truncate ${
                    session.id === sessionId
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="truncate">{session.name}</div>
                  {session.gitBranch && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 3v12M18 9a3 3 0 01-3 3h-6" />
                      </svg>
                      <span className="truncate">{session.gitBranch}</span>
                    </div>
                  )}
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex justify-between mt-1">
                    <span>
                      {session.messageCount !== undefined && (
                        <>
                          {session.messageCount} msg{session.messageCount !== 1 ? 's' : ''}
                          <span className="mx-1">·</span>
                        </>
                      )}
                      {formatRelativeTime(session.updated_at)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(session.id);
                      }}
                      className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ========================================================================
  // FILTERED MODE: Show only sessions for active workspace
  // ========================================================================
  const sortedWorkspace = [...workspaceSessions].sort((a, b) => b.updated_at - a.updated_at);
  const sortedUnassigned = [...unassignedSessions].sort((a, b) => b.updated_at - a.updated_at);

  // Debug logging for session filtering (enable with enableDebug() in console)
  log.debug('Session filtering result', {
    activeWorkspaceId,
    activeProjectId: activeWorkspace ? encodeProjectPath(activeWorkspace.rootPath) : null,
    workspaceSessionCount: workspaceSessions.length,
    unassignedSessionCount: unassignedSessions.length,
    totalSessions: allSessions.length,
  });

  // DIAGNOSTIC: Log if no sessions found when we expect some
  if (workspaceSessions.length === 0 && allSessions.length > 0 && activeWorkspace) {
    log.warn('No sessions matched workspace filter', {
      activeWorkspaceId,
      activeRootPath: activeWorkspace.rootPath,
      encodedProjectId: encodeProjectPath(activeWorkspace.rootPath),
      sampleSessionWorkspaceIds: allSessions.slice(0, 5).map(s => s.workspaceId),
      hint: 'Check if session.workspaceId format matches encoded workspace path',
    });
  }

  if (sortedWorkspace.length === 0 && sortedUnassigned.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
        No sessions in this workspace
        <div className="text-xs mt-2">Create a new chat to get started</div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Workspace sessions */}
      {sortedWorkspace.map((session) => (
        <div
          key={session.id}
          onClick={() => {
            const projectId = getProjectIdFromWorkspace(session.workspaceId, workspaces);
            switchSession(session.id, projectId);
          }}
          className={`p-2 rounded cursor-pointer text-sm truncate ${
            session.id === sessionId
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
          }`}
        >
          <div className="truncate">{session.name}</div>
          {session.gitBranch && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 3v12M18 9a3 3 0 01-3 3h-6" />
              </svg>
              <span className="truncate">{session.gitBranch}</span>
            </div>
          )}
          <div className="text-xs text-gray-500 dark:text-gray-400 flex justify-between mt-1">
            <span>
              {session.messageCount !== undefined && (
                <>
                  {session.messageCount} msg{session.messageCount !== 1 ? 's' : ''}
                  <span className="mx-1">·</span>
                </>
              )}
              {formatRelativeTime(session.updated_at)}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteSession(session.id);
              }}
              className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

