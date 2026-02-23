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
      // Ignore if typing in input/textarea
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' ||
target.isContentEditable) {
        return;
      }

      // Ctrl+Shift+P: Open workspace switcher
      if (event.ctrlKey && event.shiftKey && !event.altKey && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        onWorkspaceSwitcher();
        return;
      }

      // Ctrl+Shift+1-9: Switch to workspace by index
      // Use event.code because event.key with Shift gives symbols (!, @, #, etc.)
      if (event.ctrlKey && event.shiftKey && !event.altKey && event.code.startsWith('Digit')) {
        event.preventDefault();
        const digit = event.code.replace('Digit', '');
        const index = parseInt(digit, 10) - 1;

        if (index >= 0 && index < 9 && index < workspaces.length) {
          onWorkspaceSelect(workspaces[index].id);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [workspaces, activeWorkspaceId, onWorkspaceSelect, onWorkspaceSwitcher, enabled]);
}
