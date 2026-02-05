'use client';

import { useChatStore } from '@/lib/store';
import { Settings, X, Terminal, ExternalLink, Bug } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { ModelSelector } from '@/components/ui/ModelSelector';
import { ProviderSelector } from '@/components/ui/ProviderSelector';
import { DefaultModeSelector } from '@/components/ui/DefaultModeSelector';
import { createLogger } from '@/lib/logger';
import { showToast } from '@/lib/utils/toast';

const log = createLogger('RightPanel');

export function RightPanel() {
  const { rightPanelOpen, toggleRightPanel, sessionId } = useChatStore();

  if (!rightPanelOpen) {
    // Collapsed state: Show vertical strip on right edge
    return (
      <div className="fixed right-0 top-0 h-screen w-10 bg-gray-100 dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col items-center py-4 z-40">
        <button
          onClick={toggleRightPanel}
          aria-label="Open settings"
          className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          title="Open settings"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>
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
          <DefaultModeSelector />

          {/* Open Terminal Button */}
          <button
            onClick={() => {
              const url = sessionId
                ? `/terminal?sessionId=${encodeURIComponent(sessionId)}`
                : '/terminal';

              log.info('Opening terminal in new tab', {
                hasSession: !!sessionId,
                sessionId: sessionId ? sessionId.slice(0, 8) : null,
                url
              });

              window.open(url, '_blank');
            }}
            aria-label="Open terminal in new tab"
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              <span className="text-sm font-medium">Open Terminal</span>
            </div>
            <ExternalLink className="h-4 w-4" />
          </button>

          {/* Debug Logs Button */}
          <button
            onClick={() => {
              // Enable debug mode
              localStorage.setItem('DEBUG_MODE', 'true');
              log.info('Debug mode enabled, opening logs');
              showToast('Debug mode enabled', 'success');

              // Open logs in new tab
              window.open('/logs', '_blank');
            }}
            aria-label="Enable debug mode and open logs"
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Bug className="h-4 w-4" />
              <span className="text-sm font-medium">Debug Logs</span>
            </div>
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
