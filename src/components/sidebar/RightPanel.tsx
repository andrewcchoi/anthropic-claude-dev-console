'use client';

import { useChatStore } from '@/lib/store';
import { Settings, X, Terminal, ExternalLink, Info } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { ModelSelector } from '@/components/ui/ModelSelector';
import { ProviderSelector } from '@/components/ui/ProviderSelector';
import { DefaultModeSelector } from '@/components/ui/DefaultModeSelector';
import { DebugToggle } from '@/components/ui/DebugToggle';
import { useDebug } from '@/components/providers/DebugProvider';
import { createLogger } from '@/lib/logger';

const log = createLogger('RightPanel');

export function RightPanel() {
  const {
    rightPanelOpen,
    toggleRightPanel,
    sessionId,
    setStatusPanelOpen,
    currentModel,
    workingDirectory,
    activePermissionMode,
    availableTools,
    mcpServers,
    cliVersion,
  } = useChatStore();
  const { debugEnabled } = useDebug();

  if (!rightPanelOpen) {
    // Collapsed state: Show vertical strip on right edge (below workspace tab bar)
    return (
      <div className="fixed right-0 top-[49px] h-[calc(100vh-49px)] w-10 bg-gray-100 dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col items-center py-4 gap-2 z-50">
        <button
          onClick={toggleRightPanel}
          aria-label="Open settings"
          className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-[0.98] active:bg-gray-300 dark:active:bg-gray-600 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-all duration-150"
          title="Open settings"
        >
          <Settings className="h-5 w-5" />
        </button>
        <DebugToggle variant="compact" />
      </div>
    );
  }

  // Open state: Show full panel (below workspace tab bar)
  return (
    <div
      data-panel="right"
      className="fixed right-0 top-[49px] h-[calc(100vh-49px)] w-64 bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col z-45"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Settings
        </h2>
        <button
          onClick={toggleRightPanel}
          aria-label="Close settings panel"
          className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 active:scale-[0.98] active:bg-gray-300 dark:active:bg-gray-700 text-gray-600 dark:text-gray-400 transition-all duration-150"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-2" suppressHydrationWarning>
          <ThemeToggle />
          <ProviderSelector />
          <ModelSelector />
          <DefaultModeSelector />

          {/* Session Status Button */}
          <button
            onClick={() => {
              log.info('Opening status panel');
              setStatusPanelOpen(true);
            }}
            aria-label="Open session status"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-[0.98] active:bg-gray-300 dark:active:bg-gray-600 text-gray-900 dark:text-gray-100 transition-all duration-150"
          >
            <Info className="h-4 w-4" />
            <span className="text-sm font-medium">Session Status</span>
          </button>

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
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-[0.98] active:bg-gray-300 dark:active:bg-gray-600 text-gray-900 dark:text-gray-100 transition-all duration-150"
          >
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              <span className="text-sm font-medium">Open Terminal</span>
            </div>
            <ExternalLink className="h-4 w-4" />
          </button>

          {/* Debug Toggle */}
          <DebugToggle variant="full" openLogs className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700" />
        </div>

        {/* Session Info Panel */}
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
      </div>
    </div>
  );
}
