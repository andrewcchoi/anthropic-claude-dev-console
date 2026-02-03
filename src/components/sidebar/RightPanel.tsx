'use client';

import { useChatStore } from '@/lib/store';
import { Settings, X } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { ModelSelector } from '@/components/ui/ModelSelector';
import { ProviderSelector } from '@/components/ui/ProviderSelector';

export function RightPanel() {
  const { rightPanelOpen, toggleRightPanel } = useChatStore();

  if (!rightPanelOpen) {
    // Collapsed state: Show gear icon button on top-right
    return (
      <button
        onClick={toggleRightPanel}
        aria-label="Open settings"
        className="fixed right-4 top-4 p-2 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white shadow-lg transition-colors z-50"
      >
        <Settings className="h-5 w-5" />
      </button>
    );
  }

  // Open state: Show full panel
  return (
    <div
      data-panel="right"
      className="fixed right-0 top-0 h-screen w-64 bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Settings
        </h2>
        <button
          onClick={toggleRightPanel}
          aria-label="Close settings panel"
          className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-2">
          <ThemeToggle />
          <ProviderSelector />
          <ModelSelector />
        </div>
      </div>
    </div>
  );
}
