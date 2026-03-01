import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CollapseAllButton } from '@/components/sidebar/CollapseAllButton';
import { useChatStore } from '@/lib/store';
import { useWorkspaceStore } from '@/lib/store/workspaces';

// Mock the logger
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('CollapseAllButton', () => {
  beforeEach(() => {
    // Reset stores before each test
    useChatStore.setState({
      collapsedProjects: new Set(),
      collapsedSections: new Set(),
    });

    useWorkspaceStore.setState({
      workspaces: new Map([
        ['workspace-1', {
          id: 'workspace-1',
          name: 'Workspace 1',
          rootPath: '/path1',
          projectId: 'project-1',
          sessionIds: [],
          activeSessionId: null,
          isArchived: false,
        }],
        ['workspace-2', {
          id: 'workspace-2',
          name: 'Workspace 2',
          rootPath: '/path2',
          projectId: 'project-2',
          sessionIds: [],
          activeSessionId: null,
          isArchived: false,
        }],
      ]),
    });
  });

  it('renders button', () => {
    render(<CollapseAllButton />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('shows "Collapse All" when expanded', () => {
    render(<CollapseAllButton />);
    expect(screen.getByText('Collapse All')).toBeInTheDocument();
    expect(screen.getByLabelText('Collapse all sections and workspaces')).toBeInTheDocument();
  });

  it('shows "Expand All" when collapsed', () => {
    // Collapse all workspaces and sections
    useChatStore.setState({
      collapsedProjects: new Set(['workspace-1', 'workspace-2']),
      collapsedSections: new Set(['home-workspace-1', 'home-workspace-2', 'system', 'unassigned']),
    });

    render(<CollapseAllButton />);
    expect(screen.getByText('Expand All')).toBeInTheDocument();
    expect(screen.getByLabelText('Expand all sections and workspaces')).toBeInTheDocument();
  });

  it('calls collapseAll when clicked while expanded', async () => {
    const user = userEvent.setup();
    const collapseAll = vi.fn();
    useChatStore.setState({ collapseAll });

    render(<CollapseAllButton />);

    const button = screen.getByRole('button');
    await user.click(button);

    expect(collapseAll).toHaveBeenCalledOnce();
  });

  it('calls expandAll when clicked while collapsed', async () => {
    const user = userEvent.setup();
    const expandAll = vi.fn();

    // Collapse all workspaces and sections
    useChatStore.setState({
      collapsedProjects: new Set(['workspace-1', 'workspace-2']),
      collapsedSections: new Set(['home-workspace-1', 'home-workspace-2', 'system', 'unassigned']),
      expandAll,
    });

    render(<CollapseAllButton />);

    const button = screen.getByRole('button');
    await user.click(button);

    expect(expandAll).toHaveBeenCalledOnce();
  });
});
