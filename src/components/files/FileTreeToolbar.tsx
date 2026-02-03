'use client';

import React from 'react';
import { FilePlus, FolderPlus, RefreshCw, ChevronsDownUp, ChevronsUpDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileTreeToolbarProps {
  onNewFile: () => void;
  onNewFolder: () => void;
  onRefresh: () => void;
  onToggleExpandCollapse: () => void;
  isAllExpanded: boolean;
  isLoading?: boolean;
}

export function FileTreeToolbar({
  onNewFile,
  onNewFolder,
  onRefresh,
  onToggleExpandCollapse,
  isAllExpanded,
  isLoading = false,
}: FileTreeToolbarProps) {
  return (
    <div className="flex items-center gap-1 p-2 border-b border-gray-200 dark:border-gray-700">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={onNewFile}
        title="New File"
      >
        <FilePlus className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={onNewFolder}
        title="New Folder"
      >
        <FolderPlus className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={onRefresh}
        title="Refresh"
      >
        <RefreshCw className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={onToggleExpandCollapse}
        title={isAllExpanded ? "Collapse All" : "Expand All"}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isAllExpanded ? (
          <ChevronsDownUp className="w-4 h-4" />
        ) : (
          <ChevronsUpDown className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
}
