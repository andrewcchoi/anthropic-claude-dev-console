/**
 * WorkspaceTabBar Component
 * Tab strip for managing multiple workspaces
 */

'use client';

import { WorkspaceTab } from './WorkspaceTab';
import type { Workspace } from '@/lib/workspace/types';

interface WorkspaceTabBarProps {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  onWorkspaceSelect: (id: string) => void;
  onWorkspaceClose: (id: string) => void;
  onAddWorkspace: () => void;
}

export function WorkspaceTabBar({
  workspaces,
  activeWorkspaceId,
  onWorkspaceSelect,
  onWorkspaceClose,
  onAddWorkspace,
}: WorkspaceTabBarProps) {
  return (
    <div className="relative z-40 flex items-center bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      {/* Workspace tabs */}
      <div className="flex items-center flex-1 overflow-x-auto">
        {workspaces.map((workspace) => (
          <WorkspaceTab
            key={workspace.id}
            workspace={workspace}
            isActive={workspace.id === activeWorkspaceId}
            onClick={() => onWorkspaceSelect(workspace.id)}
            onClose={() => onWorkspaceClose(workspace.id)}
          />
        ))}
      </div>

      {/* Add workspace button */}
      <button
        onClick={onAddWorkspace}
        className="
          w-10 h-10 flex items-center justify-center
          text-gray-600 dark:text-gray-400
          hover:text-gray-900 dark:hover:text-gray-100
          hover:bg-gray-100 dark:hover:bg-gray-800
          border-l border-gray-200 dark:border-gray-700
          transition-colors
        "
        aria-label="Add workspace"
        title="Add workspace"
      >
        <span className="text-xl">+</span>
      </button>
    </div>
  );
}
