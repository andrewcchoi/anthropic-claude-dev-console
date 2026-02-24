'use client';

import { useEffect, useState, useMemo } from 'react';
import { useChatStore } from '@/lib/store';
import { useSessionDiscoveryStore } from '@/lib/store/sessions';
import { useWorkspaceStore } from '@/lib/store/workspaces';
import { formatRelativeTime } from '@/lib/utils/time';
import { Session } from '@/types/claude';
import { CLISession } from '@/types/sessions';
import { getProjectIdFromWorkspace } from '@/lib/utils/projectPath';

export function SessionList() {
  const [isClient, setIsClient] = useState(false);
  const { sessions: uiSessions, sessionId, switchSession, deleteSession, hiddenSessionIds } = useChatStore();
  const { sessions: cliSessions } = useSessionDiscoveryStore();
  const { activeWorkspaceId, workspaces, setActiveWorkspace } = useWorkspaceStore();

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

  // Helper function to get sessions for a specific workspace
  const getSessionsForWorkspace = (workspaceId: string) => {
    const workspace = workspaces.get(workspaceId);
    if (!workspace) return [];

    return allSessions.filter(s => {
      // Explicit workspace link (preferred)
      if (s.workspaceId === workspaceId) return true;

      // Path-based matching for old sessions without workspaceId
      if (!s.workspaceId && s.cwd && workspace.rootPath) {
        const normalizedCwd = s.cwd.replace(/\/$/, '');
        const normalizedRoot = workspace.rootPath.replace(/\/$/, '');
        return normalizedCwd === normalizedRoot ||
               normalizedCwd.startsWith(normalizedRoot + '/');
      }

      return false;
    });
  };

  // Handle session click in overview mode (opens workspace tab)
  const handleSessionClickInOverview = (session: Session, workspaceId: string) => {
    setActiveWorkspace(workspaceId); // Open the workspace tab
    const projectId = getProjectIdFromWorkspace(session.workspaceId, workspaces);
    switchSession(session.id, projectId); // Switch to the session
  };

  // Filter sessions by active workspace (memoized for performance)
  // Include sessions with matching workspaceId OR matching cwd path (for old sessions without workspaceId)
  const workspaceSessions = useMemo(() => {
    if (!activeWorkspace) return [];

    return allSessions.filter(s => {
      // Explicit workspace link (preferred)
      if (s.workspaceId === activeWorkspaceId) return true;

      // Path-based matching for old sessions without workspaceId
      // Match if session's cwd is within workspace's rootPath
      if (!s.workspaceId && s.cwd && activeWorkspace.rootPath) {
        // Normalize paths for comparison (remove trailing slashes)
        const normalizedCwd = s.cwd.replace(/\/$/, '');
        const normalizedRoot = activeWorkspace.rootPath.replace(/\/$/, '');

        // Exact match or subdirectory
        return normalizedCwd === normalizedRoot ||
               normalizedCwd.startsWith(normalizedRoot + '/');
      }

      return false;
    });
  }, [allSessions, activeWorkspaceId, activeWorkspace]);

  // Unassigned sessions: no workspaceId AND don't match any workspace's path
  const unassignedSessions = useMemo(() => {
    const allWorkspaces = Array.from(workspaces.values());

    return allSessions.filter(s => {
      // Already has a workspace link
      if (s.workspaceId) return false;

      // Check if it matches any workspace's path
      if (s.cwd) {
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
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex justify-between mt-1">
                    <span>{formatRelativeTime(session.updated_at)}</span>
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
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex justify-between mt-1">
                    <span>{formatRelativeTime(session.updated_at)}</span>
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
          <div className="text-xs text-gray-500 dark:text-gray-400 flex justify-between mt-1">
            <span>{formatRelativeTime(session.updated_at)}</span>
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

      {/* Unassigned sessions (show only if not empty) */}
      {sortedUnassigned.length > 0 && (
        <>
          <div className="text-xs text-gray-500 dark:text-gray-400 px-3 py-2 mt-4 border-t border-gray-200 dark:border-gray-700">
            Unassigned
          </div>
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
              <div className="text-xs text-gray-500 dark:text-gray-400 flex justify-between mt-1">
                <span>{formatRelativeTime(session.updated_at)}</span>
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
        </>
      )}
    </div>
  );
}
