'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useChatStore } from '@/lib/store';
import { FileTreeItem } from './FileTreeItem';
import { FileTreeToolbar } from './FileTreeToolbar';
import { FileContextMenu } from './FileContextMenu';
import { FileItem, GitStatus } from './types';
import { createLogger } from '@/lib/logger';

const log = createLogger('FileTree');

const WORKSPACE_ROOT = '/workspace';
const DEFAULT_EXPAND_DEPTH = 2;

export function FileTree() {
  const [directoryContents, setDirectoryContents] = useState<Map<string, FileItem[]>>(new Map());
  const [gitStatus, setGitStatus] = useState<GitStatus>({
    isGitRepo: false,
    modified: [],
    untracked: [],
    ignored: [],
  });
  const [loading, setLoading] = useState(false);
  const [loadingDirs, setLoadingDirs] = useState<Set<string>>(new Set());
  const [isExpandingAll, setIsExpandingAll] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    position: { x: number; y: number };
    item: FileItem;
  } | null>(null);

  const {
    expandedFolders,
    selectedFile,
    fileActivity,
    toggleFolder,
    selectFile,
    setPreviewOpen,
    clearExpandedFolders,
    expandFolders,
  } = useChatStore();

  const loadDirectory = useCallback(async (path: string, force: boolean = false) => {
    // Get current directoryContents from state
    setDirectoryContents((currentContents) => {
      // Skip if already loaded (unless forced)
      if (!force && currentContents.has(path)) return currentContents;

      // Start loading
      setLoadingDirs((prev) => new Set(prev).add(path));

      // Perform async load
      (async () => {
        try {
          const response = await fetch(`/api/files?path=${encodeURIComponent(path)}`);
          if (response.ok) {
            const data = await response.json();
            setDirectoryContents((prev) => {
              const newMap = new Map(prev);
              newMap.set(path, data.items || []);
              return newMap;
            });
          } else {
            log.error('Failed to load directory', { path, status: response.status });
          }
        } catch (error) {
          log.error('Error loading directory', { path, error });
        } finally {
          setLoadingDirs((prev) => {
            const newSet = new Set(prev);
            newSet.delete(path);
            return newSet;
          });
        }
      })();

      return currentContents;
    });
  }, []);

  // Promise-based version of loadDirectory for use in async/await flows
  const loadDirectoryAsync = useCallback(async (path: string, force: boolean = false): Promise<void> => {
    return new Promise((resolve) => {
      setDirectoryContents((currentContents) => {
        if (!force && currentContents.has(path)) {
          resolve();
          return currentContents;
        }

        setLoadingDirs((prev) => new Set(prev).add(path));

        (async () => {
          try {
            const response = await fetch(`/api/files?path=${encodeURIComponent(path)}`);
            if (response.ok) {
              const data = await response.json();
              setDirectoryContents((prev) => {
                const newMap = new Map(prev);
                newMap.set(path, data.items || []);
                return newMap;
              });
            } else {
              log.error('Failed to load directory', { path, status: response.status });
            }
          } catch (error) {
            log.error('Error loading directory', { path, error });
          } finally {
            setLoadingDirs((prev) => {
              const newSet = new Set(prev);
              newSet.delete(path);
              return newSet;
            });
            resolve();
          }
        })();

        return currentContents;
      });
    });
  }, []);

  const loadGitStatus = useCallback(async (path: string = WORKSPACE_ROOT) => {
    try {
      const response = await fetch(`/api/files/git-status?path=${encodeURIComponent(path)}`);
      if (response.ok) {
        const data = await response.json();
        setGitStatus(data);
      }
    } catch (error) {
      log.error('Error loading git status', { path, error });
    }
  }, []);

  useEffect(() => {
    loadDirectory(WORKSPACE_ROOT);
    loadGitStatus();
  }, []);

  const handleContextMenu = (e: React.MouseEvent, item: FileItem) => {
    e.preventDefault();
    setContextMenu({ position: { x: e.clientX, y: e.clientY }, item });
  };

  const handleNewFile = async (parentPath: string) => {
    const fileName = prompt('Enter file name:');
    if (!fileName) return;

    const filePath = `${parentPath}/${fileName}`;
    try {
      const response = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath, type: 'file', content: '' }),
      });

      if (response.ok) {
        refreshDirectory(parentPath);
        loadGitStatus();
      } else {
        const data = await response.json();
        alert(`Failed to create file: ${data.error}`);
      }
    } catch (error) {
      log.error('Error creating file', { filePath, error });
      alert('Failed to create file');
    }
  };

  const handleNewFolder = async (parentPath: string) => {
    const folderName = prompt('Enter folder name:');
    if (!folderName) return;

    const folderPath = `${parentPath}/${folderName}`;
    try {
      const response = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: folderPath, type: 'directory' }),
      });

      if (response.ok) {
        refreshDirectory(parentPath);
      } else {
        const data = await response.json();
        alert(`Failed to create folder: ${data.error}`);
      }
    } catch (error) {
      log.error('Error creating folder', { folderPath, error });
      alert('Failed to create folder');
    }
  };

  const handleRename = async (item: FileItem) => {
    const newName = prompt('Enter new name:', item.name);
    if (!newName || newName === item.name) return;

    const newPath = item.path.replace(/[^/]+$/, newName);
    const parentPath = item.path.substring(0, item.path.lastIndexOf('/'));

    try {
      const response = await fetch(`/api/files/${encodeURIComponent(item.path.replace(WORKSPACE_ROOT + '/', ''))}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPath }),
      });

      if (response.ok) {
        refreshDirectory(parentPath);
        loadGitStatus();
      } else {
        const data = await response.json();
        alert(`Failed to rename: ${data.error}`);
      }
    } catch (error) {
      log.error('Error renaming', { item, newPath, error });
      alert('Failed to rename');
    }
  };

  const handleDelete = async (item: FileItem) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;

    const parentPath = item.path.substring(0, item.path.lastIndexOf('/'));

    try {
      const response = await fetch(`/api/files/${encodeURIComponent(item.path.replace(WORKSPACE_ROOT + '/', ''))}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        refreshDirectory(parentPath);
        loadGitStatus();
        if (selectedFile === item.path) {
          selectFile(null);
          setPreviewOpen(false);
        }
      } else {
        const data = await response.json();
        alert(`Failed to delete: ${data.error}`);
      }
    } catch (error) {
      log.error('Error deleting', { item, error });
      alert('Failed to delete');
    }
  };

  const handleFileSelect = (item: FileItem) => {
    selectFile(item.path);
    setPreviewOpen(true);
  };

  const handleToggleFolder = (item: FileItem) => {
    const isExpanded = expandedFolders.has(item.path);
    toggleFolder(item.path);

    // Load directory contents if expanding and not already loaded
    if (!isExpanded && !directoryContents.has(item.path)) {
      loadDirectory(item.path);
    }
  };

  // Helper to get all directory paths from directoryContents
  const getAllDirectoryPaths = useCallback((): string[] => {
    const paths: string[] = [];
    const collectPaths = (items: FileItem[]) => {
      items.forEach((item) => {
        if (item.type === 'directory') {
          paths.push(item.path);
          const children = directoryContents.get(item.path);
          if (children) {
            collectPaths(children);
          }
        }
      });
    };
    const rootItems = directoryContents.get(WORKSPACE_ROOT);
    if (rootItems) {
      collectPaths(rootItems);
    }
    return paths;
  }, [directoryContents]);

  // Helper to get directory paths up to a specific depth
  const getDirectoryPathsToDepth = useCallback((maxDepth: number): string[] => {
    const paths: string[] = [];

    const collectPaths = (items: FileItem[], currentDepth: number) => {
      if (currentDepth >= maxDepth) return;

      items.forEach((item) => {
        if (item.type === 'directory') {
          paths.push(item.path);
          const children = directoryContents.get(item.path);
          if (children) {
            collectPaths(children, currentDepth + 1);
          }
        }
      });
    };

    const rootItems = directoryContents.get(WORKSPACE_ROOT);
    if (rootItems) {
      collectPaths(rootItems, 0);
    }
    return paths;
  }, [directoryContents]);

  // Determine if all directories (up to default depth) are currently expanded
  const isAllExpanded = useCallback(() => {
    const dirsAtDepth = getDirectoryPathsToDepth(DEFAULT_EXPAND_DEPTH);
    if (dirsAtDepth.length === 0) return false;
    return dirsAtDepth.every((path) => expandedFolders.has(path));
  }, [getDirectoryPathsToDepth, expandedFolders]);

  // Load multiple directories with concurrency limiting
  const loadDirectoriesThrottled = useCallback(async (
    paths: string[],
    concurrency = 3
  ): Promise<void> => {
    const queue = [...paths];
    const active = new Set<Promise<void>>();

    const loadNext = async () => {
      if (queue.length === 0) return;
      const path = queue.shift()!;
      const promise = loadDirectoryAsync(path).finally(() => {
        active.delete(promise);
      });
      active.add(promise);
    };

    // Initial batch
    while (active.size < concurrency && queue.length > 0) {
      await loadNext();
    }

    // Process remaining as slots free up
    while (active.size > 0) {
      await Promise.race(active);
      while (active.size < concurrency && queue.length > 0) {
        await loadNext();
      }
    }
  }, [loadDirectoryAsync]);

  const handleToggleExpandCollapse = async () => {
    // Prevent double-click while expanding
    if (isExpandingAll) return;

    if (isAllExpanded()) {
      // Collapse all - instant, no loading needed
      clearExpandedFolders();
    } else {
      setIsExpandingAll(true);

      try {
        // Get directories only to depth limit
        const dirsToExpand = getDirectoryPathsToDepth(DEFAULT_EXPAND_DEPTH);

        // Expand UI immediately for responsive feel
        expandFolders(dirsToExpand);

        // Load unloaded directories with throttling
        const unloadedDirs = dirsToExpand.filter(p => !directoryContents.has(p));
        if (unloadedDirs.length > 0) {
          await loadDirectoriesThrottled(unloadedDirs, 3);
        }
      } finally {
        setIsExpandingAll(false);
      }
    }
  };

  const refreshDirectory = (dirPath: string) => {
    // Clear cached contents for the directory to force reload
    setDirectoryContents((prev) => {
      const newMap = new Map(prev);
      newMap.delete(dirPath);
      return newMap;
    });
    loadDirectory(dirPath, true);  // Force reload
  };

  const renderTree = (items: FileItem[], level: number = 0): React.ReactNode => {
    return items.map((item) => {
      const isExpanded = expandedFolders.has(item.path);
      const isSelected = selectedFile === item.path;
      const activityType = fileActivity.get(item.path);
      const isDirectory = item.type === 'directory';
      const childItems = isDirectory ? directoryContents.get(item.path) : undefined;
      const isLoadingDir = loadingDirs.has(item.path);

      return (
        <div key={item.path}>
          <FileTreeItem
            item={item}
            level={level}
            isExpanded={isExpanded}
            isSelected={isSelected}
            gitStatus={gitStatus}
            activityType={activityType}
            onToggle={() => handleToggleFolder(item)}
            onSelect={() => handleFileSelect(item)}
            onContextMenu={handleContextMenu}
          />
          {/* Render child items if directory is expanded */}
          {isDirectory && isExpanded && (
            <>
              {isLoadingDir ? (
                <div style={{ paddingLeft: `${(level + 1) * 12 + 8}px` }} className="text-xs text-gray-500 py-1">
                  Loading...
                </div>
              ) : childItems && childItems.length > 0 ? (
                renderTree(childItems, level + 1)
              ) : childItems && childItems.length === 0 ? (
                <div style={{ paddingLeft: `${(level + 1) * 12 + 8}px` }} className="text-xs text-gray-500 py-1">
                  Empty folder
                </div>
              ) : null}
            </>
          )}
        </div>
      );
    });
  };

  const rootItems = directoryContents.get(WORKSPACE_ROOT) || [];
  const isLoadingRoot = loadingDirs.has(WORKSPACE_ROOT);

  return (
    <div className="flex flex-col h-full">
      <FileTreeToolbar
        onNewFile={() => handleNewFile(WORKSPACE_ROOT)}
        onNewFolder={() => handleNewFolder(WORKSPACE_ROOT)}
        onRefresh={() => {
          refreshDirectory(WORKSPACE_ROOT);
          loadGitStatus();
        }}
        onToggleExpandCollapse={handleToggleExpandCollapse}
        isAllExpanded={isAllExpanded()}
        isLoading={isExpandingAll}
      />
      <div className="flex-1 overflow-y-auto">
        {isLoadingRoot ? (
          <div className="p-4 text-sm text-gray-500">Loading...</div>
        ) : rootItems.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">No files found</div>
        ) : (
          renderTree(rootItems)
        )}
      </div>
      <FileContextMenu
        position={contextMenu?.position || null}
        item={contextMenu?.item || null}
        onClose={() => setContextMenu(null)}
        onNewFile={handleNewFile}
        onNewFolder={handleNewFolder}
        onRename={handleRename}
        onDelete={handleDelete}
      />
    </div>
  );
}
