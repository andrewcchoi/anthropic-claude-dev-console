/**
 * DirectoryBrowser Component
 * Visual directory picker for workspaces
 */

'use client';

import { useState, useEffect } from 'react';
import { X, Folder, ChevronRight, Home } from 'lucide-react';
import { showToast } from '@/lib/utils/toast';

interface DirectoryBrowserProps {
  initialPath?: string;
  onSelect: (path: string) => void;
  onCancel: () => void;
}

interface DirectoryEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

export function DirectoryBrowser({ initialPath = '/workspace', onSelect, onCancel }: DirectoryBrowserProps) {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [directories, setDirectories] = useState<DirectoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  // Fetch directories at current path
  useEffect(() => {
    fetchDirectories(currentPath);
  }, [currentPath]);

  const fetchDirectories = async (path: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/files?path=${encodeURIComponent(path)}`);

      if (!response.ok) {
        throw new Error(`Failed to list directory: ${response.statusText}`);
      }

      const data = await response.json();

      // Check if response has error
      if (data.error) {
        throw new Error(data.error);
      }

      // Filter to only show directories
      const dirs = (data.items || [])
        .filter((entry: any) => entry.type === 'directory')
        .map((entry: any) => ({
          name: entry.name,
          path: entry.path,
          isDirectory: true,
        }))
        .sort((a: DirectoryEntry, b: DirectoryEntry) =>
          a.name.localeCompare(b.name)
        );

      setDirectories(dirs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load directories');
      showToast('Failed to load directories', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const joinPaths = (base: string, ...parts: string[]): string => {
    // Normalize path separators and remove duplicates
    const normalized = [base, ...parts]
      .join('/')
      .replace(/\/+/g, '/')
      .replace(/\/$/, '');

    return normalized || '/';
  };

  const getParentPath = (path: string): string => {
    if (path === '/') return '/';

    const parts = path.split('/').filter(p => p);
    parts.pop();

    return parts.length === 0 ? '/' : '/' + parts.join('/');
  };

  const navigateTo = (path: string) => {
    setCurrentPath(path);
    setSelectedPath(null);
  };

  const goUp = () => {
    // Don't allow navigation above /workspace (container restriction)
    if (currentPath === '/workspace' || currentPath === '/') {
      return;
    }

    const parent = getParentPath(currentPath);

    // Prevent going above /workspace
    if (parent === '/' || !parent.startsWith('/workspace')) {
      return;
    }

    navigateTo(parent);
  };

  const handleSelect = () => {
    if (selectedPath) {
      onSelect(selectedPath);
    }
  };

  // Breadcrumb navigation
  const getBreadcrumbs = () => {
    if (currentPath === '/') {
      return [{ name: 'Root', path: '/' }];
    }

    const parts = currentPath.split('/').filter(p => p);
    const crumbs = [{ name: 'Root', path: '/' }];

    let accPath = '';
    for (const part of parts) {
      accPath += '/' + part;
      crumbs.push({ name: part, path: accPath });
    }

    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Select Directory
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center gap-1 text-sm overflow-x-auto">
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.path} className="flex items-center gap-1">
                {index > 0 && (
                  <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                )}
                <button
                  onClick={() => navigateTo(crumb.path)}
                  className="text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
                >
                  {index === 0 ? (
                    <Home className="h-4 w-4" />
                  ) : (
                    crumb.name
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Directory List */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500 dark:text-gray-400">
                Loading directories...
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-red-600 dark:text-red-400 text-center">
                <p className="font-medium mb-1">Error loading directories</p>
                <p className="text-sm">{error}</p>
                <button
                  onClick={() => fetchDirectories(currentPath)}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Parent directory button - only show if not at workspace root */}
              {currentPath !== '/' && currentPath !== '/workspace' && (
                <button
                  onClick={goUp}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-left transition-colors"
                >
                  <Folder className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">..</span>
                  <span className="text-xs text-gray-500 dark:text-gray-500 ml-auto">
                    Parent directory
                  </span>
                </button>
              )}

              {/* Directory list */}
              {directories.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No subdirectories found
                </div>
              ) : (
                directories.map((dir) => (
                  <button
                    key={dir.path}
                    onClick={() => setSelectedPath(dir.path)}
                    onDoubleClick={() => navigateTo(dir.path)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      selectedPath === dir.path
                        ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent'
                    }`}
                  >
                    <Folder className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                    <span className="flex-1 text-gray-900 dark:text-gray-100">
                      {dir.name}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      Double-click to open
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0 text-sm text-gray-600 dark:text-gray-400">
            {selectedPath ? (
              <div>
                <span className="font-medium">Selected:</span>{' '}
                <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  {selectedPath}
                </code>
              </div>
            ) : (
              <span>Select a directory or double-click to navigate</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSelect}
              disabled={!selectedPath}
              className="px-4 py-2 rounded-lg bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Select
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
