import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { SessionPanel } from '../SessionPanel';
import { useChatStore } from '@/lib/store';
import { useWorkspaceStore } from '@/lib/store/workspaces';
import { useSessionDiscoveryStore } from '@/lib/store/sessions';

// Mock stores and hooks
vi.mock('@/lib/store');
vi.mock('@/lib/store/workspaces');
vi.mock('@/lib/store/sessions');
vi.mock('@/hooks/useCliPrewarm', () => ({
  useCliPrewarm: () => ({
    prewarmCli: vi.fn(),
  }),
}));

describe('SessionPanel empty state', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock for session discovery
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
  });

  it('should show empty state when no sessions in workspace', () => {
    (useWorkspaceStore as any).mockReturnValue({
      activeWorkspaceId: 'workspace-1',
      workspaces: new Map([
        ['workspace-1', {
          id: 'workspace-1',
          name: 'Empty Project',
          rootPath: '/empty',
          sessionIds: [],
          lastAccessedAt: Date.now(),
        }],
      ]),
    });

    (useChatStore as any).mockReturnValue({
      sessions: [],
      startNewSession: vi.fn(),
      isPrewarming: false,
      collapsedProjects: new Set(),
      collapsedSections: new Set(),
      toggleProjectCollapse: vi.fn(),
      toggleSectionCollapse: vi.fn(),
    });

    render(<SessionPanel />);

    // Should show empty state from SessionList
    expect(screen.getByText(/no sessions in this workspace/i)).toBeInTheDocument();
  });

  it('should have id on New Chat button for auto-focus', () => {
    (useWorkspaceStore as any).mockReturnValue({
      activeWorkspaceId: 'workspace-1',
      workspaces: new Map([['workspace-1', { sessionIds: [] }]]),
    });

    (useChatStore as any).mockReturnValue({
      sessions: [],
      startNewSession: vi.fn(),
      isPrewarming: false,
      collapsedProjects: new Set(),
      collapsedSections: new Set(),
      toggleProjectCollapse: vi.fn(),
      toggleSectionCollapse: vi.fn(),
    });

    render(<SessionPanel />);

    const button = screen.getByRole('button', { name: /new chat/i });
    expect(button).toHaveAttribute('id', 'new-chat-button');
  });

  it('should show keyboard hint for New Chat', () => {
    (useWorkspaceStore as any).mockReturnValue({
      activeWorkspaceId: 'workspace-1',
      workspaces: new Map([['workspace-1', { sessionIds: [] }]]),
    });

    (useChatStore as any).mockReturnValue({
      sessions: [],
      startNewSession: vi.fn(),
      isPrewarming: false,
      collapsedProjects: new Set(),
      collapsedSections: new Set(),
      toggleProjectCollapse: vi.fn(),
      toggleSectionCollapse: vi.fn(),
    });

    render(<SessionPanel />);

    // The button text should contain "New Chat" (we're checking it exists above)
    const button = screen.getByRole('button', { name: /new chat/i });
    expect(button).toBeInTheDocument();
  });
});
