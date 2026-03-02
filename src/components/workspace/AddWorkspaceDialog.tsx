/**
 * AddWorkspaceDialog Component
 * Dialog for adding new workspaces
 */

'use client';

import { useState, useCallback } from 'react';
import { X, Info, FolderOpen } from 'lucide-react';
import { showToast } from '@/lib/utils/toast';
import { DirectoryBrowser } from './DirectoryBrowser';
import { SSHWorkspaceForm } from './SSHWorkspaceForm';
import { createLogger } from '@/lib/logger';
import type { ProviderConfig, SSHProviderConfig } from '@/lib/workspace/types';

const log = createLogger('AddWorkspaceDialog');

interface AddWorkspaceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (config: ProviderConfig, options?: { name?: string; color?: string }) => Promise<string>;
}

export function AddWorkspaceDialog({ isOpen, onClose, onAdd }: AddWorkspaceDialogProps) {
  const [type, setType] = useState<'local' | 'git' | 'ssh'>('local');
  const [name, setName] = useState('');
  const [path, setPath] = useState('/workspace');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBrowsing, setIsBrowsing] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!path.trim()) {
      showToast('Path cannot be empty', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const config: ProviderConfig = {
        type: 'local',
        path: path.trim(),
      };

      await onAdd(config, { name: name.trim() || undefined });
      showToast('Workspace added successfully', 'success');
      onClose();

      // Reset form
      setName('');
      setPath('/workspace');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to add workspace',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onClose();
    setName('');
    setPath('/workspace');
    setType('local');
  };

  const handleSSHSubmit = useCallback(async (config: SSHProviderConfig) => {
    log.info('SSH workspace submission', { host: config.host, useTailscale: !!config.tailscale });
    setIsSubmitting(true);

    try {
      // Generate name from host/device
      const workspaceName = name.trim() || (
        config.tailscale?.deviceId
          ? `SSH: ${config.host}`
          : `SSH: ${config.host}`
      );

      await onAdd(config, { name: workspaceName });
      showToast('SSH workspace added successfully', 'success');
      onClose();

      // Reset form
      setName('');
      setType('local');
    } catch (error) {
      log.error('Failed to add SSH workspace', { error });
      showToast(
        error instanceof Error ? error.message : 'Failed to add SSH workspace',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [name, onAdd, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSubmitting) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full overflow-hidden flex flex-col max-h-[90vh] ${
        type === 'ssh' ? 'max-w-lg' : 'max-w-md'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Add Workspace
          </h2>
          <button
            onClick={handleCancel}
            className="text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Help Section */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <p className="font-medium mb-1">What is a workspace?</p>
                <p className="text-blue-700 dark:text-blue-300">
                  Workspaces let you work on multiple projects simultaneously.
                  Each workspace has its own file tree, terminal, and chat sessions.
                </p>
              </div>
            </div>
          </div>

          {/* Workspace Type Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Workspace Type
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setType('local')}
                className={`flex-1 px-3 py-2 rounded-lg border transition-colors ${
                  type === 'local'
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300'
                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                📁 Local
              </button>
              <button
                onClick={() => setType('git')}
                disabled
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 opacity-50 cursor-not-allowed"
                title="Coming soon"
              >
                🔀 Git
              </button>
              <button
                onClick={() => setType('ssh')}
                className={`flex-1 px-3 py-2 rounded-lg border transition-colors ${
                  type === 'ssh'
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300'
                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                🔐 SSH
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {type === 'ssh' ? 'Connect to remote machines via SSH or Tailscale' : 'Git support coming soon'}
            </p>
          </div>

          {/* Workspace Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Name (Optional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Auto-generated from path"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
          </div>

          {/* Local Path */}
          {type === 'local' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Directory Path
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="/path/to/directory"
                  autoFocus
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
                <button
                  type="button"
                  onClick={() => setIsBrowsing(true)}
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                  title="Browse directories"
                >
                  <FolderOpen className="h-4 w-4" />
                  <span>Browse</span>
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Enter the absolute path or click Browse to select
              </p>
            </div>
          )}

          {/* SSH Configuration */}
          {type === 'ssh' && (
            <SSHWorkspaceForm
              onSubmit={handleSSHSubmit}
              onCancel={handleCancel}
              isSubmitting={isSubmitting}
            />
          )}

          {type === 'local' && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Press Enter to add, Esc to cancel
            </p>
          )}
        </div>

        {/* Footer - Only show for non-SSH types (SSH has its own buttons) */}
        {type !== 'ssh' && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
            <button
              onClick={handleCancel}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!path.trim() || isSubmitting}
              className="px-4 py-2 rounded-lg bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Adding...' : 'Add Workspace'}
            </button>
          </div>
        )}
      </div>

      {/* Directory Browser */}
      {isBrowsing && (
        <DirectoryBrowser
          initialPath={path || '/workspace'}
          onSelect={(selectedPath) => {
            setPath(selectedPath);
            setIsBrowsing(false);
          }}
          onCancel={() => setIsBrowsing(false)}
        />
      )}
    </div>
  );
}
