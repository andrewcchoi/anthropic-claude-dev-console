'use client';

import { useState, useRef } from 'react';
import { useChatStore } from '@/lib/store';
import { SessionPanel } from './SessionPanel';
import { FileTree } from '@/components/files';

export function Sidebar() {
  const { sidebarOpen, toggleSidebar, currentModel, sidebarTab, setSidebarTab } = useChatStore();
  const [sidebarWidth, setSidebarWidth] = useState(256); // 16rem = 256px
  const isResizing = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isResizing.current) {
      const newWidth = Math.min(Math.max(200, e.clientX), 500);
      setSidebarWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  if (!sidebarOpen) {
    return (
      <button
        onClick={toggleSidebar}
        className="fixed left-0 top-0 z-50 m-4 rounded-lg bg-blue-600 dark:bg-blue-500 p-2 text-white hover:bg-blue-700 dark:hover:bg-blue-600"
      >
        ☰
      </button>
    );
  }

  return (
    <div
      className="relative border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex flex-col"
      style={{ width: sidebarWidth }}
    >
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Claude Code UI</h2>
        <button
          onClick={toggleSidebar}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        >
          ✕
        </button>
      </div>

      {/* Tab buttons */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setSidebarTab('sessions')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            sidebarTab === 'sessions'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          Sessions
        </button>
        <button
          onClick={() => setSidebarTab('files')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            sidebarTab === 'files'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          Files
        </button>
      </div>

      {/* Conditionally render based on active tab */}
      {sidebarTab === 'sessions' ? (
        <SessionPanel />
      ) : (
        <div className="flex-1 overflow-hidden">
          <FileTree />
        </div>
      )}

      <div className="border-t border-gray-200 dark:border-gray-700 p-4 text-xs text-gray-500 dark:text-gray-400">
        {currentModel && (
          <div className="mb-3">
            <div>Model:</div>
            <div className="font-mono mt-1 text-gray-700 dark:text-gray-300">
              {currentModel}
            </div>
          </div>
        )}
        <div>Working Directory:</div>
        <div className="font-mono mt-1 truncate text-gray-700 dark:text-gray-300">/workspace</div>
      </div>

      {/* Resize handle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-500 dark:hover:bg-blue-400 transition-colors"
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}
