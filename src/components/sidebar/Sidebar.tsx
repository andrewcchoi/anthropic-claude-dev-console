'use client';

import { useChatStore } from '@/lib/store';
import { SessionList } from './SessionList';

export function Sidebar() {
  const { sidebarOpen, toggleSidebar, startNewSession } = useChatStore();

  const handleNewChat = () => {
    startNewSession();
  };

  if (!sidebarOpen) {
    return (
      <button
        onClick={toggleSidebar}
        className="fixed left-0 top-0 z-50 m-4 rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700"
      >
        ☰
      </button>
    );
  }

  return (
    <div className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Claude Code UI</h2>
        <button
          onClick={toggleSidebar}
          className="text-gray-500 hover:text-gray-900"
        >
          ✕
        </button>
      </div>

      <div className="p-4">
        <button
          onClick={handleNewChat}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          History
        </div>
        <SessionList />
      </div>

      <div className="border-t border-gray-200 p-4 text-xs text-gray-500">
        <div>Working Directory:</div>
        <div className="font-mono mt-1 truncate text-gray-700">/workspace</div>
      </div>
    </div>
  );
}
