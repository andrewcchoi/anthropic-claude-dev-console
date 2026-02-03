'use client';

import React from 'react';
import { FilePlus, FolderPlus, RefreshCw, ChevronsDownUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileTreeToolbarProps {
  onNewFile: () => void;
  onNewFolder: () => void;
  onRefresh: () => void;
  onCollapseAll: () => void;
}

export function FileTreeToolbar({
  onNewFile,
  onNewFolder,
  onRefresh,
  onCollapseAll,
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
        onClick={onCollapseAll}
        title="Collapse All"
      >
        <ChevronsDownUp className="w-4 h-4" />
      </Button>
    </div>
  );
}
