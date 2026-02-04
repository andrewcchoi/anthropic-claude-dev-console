'use client';

import { useChatStore } from '@/lib/store';
import { X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { showToast } from '@/lib/utils/toast';

export function RenameDialog() {
  const {
    isRenameDialogOpen,
    setRenameDialogOpen,
    currentSession,
    updateSessionName,
  } = useChatStore();
  const [name, setName] = useState('');

  // Update local state when session changes
  useEffect(() => {
    if (isRenameDialogOpen && currentSession) {
      setName(currentSession.name || '');
    }
  }, [isRenameDialogOpen, currentSession]);

  if (!isRenameDialogOpen || !currentSession) return null;

  const handleSave = () => {
    if (!name.trim()) {
      showToast('Session name cannot be empty', 'error');
      return;
    }

    updateSessionName(currentSession.id, name.trim());
    showToast('Session renamed', 'success');
    setRenameDialogOpen(false);
  };

  const handleCancel = () => {
    setRenameDialogOpen(false);
    setName(currentSession.name || '');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Rename Session
          </h2>
          <button
            onClick={handleCancel}
            className="text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Session Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter session name"
            autoFocus
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Press Enter to save, Esc to cancel
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <button
            onClick={handleCancel}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-4 py-2 rounded-lg bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
