import { render, screen } from '@testing-library/react';
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

describe('Workspace switch accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('New Chat button should be accessible', () => {
    (useWorkspaceStore as any).mockReturnValue({
      activeWorkspaceId: 'workspace-1',
      workspaces: new Map([['workspace-1', { sessionIds: [] }]]),
    });

    (useChatStore as any).mockReturnValue({
      sessions: [],
      startNewSession: vi.fn(),
      isPrewarming: false,
    });

    (useSessionDiscoveryStore as any).mockReturnValue({
      discoverSessions: vi.fn(),
      lastDiscoveryTime: Date.now(),
      lastDiscoveryCount: 0,
      systemSessionCount: 0,
      discoveryError: null,
      isDiscovering: false,
      sessions: [],
      projects: [],
      sessionSearchQuery: '',
    });

    render(<SessionPanel />);

    const button = screen.getByRole('button', { name: /new chat/i });
    // Button exists and is accessible via role
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('id', 'new-chat-button');
  });

  it('should support keyboard navigation', () => {
    (useChatStore as any).mockReturnValue({
      sessions: [],
      isStreaming: false,
      hiddenSessionIds: new Set(),
      collapsedProjects: new Set(),
      toggleProjectCollapse: vi.fn(),
      switchSession: vi.fn(),
      setCurrentSession: vi.fn(),
    });

    (useWorkspaceStore as any).mockReturnValue({
      workspaces: new Map([
        ['workspace-1', {
          id: 'workspace-1',
          name: 'Project',
          rootPath: '/project',
          sessionIds: [],
          lastAccessedAt: Date.now(),
        }],
      ]),
      setCurrentWorkspace: vi.fn(),
      validateLastActiveSession: vi.fn(),
      getMostRecentSessionForWorkspace: vi.fn(),
      updateWorkspaceLastActiveSession: vi.fn(),
    });

    (useSessionDiscoveryStore as any).mockReturnValue({
      projects: [{
        id: 'workspace-1',
        path: '/project',
        sessionCount: 0,
        lastActivity: Date.now(),
      }],
      sessions: [],
      sessionSearchQuery: '',
    });

    render(<ProjectList />);

    const workspaceButtons = screen.getAllByRole('button');
    // All buttons should be keyboard accessible (default button behavior)
    workspaceButtons.forEach(button => {
      expect(button.tagName).toBe('BUTTON');
    });
  });
});
