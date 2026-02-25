/**
 * WorkspaceSwitcher Component
 * Quick picker for switching between workspaces
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { Workspace } from '@/lib/workspace/types';

interface WorkspaceSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  onSelect: (id: string) => void;
}

export function WorkspaceSwitcher({
  isOpen,
  onClose,
  workspaces,
  activeWorkspaceId,
  onSelect,
}: WorkspaceSwitcherProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter workspaces by search
  const filteredWorkspaces = workspaces.filter((ws) =>
    ws.name.toLowerCase().includes(search.toLowerCase())
  );

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setSearch('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < filteredWorkspaces.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredWorkspaces[selectedIndex];
      if (selected) {
        onSelect(selected.id);
        onClose();
      }
    }
  };

  const getProviderIcon = (providerType: string) => {
    switch (providerType) {
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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-2 p-4 border-b border-gray-200 dark:border-gray-700">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search workspaces..."
            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Workspace list */}
        <div className="max-h-96 overflow-y-auto">
          {filteredWorkspaces.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No workspaces found
            </div>
          ) : (
            filteredWorkspaces.map((workspace, index) => (
              <button
                key={workspace.id}
                onClick={() => {
                  onSelect(workspace.id);
                  onClose();
                }}
                className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${
                  index === selectedIndex
                    ? 'bg-blue-50 dark:bg-blue-900/30'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                } ${
                  workspace.id === activeWorkspaceId
                    ? 'border-l-4 border-l-blue-500'
                    : 'border-l-4 border-l-transparent'
                }`}
              >
                {/* Provider icon */}
                <span className="text-xl">{getProviderIcon(workspace.providerType)}</span>

                {/* Workspace info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {workspace.name}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {workspace.rootPath}
                  </div>
                </div>

                {/* Active indicator */}
                {workspace.id === activeWorkspaceId && (
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    Active
                  </span>
                )}

                {/* Keyboard hint */}
                {index < 9 && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                    Ctrl+Shift+{index + 1}
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center justify-between">
            <span>↑↓ Navigate • Enter Select • Esc Close</span>
            <span className="text-gray-400 dark:text-gray-500">
              Ctrl+Shift+P to open
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
