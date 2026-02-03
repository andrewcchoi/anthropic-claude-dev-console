'use client';

import React, { useEffect, useRef } from 'react';
import { FileContextMenuProps } from './types';
import { FilePlus, FolderPlus, Edit, Trash2 } from 'lucide-react';

export function FileContextMenu({
  position,
  item,
  onClose,
  onNewFile,
  onNewFolder,
  onRename,
  onDelete,
}: FileContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  if (!position || !item) return null;

  const isDirectory = item.type === 'directory';

  return (
    <div
      ref={menuRef}
      className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 z-50 min-w-[160px]"
      style={{ top: position.y, left: position.x }}
    >
      {isDirectory && (
        <>
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
            onClick={() => {
              onNewFile(item.path);
              onClose();
            }}
          >
            <FilePlus className="w-4 h-4" />
            New File
          </button>
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
            onClick={() => {
              onNewFolder(item.path);
              onClose();
            }}
          >
            <FolderPlus className="w-4 h-4" />
            New Folder
          </button>
          <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
        </>
      )}
      <button
        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
        onClick={() => {
          onRename(item);
          onClose();
        }}
      >
        <Edit className="w-4 h-4" />
        Rename
      </button>
      <button
        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-left text-red-600 dark:text-red-400"
        onClick={() => {
          onDelete(item);
          onClose();
        }}
      >
        <Trash2 className="w-4 h-4" />
        Delete
      </button>
    </div>
  );
}
