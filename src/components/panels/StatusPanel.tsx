'use client';

import { useChatStore } from '@/lib/store';
import { X, CheckCircle, XCircle } from 'lucide-react';

export function StatusPanel() {
  const {
    isStatusPanelOpen,
    setStatusPanelOpen,
    currentModel,
    workingDirectory,
    activePermissionMode,
    availableTools,
    availableSkills,
    mcpServers,
    cliVersion,
    sessionId,
  } = useChatStore();

  if (!isStatusPanelOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Session Status
          </h2>
          <button
            onClick={() => setStatusPanelOpen(false)}
            className="text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Session Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Session Information
            </h3>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Session ID:</span>
                <span className="font-mono text-gray-900 dark:text-gray-100">
                  {sessionId || 'Not connected'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Model:</span>
                <span className="font-mono text-gray-900 dark:text-gray-100">
                  {currentModel || 'Not set'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Working Directory:</span>
                <span className="font-mono text-gray-900 dark:text-gray-100 truncate max-w-md">
                  {workingDirectory}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Permission Mode:</span>
                <span className="font-mono text-gray-900 dark:text-gray-100">
                  {activePermissionMode}
                </span>
              </div>
              {cliVersion && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">CLI Version:</span>
                  <span className="font-mono text-gray-900 dark:text-gray-100">
                    v{cliVersion}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Tools */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Tools ({availableTools.length})
            </h3>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
              {availableTools.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {availableTools.map((tool) => (
                    <div
                      key={tool}
                      className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                    >
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="font-mono">{tool}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No tools available
                </p>
              )}
            </div>
          </div>

          {/* Skills */}
          {availableSkills.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Skills ({availableSkills.length})
              </h3>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                <div className="grid grid-cols-2 gap-2">
                  {availableSkills.map((skill) => (
                    <div
                      key={skill}
                      className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                    >
                      <CheckCircle className="h-4 w-4 text-purple-500" />
                      <span className="font-mono">{skill}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* MCP Servers */}
          {mcpServers.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                MCP Servers ({mcpServers.length})
              </h3>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 space-y-2">
                {mcpServers.map((server) => (
                  <div
                    key={server.name}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="font-mono text-gray-700 dark:text-gray-300">
                      {server.name}
                    </span>
                    <div className="flex items-center gap-2">
                      {server.status === 'connected' ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-green-600 dark:text-green-400">
                            Connected
                          </span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-red-500" />
                          <span className="text-red-600 dark:text-red-400">
                            {server.status}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
