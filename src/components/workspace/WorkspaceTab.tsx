/**
 * WorkspaceTab Component
 * Individual tab for workspace tab bar
 */

'use client';

import { useState } from 'react';
import type { Workspace } from '@/lib/workspace/types';

interface WorkspaceTabProps {
  workspace: Workspace;
  isActive: boolean;
  onClick: () => void;
  onClose: () => void;
}

export function WorkspaceTab({ workspace, isActive, onClick, onClose }: WorkspaceTabProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getStatusColor = () => {
    // For local workspaces, always show as "connected"
    if (workspace.providerType === 'local') {
      return 'bg-green-500';
    }
    // For other types, would show actual connection status
    return 'bg-gray-400';
  };

  const getProviderIcon = () => {
    switch (workspace.providerType) {
      case 'local':
        return '📁';
      case 'git':
        return '🔀';
      case 'ssh':
        return '🔐';
      default:
        return '📂';
    }
  };

  return (
    <div
      className={`
        group relative px-3 py-2 flex items-center gap-2 cursor-pointer
        border-r border-gray-200 dark:border-gray-700
        transition-colors min-w-[120px] max-w-[200px]
        ${isActive
          ? 'bg-white dark:bg-gray-800 border-b-2 border-b-blue-500'
          : 'bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800'
        }
      `}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="tab"
      aria-selected={isActive}
      aria-label={`${workspace.name} workspace`}
    >
      {/* Status indicator */}
      <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />

      {/* Provider icon */}
      <span className="text-sm">{getProviderIcon()}</span>

      {/* Workspace name */}
      <span className="text-sm truncate flex-1">
        {workspace.name}
      </span>

      {/* Close button */}
      {(isHovered || isActive) && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="
            w-4 h-4 rounded flex items-center justify-center
            text-gray-400 hover:text-gray-600 dark:hover:text-gray-200
            hover:bg-gray-200 dark:hover:bg-gray-700
            transition-colors
          "
          aria-label="Close workspace"
        >
          ×
        </button>
      )}
    </div>
  );
}
