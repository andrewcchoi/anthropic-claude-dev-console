'use client';

import React from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from 'lucide-react';
import { FileTreeItemProps } from './types';
import { cn } from '@/lib/utils';

export function FileTreeItem({
  item,
  level,
  isExpanded,
  isSelected,
  gitStatus,
  activityType,
  onToggle,
  onSelect,
  onContextMenu,
}: FileTreeItemProps) {
  const isDirectory = item.type === 'directory';
  const isModified = gitStatus.modified.includes(item.path);
  const isUntracked = gitStatus.untracked.includes(item.path);
  const isIgnored = gitStatus.ignored.includes(item.path);

  const handleClick = () => {
    if (isDirectory) {
      onToggle();
    } else {
      onSelect();
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none',
        isSelected && 'bg-blue-50 dark:bg-blue-900/20',
        activityType === 'read' && 'bg-blue-50/50 dark:bg-blue-900/10',
        activityType === 'modified' && 'bg-purple-50/50 dark:bg-purple-900/10',
        isIgnored && 'opacity-50'
      )}
      style={{ paddingLeft: `${level * 12 + 8}px` }}
      onClick={handleClick}
      onContextMenu={(e) => onContextMenu(e, item)}
    >
      {/* Expand/collapse chevron for directories */}
      {isDirectory && (
        <div className="w-4 h-4 flex items-center justify-center">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
        </div>
      )}
      {!isDirectory && <div className="w-4" />}

      {/* File/folder icon */}
      <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
        {isDirectory ? (
          isExpanded ? (
            <FolderOpen className="w-4 h-4 text-blue-500" />
          ) : (
            <Folder className="w-4 h-4 text-blue-500" />
          )
        ) : (
          <File className="w-4 h-4 text-gray-500" />
        )}
      </div>

      {/* File name */}
      <span className="text-sm truncate flex-1">{item.name}</span>

      {/* Git status indicator */}
      {isModified && (
        <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" title="Modified" />
      )}
      {isUntracked && (
        <div className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0" title="Untracked" />
      )}
    </div>
  );
}
