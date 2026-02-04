'use client';

import { useChatStore } from '@/lib/store';
import { X } from 'lucide-react';

export function HelpPanel() {
  const { isHelpPanelOpen, setHelpPanelOpen, availableCommands, availableSkills, setPendingInputText } = useChatStore();

  if (!isHelpPanelOpen) return null;

  // Group commands by type
  const builtInCommands = ['/help', '/clear', '/status', '/cost', '/context', '/config'];
  const skillCommands = availableSkills;
  const otherCommands = availableCommands.filter(
    cmd => !builtInCommands.includes(cmd) && !skillCommands.includes(cmd)
  );

  const handleCommandClick = (command: string) => {
    setPendingInputText(command);
    setHelpPanelOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Available Commands
          </h2>
          <button
            onClick={() => setHelpPanelOpen(false)}
            className="text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Built-in commands */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Built-in Commands
            </h3>
            <div className="space-y-1">
              {builtInCommands.map((cmd) => (
                <button
                  key={cmd}
                  onClick={() => handleCommandClick(cmd)}
                  className="block w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-mono text-blue-600 dark:text-blue-400"
                >
                  {cmd}
                </button>
              ))}
            </div>
          </div>

          {/* Skill commands */}
          {skillCommands.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Skill Commands
              </h3>
              <div className="space-y-1">
                {skillCommands.map((cmd) => (
                  <button
                    key={cmd}
                    onClick={() => handleCommandClick(cmd)}
                    className="block w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-mono text-purple-600 dark:text-purple-400"
                  >
                    {cmd}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Other commands (plugins, etc.) */}
          {otherCommands.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Plugin Commands
              </h3>
              <div className="space-y-1">
                {otherCommands.map((cmd) => (
                  <button
                    key={cmd}
                    onClick={() => handleCommandClick(cmd)}
                    className="block w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-mono text-green-600 dark:text-green-400"
                  >
                    {cmd}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No commands available */}
          {availableCommands.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No commands available yet. Commands will appear after connecting to Claude CLI.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
          Click a command to insert it into the chat input
        </div>
      </div>
    </div>
  );
}
