'use client';

import React from 'react';
import { FilePlus, FolderPlus, RefreshCw, ChevronsDownUp, ChevronsUpDown, Loader2, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileTreeToolbarProps {
  onNewFile: () => void;
  onNewFolder: () => void;
  onRefresh: () => void;
  onToggleExpandCollapse: () => void;
  isAllExpanded: boolean;
  isLoading?: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function FileTreeToolbar({
  onNewFile,
  onNewFolder,
  onRefresh,
  onToggleExpandCollapse,
  isAllExpanded,
  isLoading = false,
  searchQuery,
  onSearchChange,
}: FileTreeToolbarProps) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      {/* Action buttons row */}
      <div className="flex items-center gap-1 p-2">
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

      {/* Search input row */}
      <div className="px-2 pb-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search files..."
            className="w-full pl-8 pr-7 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
