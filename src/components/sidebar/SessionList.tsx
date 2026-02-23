'use client';

import { useEffect, useState, useMemo } from 'react';
import { useChatStore } from '@/lib/store';
import { useWorkspaceStore } from '@/lib/store/workspaces';
import { formatRelativeTime } from '@/lib/utils/time';

export function SessionList() {
  const [isClient, setIsClient] = useState(false);
  const { sessions, sessionId, switchSession, deleteSession } = useChatStore();
  const { activeWorkspaceId, workspaces } = useWorkspaceStore();

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Get active workspace to check path matching
  const activeWorkspace = activeWorkspaceId ? workspaces.get(activeWorkspaceId) : null;

  // Filter sessions by active workspace (memoized for performance)
  // Include sessions with matching workspaceId OR matching cwd path (for old sessions without workspaceId)
  const workspaceSessions = useMemo(() => {
    if (!activeWorkspace) return [];

    return sessions.filter(s => {
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
  }, [sessions, activeWorkspaceId, activeWorkspace]);

  // Unassigned sessions: no workspaceId AND don't match any workspace's path
  const unassignedSessions = useMemo(() => {
    const allWorkspaces = Array.from(workspaces.values());

    return sessions.filter(s => {
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
  }, [sessions, workspaces]);

  if (!isClient) {
    return <div className="text-sm text-gray-400 dark:text-gray-500">Loading...</div>;
  }

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
          onClick={() => switchSession(session.id)}
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
              onClick={() => switchSession(session.id)}
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
