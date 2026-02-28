// __tests__/components/sidebar/UnassignedSessionsSection.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UnassignedSessionsSection } from '@/components/sidebar/UnassignedSessionsSection';
import type { CLISession } from '@/types/sessions';

const mockSessions: CLISession[] = [
  {
    id: 'session-1',
    name: 'Test Session 1',
    projectId: '-workspace',
    source: 'cli' as const,
    filePath: '/home/user/.claude/projects/-workspace/session-1.jsonl',
    fileSize: 1024,
    modifiedAt: Date.now(),
    createdAt: Date.now() - 1000 * 60 * 60, // 1 hour ago
    cwd: '/workspace',
    messageCount: 5,
    gitBranch: 'main',
  },
  {
    id: 'session-2',
    name: 'Test Session 2',
    projectId: '-workspace',
    source: 'cli' as const,
    filePath: '/home/user/.claude/projects/-workspace/session-2.jsonl',
    fileSize: 2048,
    modifiedAt: Date.now() - 1000 * 60 * 30, // 30 min ago
    createdAt: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
    cwd: '/workspace',
    messageCount: 3,
    gitBranch: 'feature-branch',
  },
];

describe('UnassignedSessionsSection', () => {
  it('should render section header with emoji and count', () => {
    render(
      <UnassignedSessionsSection
        workspaceId="workspace-1"
        sessions={mockSessions}
        isCollapsed={false}
        onToggle={vi.fn()}
      />
    );

    expect(screen.getByText(/❓/)).toBeInTheDocument();
    expect(screen.getByText(/Unassigned Sessions \(2\)/)).toBeInTheDocument();
  });

  it('should apply orange color tint to header', () => {
    const { container } = render(
      <UnassignedSessionsSection
        workspaceId="workspace-1"
        sessions={mockSessions}
        isCollapsed={false}
        onToggle={vi.fn()}
      />
    );

    const header = container.querySelector('.bg-orange-50');
    expect(header).toBeInTheDocument();
  });

  it('should show sessions when not collapsed', () => {
    render(
      <UnassignedSessionsSection
        workspaceId="workspace-1"
        sessions={mockSessions}
        isCollapsed={false}
        onToggle={vi.fn()}
      />
    );

    expect(screen.getByText('Test Session 1')).toBeInTheDocument();
    expect(screen.getByText('Test Session 2')).toBeInTheDocument();
  });

  it('should hide sessions when collapsed', () => {
    render(
      <UnassignedSessionsSection
        workspaceId="workspace-1"
        sessions={mockSessions}
        isCollapsed={true}
        onToggle={vi.fn()}
      />
    );

    expect(screen.queryByText('Test Session 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Test Session 2')).not.toBeInTheDocument();
  });

  it('should call onToggle when header clicked', () => {
    const mockToggle = vi.fn();
    render(
      <UnassignedSessionsSection
        workspaceId="workspace-1"
        sessions={mockSessions}
        isCollapsed={false}
        onToggle={mockToggle}
      />
    );

    const header = screen.getByRole('button', { name: /Unassigned Sessions/ });
    fireEvent.click(header);

    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it('should show empty state when no sessions', () => {
    render(
      <UnassignedSessionsSection
        workspaceId="workspace-1"
        sessions={[]}
        isCollapsed={false}
        onToggle={vi.fn()}
      />
    );

    expect(screen.getByText(/No unassigned sessions/i)).toBeInTheDocument();
  });

  it('should have accessible ARIA labels', () => {
    render(
      <UnassignedSessionsSection
        workspaceId="workspace-1"
        sessions={mockSessions}
        isCollapsed={false}
        onToggle={vi.fn()}
      />
    );

    const section = screen.getByRole('region');
    expect(section).toHaveAttribute('aria-label', 'Unassigned sessions for workspace');
  });
});
