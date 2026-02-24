import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { ProjectList } from '../ProjectList';
import { useChatStore } from '@/lib/store';
import { useWorkspaceStore } from '@/lib/store/workspaces';
import { useSessionDiscoveryStore } from '@/lib/store/sessions';
import * as toastModule from '@/lib/utils/toast';

// Mock stores
vi.mock('@/lib/store');
vi.mock('@/lib/store/workspaces');
vi.mock('@/lib/store/sessions');
vi.mock('@/hooks/useClaudeChat', () => ({
  useClaudeChat: () => ({
    cleanupStream: vi.fn(),
  }),
}));

// Mock toast
vi.mock('@/lib/utils/toast', () => ({
  showToast: vi.fn(),
}));

describe('Workspace switch toast notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock for session discovery store
    (useSessionDiscoveryStore as any).mockReturnValue({
      projects: [],
      sessions: [],
      sessionSearchQuery: '',
    });
  });

  it('should show toast when stopping active stream', async () => {
    (useChatStore as any).mockReturnValue({
      isStreaming: true,
      sessions: [],
      hiddenSessionIds: new Set(),
      collapsedProjects: new Set(),
      toggleProjectCollapse: vi.fn(),
      setCurrentSession: vi.fn(),
      switchSession: vi.fn(),
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

    const workspaceButton = screen.getByText('/project');
    fireEvent.click(workspaceButton);

    await waitFor(() => {
      expect(toastModule.showToast).toHaveBeenCalledWith('Stopped active conversation', 'info');
    });
  });

  it('should show toast when falling back to recent session', async () => {
    const mockValidate = vi.fn(() => null);  // Invalid
    const mockGetMostRecent = vi.fn(() => ({ id: 'session-recent' }));

    (useWorkspaceStore as any).mockReturnValue({
      validateLastActiveSession: mockValidate,
      getMostRecentSessionForWorkspace: mockGetMostRecent,
      workspaces: new Map([
        ['workspace-1', {
          id: 'workspace-1',
          lastActiveSessionId: 'deleted-session',  // Invalid
          sessionIds: ['session-recent'],
          name: 'Project',
          rootPath: '/project',
          lastAccessedAt: Date.now(),
        }],
      ]),
      setCurrentWorkspace: vi.fn(),
      updateWorkspaceLastActiveSession: vi.fn(),
    });

    (useChatStore as any).mockReturnValue({
      sessions: [{
        id: 'session-recent',
        name: 'Recent Session',
        workspaceId: 'workspace-1',
        created_at: Date.now(),
        updated_at: Date.now(),
        cwd: '/project',
      }],
      isStreaming: false,
      hiddenSessionIds: new Set(),
      collapsedProjects: new Set(),
      toggleProjectCollapse: vi.fn(),
      switchSession: vi.fn(),
      setCurrentSession: vi.fn(),
    });

    (useSessionDiscoveryStore as any).mockReturnValue({
      projects: [{
        id: 'workspace-1',
        path: '/project',
        sessionCount: 1,
        lastActivity: Date.now(),
      }],
      sessions: [],
      sessionSearchQuery: '',
    });

    render(<ProjectList />);

    const workspaceButton = screen.getByText('/project');
    fireEvent.click(workspaceButton);

    await waitFor(() => {
      expect(toastModule.showToast).toHaveBeenCalledWith('Restored most recent session', 'info');
    });
  });
});
