// src/components/sidebar/WorkspacesSection.tsx
'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { SessionItem } from './SessionItem';
import type { CLISession } from '@/types/sessions';
import { createLogger } from '@/lib/logger';
import { useChatStore } from '@/lib/store';
import { useWorkspaceStore } from '@/lib/store/workspaces';
import { useSessionDiscoveryStore } from '@/lib/store/sessions';
import { WorkspaceContextMenu, WORKSPACE_CONTEXT_ITEMS, type ContextMenuItem } from '@/components/ui/WorkspaceContextMenu';
import { showToast } from '@/lib/utils/toast';

const log = createLogger('WorkspacesSection');

interface WorkspacesSectionProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function WorkspacesSection({
  isCollapsed,
  onToggle,
}: WorkspacesSectionProps) {
  const { workspaces, archiveWorkspace, removeWorkspace } = useWorkspaceStore();
  const { collapsedProjects, toggleProjectCollapse, setWorkspaceDialogOpen } = useChatStore();
  const { sessions: cliSessions } = useSessionDiscoveryStore();

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
  } | null>(null);

  // Convert workspaces Map to array and sort: pinned (groot) first, then by name
  const sortedWorkspaces = Array.from(workspaces.values()).sort((a, b) => {
    // Pinned workspace (groot) always first
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    // Otherwise sort by name
    return a.name.localeCompare(b.name);
  });

  // Count total sessions across all workspaces
  const totalSessions = cliSessions.filter(s => !s.isSystem && s.projectId).length;

  log.debug('WorkspacesSection render', {
    workspaceCount: sortedWorkspaces.length,
    totalSessions,
    isCollapsed,
  });

  return (
    <section
      className="mt-2"
      aria-label="Workspaces"
      role="region"
    >
      {/* Section Header */}
      <button
        onClick={() => {
          log.debug('Workspaces section toggled', { wasCollapsed: isCollapsed });
          onToggle();
        }}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg
                   bg-purple-50 dark:bg-purple-950/20
                   text-purple-900 dark:text-purple-100
                   hover:bg-purple-100 dark:hover:bg-purple-950/30
                   focus:ring-2 focus:ring-purple-500/50 focus:outline-none
                   transition-colors"
        aria-expanded={!isCollapsed}
        aria-controls="workspaces"
      >
        <div className="flex items-center gap-2">
          <ChevronRight
            className={`w-4 h-4 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
          />
          <span className="text-sm font-medium">
            📁 Workspaces ({sortedWorkspaces.length})
          </span>
        </div>
      </button>

      {/* Workspace List */}
      {!isCollapsed && (
        <div
          id="workspaces"
          className="ml-6 mt-1 space-y-2"
        >
          {sortedWorkspaces.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
              No workspaces
            </div>
          ) : (
            sortedWorkspaces.map((workspace) => {
              const workspaceSessions = cliSessions.filter(
                s => !s.isSystem && s.projectId === workspace.projectId
              );
              const isWorkspaceCollapsed = collapsedProjects.has(workspace.id);

              return (
                <div key={workspace.id} className="space-y-1">
                  {/* Workspace Header */}
                  <button
                    onClick={() => {
                      log.debug('Workspace toggled', {
                        workspaceId: workspace.id,
                        workspaceName: workspace.name,
                        wasCollapsed: isWorkspaceCollapsed,
                      });
                      toggleProjectCollapse(workspace.id);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      log.debug('Workspace context menu opened', {
                        workspaceId: workspace.id,
                        workspaceName: workspace.name,
                        isPinned: workspace.isPinned,
                      });

                      setContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        items: [
                          WORKSPACE_CONTEXT_ITEMS.newWorkspace(() => {
                            log.debug('New workspace from context menu');
                            setWorkspaceDialogOpen(true);
                          }),
                          WORKSPACE_CONTEXT_ITEMS.archive(() => {
                            log.debug('Archive workspace', { workspaceId: workspace.id });
                            archiveWorkspace(workspace.id);
                          }, workspace.isPinned), // Disable if pinned
                          WORKSPACE_CONTEXT_ITEMS.delete(() => {
                            log.debug('Delete workspace', { workspaceId: workspace.id });
                            if (confirm(`Delete workspace "${workspace.name}"? This cannot be undone.`)) {
                              removeWorkspace(workspace.id);
                              showToast('Workspace deleted', 'success');
                            }
                          }, workspace.isPinned), // Disable if pinned
                        ],
                      });
                    }}
                    className="w-full flex items-center justify-between px-3 py-1.5 rounded
                               text-sm
                               hover:bg-gray-100 dark:hover:bg-gray-800
                               focus:ring-2 focus:ring-gray-500/50 focus:outline-none
                               transition-colors"
                    aria-expanded={!isWorkspaceCollapsed}
                    aria-controls={`workspace-${workspace.id}`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <ChevronRight
                        className={`w-3 h-3 flex-shrink-0 transition-transform ${isWorkspaceCollapsed ? '' : 'rotate-90'}`}
                      />
                      <span className="font-medium truncate">
                        {workspace.name}
                      </span>
                      {workspace.isPinned && (
                        <span className="text-xs flex-shrink-0" title="Pinned workspace">📌</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                      {workspaceSessions.length}
                    </span>
                  </button>

                  {/* Workspace Sessions */}
                  {!isWorkspaceCollapsed && (
                    <div
                      id={`workspace-${workspace.id}`}
                      className="ml-5 space-y-1"
                    >
                      {workspaceSessions.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                          No sessions
                        </div>
                      ) : (
                        workspaceSessions.map((session) => (
                          <SessionItem
                            key={session.id}
                            session={session}
                            sectionType="home"
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <WorkspaceContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}
    </section>
  );
}
