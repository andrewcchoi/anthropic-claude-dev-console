import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { ProjectList } from '../ProjectList';
import { SessionPanel } from '../SessionPanel';
import { useChatStore } from '@/lib/store';
import { useWorkspaceStore } from '@/lib/store/workspaces';
import { useSessionDiscoveryStore } from '@/lib/store/sessions';

// Mock stores and hooks
vi.mock('@/lib/store');
vi.mock('@/lib/store/workspaces');
vi.mock('@/lib/store/sessions');
vi.mock('@/hooks/useClaudeChat', () => ({
  useClaudeChat: () => ({
    cleanupStream: vi.fn(),
  }),
}));
vi.mock('@/hooks/useCliPrewarm', () => ({
  useCliPrewarm: () => ({
    prewarmCli: vi.fn(),
  }),
}));

describe('Workspace switch focus management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should focus New Chat button in empty workspace', async () => {
    (useWorkspaceStore as any).mockReturnValue({
      activeWorkspaceId: 'empty',
      workspaces: new Map([
        ['empty', {
          id: 'empty',
          name: 'Empty',
          rootPath: '/empty',
          sessionIds: [],
          lastAccessedAt: Date.now(),
        }],
      ]),
      setCurrentWorkspace: vi.fn(),
      validateLastActiveSession: vi.fn(),
      getMostRecentSessionForWorkspace: vi.fn(),
      updateWorkspaceLastActiveSession: vi.fn(),
    });

    (useChatStore as any).mockReturnValue({
      sessions: [],
      setCurrentSession: vi.fn(),
      isStreaming: false,
      hiddenSessionIds: new Set(),
      collapsedProjects: new Set(),
      toggleProjectCollapse: vi.fn(),
      switchSession: vi.fn(),
      startNewSession: vi.fn(),
      isPrewarming: false,
    });

    (useSessionDiscoveryStore as any).mockReturnValue({
      projects: [{
        id: 'empty',
        path: '/empty',
        sessionCount: 0,
        lastActivity: Date.now(),
      }],
      sessions: [],
      sessionSearchQuery: '',
      discoverSessions: vi.fn(),
      lastDiscoveryTime: Date.now(),
      lastDiscoveryCount: 0,
      systemSessionCount: 0,
      discoveryError: null,
      isDiscovering: false,
    });

    const { container } = render(
      <>
        <ProjectList />
        <SessionPanel />
      </>
    );

    const workspaceButton = screen.getByText('/empty');
    fireEvent.click(workspaceButton);

    await waitFor(() => {
      const newChatButton = screen.getByRole('button', { name: /new chat/i });
      expect(document.activeElement).toBe(newChatButton);
    }, { timeout: 200 });
  });
});
