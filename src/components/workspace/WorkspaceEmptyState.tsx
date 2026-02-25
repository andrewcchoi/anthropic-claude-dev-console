/**
 * WorkspaceEmptyState Component
 * Onboarding screen shown when no workspaces exist
 */

'use client';

interface WorkspaceEmptyStateProps {
  onAddWorkspace: () => void;
}

export function WorkspaceEmptyState({ onAddWorkspace }: WorkspaceEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
      <div className="max-w-3xl">
        {/* Icon */}
        <div className="mb-6">
          <div className="text-6xl mb-4">📁</div>
          <h2 className="text-3xl font-bold mb-3 text-gray-900 dark:text-gray-100">
            Welcome to Workspaces
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            Workspaces let you work on multiple projects at once. Each workspace
            has its own file tree, terminal, and chat history.
          </p>
        </div>

        {/* CTA Button */}
        <button
          onClick={onAddWorkspace}
          className="px-8 py-4 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
        >
          Add Your First Workspace
        </button>

        {/* Feature Cards */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {/* Local Projects */}
          <div className="p-6 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
            <div className="text-4xl mb-3">📁</div>
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
              Local Projects
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Work on projects stored on your computer. Browse directories
              visually and start coding right away.
            </p>
          </div>

          {/* Git Repos */}
          <div className="p-6 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg opacity-60">
            <div className="text-4xl mb-3">🔀</div>
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
              Git Repositories
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Clone and work on remote repositories with full version control support.
            </p>
            <span className="inline-block mt-2 text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
              Coming Soon
            </span>
          </div>

          {/* SSH Servers */}
          <div className="p-6 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg opacity-60">
            <div className="text-4xl mb-3">🔐</div>
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
              Remote Servers
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Connect to remote development servers via SSH and work as if they were local.
            </p>
            <span className="inline-block mt-2 text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
              Coming Soon
            </span>
          </div>
        </div>

        {/* Example Use Cases */}
        <div className="mt-12 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
            Example: Working on Multiple Projects
          </h3>
          <div className="text-sm text-gray-700 dark:text-gray-300 text-left space-y-2">
            <p>
              <span className="font-medium">Workspace 1:</span> Frontend (React app at <code className="bg-white dark:bg-gray-800 px-1 py-0.5 rounded">/projects/my-app-frontend</code>)
            </p>
            <p>
              <span className="font-medium">Workspace 2:</span> Backend (Node.js API at <code className="bg-white dark:bg-gray-800 px-1 py-0.5 rounded">/projects/my-app-backend</code>)
            </p>
            <p>
              <span className="font-medium">Workspace 3:</span> Documentation (Markdown at <code className="bg-white dark:bg-gray-800 px-1 py-0.5 rounded">/projects/my-app-docs</code>)
            </p>
          </div>
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Switch between them instantly with tabs or keyboard shortcuts (Ctrl+Shift+1, 2, 3...)
          </p>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <h4 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
            Keyboard Shortcuts
          </h4>
          <div className="flex flex-wrap gap-4 justify-center text-xs text-gray-600 dark:text-gray-400">
            <div>
              <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded font-mono">
                Ctrl+Shift+P
              </kbd>
              <span className="ml-2">Quick switcher</span>
            </div>
            <div>
              <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded font-mono">
                Ctrl+Shift+1-9
              </kbd>
              <span className="ml-2">Switch to workspace 1-9</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
