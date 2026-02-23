/**
 * useWorkspaceShortcuts Hook
 * Keyboard shortcuts for workspace management
 */

'use client';

import { useEffect } from 'react';

interface WorkspaceShortcutsConfig {
  workspaces: Array<{ id: string }>;
  activeWorkspaceId: string | null;
  onWorkspaceSelect: (id: string) => void;
  onWorkspaceSwitcher: () => void;
  enabled?: boolean;
}

export function useWorkspaceShortcuts({
  workspaces,
  activeWorkspaceId,
  onWorkspaceSelect,
  onWorkspaceSwitcher,
  enabled = true,
}: WorkspaceShortcutsConfig) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? event.metaKey : event.ctrlKey;

      // Ignore if typing in input/textarea
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' ||
target.isContentEditable) {
        return;
      }

      // Cmd/Ctrl + P: Open workspace switcher
      if (modKey && event.key === 'p') {
        event.preventDefault();
        onWorkspaceSwitcher();
        return;
      }

      // Cmd/Ctrl + 1-9: Switch to workspace by index
      if (modKey && event.key >= '1' && event.key <= '9') {
        event.preventDefault();
        const index = parseInt(event.key, 10) - 1;

        if (index < workspaces.length) {
          onWorkspaceSelect(workspaces[index].id);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [workspaces, activeWorkspaceId, onWorkspaceSelect, onWorkspaceSwitcher, enabled]);
}
