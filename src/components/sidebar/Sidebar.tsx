'use client';

import { useState, useRef } from 'react';
import { useChatStore } from '@/lib/store';
import { SessionPanel } from './SessionPanel';
import { FileTree } from '@/components/files';
import { Menu, FolderTree, MessageSquare } from 'lucide-react';

export function Sidebar() {
  const {
    sidebarOpen,
    toggleSidebar,
    currentModel,
    sidebarTab,
    setSidebarTab,
    workingDirectory,
    activePermissionMode,
    availableTools,
    mcpServers,
    cliVersion,
    sessionId,
  } = useChatStore();
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
    // Collapsed state: Show vertical strip on left edge
    return (
      <div className="fixed left-0 top-0 h-screen w-10 bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col items-center py-4 gap-2 z-40">
        <button
          onClick={toggleSidebar}
          aria-label="Open sidebar"
          className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          title="Expand sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <button
          onClick={() => { toggleSidebar(); setSidebarTab('sessions'); }}
          aria-label="Open sessions"
          className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          title="Sessions"
        >
          <MessageSquare className="h-5 w-5" />
        </button>
        <button
          onClick={() => { toggleSidebar(); setSidebarTab('files'); }}
          aria-label="Open files"
          className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          title="Files"
        >
          <FolderTree className="h-5 w-5" />
        </button>
      </div>
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

      <div className="border-t border-gray-200 dark:border-gray-700 p-4 text-xs text-gray-500 dark:text-gray-400 space-y-2">
        {currentModel && (
          <div className="flex justify-between">
            <span>Model:</span>
            <span className="font-mono text-gray-700 dark:text-gray-300 truncate ml-2">
              {currentModel}
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Directory:</span>
          <span className="font-mono text-gray-700 dark:text-gray-300 truncate ml-2">
            {workingDirectory}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Mode:</span>
          <span className="font-mono text-gray-700 dark:text-gray-300">
            {activePermissionMode}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Tools:</span>
          <span className="font-mono text-gray-700 dark:text-gray-300">
            {availableTools.length} available
          </span>
        </div>
        {mcpServers.length > 0 && (
          <div className="flex justify-between">
            <span>MCP:</span>
            <span className="font-mono text-gray-700 dark:text-gray-300">
              {mcpServers.filter(s => s.status === 'connected').length}/{mcpServers.length} connected
            </span>
          </div>
        )}
        {cliVersion && (
          <div className="flex justify-between">
            <span>CLI:</span>
            <span className="font-mono text-gray-700 dark:text-gray-300">
              v{cliVersion}
            </span>
          </div>
        )}
        {sessionId && (
          <div className="flex justify-between">
            <span>Session:</span>
            <span
              className="font-mono text-gray-700 dark:text-gray-300 truncate ml-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
              title={`Click to copy: ${sessionId}`}
              onClick={() => navigator.clipboard.writeText(sessionId)}
            >
              {sessionId.slice(0, 8)}...
            </span>
          </div>
        )}
      </div>

      {/* Resize handle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-500 dark:hover:bg-blue-400 transition-colors"
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}
