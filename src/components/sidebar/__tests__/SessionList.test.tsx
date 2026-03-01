import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SessionList } from '../SessionList';
import { useChatStore } from '@/lib/store';
import { useWorkspaceStore } from '@/lib/store/workspaces';
import { useSessionDiscoveryStore } from '@/lib/store/sessions';

// Mock stores
vi.mock('@/lib/store');
vi.mock('@/lib/store/workspaces');
vi.mock('@/lib/store/sessions');

describe('SessionList - Filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filters sessions by workspace projectId', () => {
    // Setup mocks
    (useWorkspaceStore as any).mockReturnValue({
      activeWorkspaceId: 'ws-1',
      workspaces: new Map([
        ['ws-1', { id: 'ws-1', projectId: '-workspace', name: 'Main' }],
      ]),
      setActiveWorkspace: vi.fn(),
    });

    (useSessionDiscoveryStore as any).mockReturnValue({
      sessions: [
        { id: 'cli-1', projectId: '-workspace', name: 'Session 1', source: 'cli', modifiedAt: Date.now(), createdAt: Date.now(), isSystem: false },
        { id: 'cli-2', projectId: '-workspace-docs', name: 'Session 2', source: 'cli', modifiedAt: Date.now(), createdAt: Date.now(), isSystem: false },
        { id: 'cli-3', projectId: '-workspace', name: 'Session 3', source: 'cli', modifiedAt: Date.now(), createdAt: Date.now(), isSystem: false },
      ],
    });

    (useChatStore as any).mockReturnValue({
      sessions: [],
      hiddenSessionIds: new Set(),
      sessionId: null,
      switchSession: vi.fn(),
      deleteSession: vi.fn(),
    });

    render(<SessionList />);

    // Should show only sessions with matching projectId
    expect(screen.getByText('Session 1')).toBeInTheDocument();
    expect(screen.queryByText('Session 2')).not.toBeInTheDocument();
    expect(screen.getByText('Session 3')).toBeInTheDocument();
  });

  it('shows all sessions when no workspace active', () => {
    (useWorkspaceStore as any).mockReturnValue({
      activeWorkspaceId: null,
      workspaces: new Map(),
      setActiveWorkspace: vi.fn(),
    });

    (useSessionDiscoveryStore as any).mockReturnValue({
      sessions: [
        { id: 'cli-1', projectId: '-workspace', name: 'Session 1', source: 'cli', modifiedAt: Date.now(), createdAt: Date.now(), isSystem: false },
        { id: 'cli-2', projectId: '-workspace-docs', name: 'Session 2', source: 'cli', modifiedAt: Date.now(), createdAt: Date.now(), isSystem: false },
      ],
    });

    (useChatStore as any).mockReturnValue({
      sessions: [],
      hiddenSessionIds: new Set(),
      sessionId: null,
      switchSession: vi.fn(),
      deleteSession: vi.fn(),
    });

    render(<SessionList />);

    // Should show all sessions (backwards compat)
    expect(screen.getByText('Session 1')).toBeInTheDocument();
    expect(screen.getByText('Session 2')).toBeInTheDocument();
  });
});
