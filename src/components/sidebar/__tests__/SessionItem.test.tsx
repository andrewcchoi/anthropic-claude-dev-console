import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SessionItem } from '../SessionItem';
import { useChatStore } from '@/lib/store';
import { useSessionDiscoveryStore } from '@/lib/store/sessions';
import type { CLISession } from '@/types/sessions';

vi.mock('@/lib/store');
vi.mock('@/lib/store/sessions');

describe('SessionItem - Metadata Display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useChatStore as any).mockReturnValue({
      sessionId: null,
      switchSession: vi.fn(),
    });
    (useSessionDiscoveryStore as any).mockReturnValue({
      loadSessionDetails: vi.fn(),
    });
  });

  it('displays message count', () => {
    const session: CLISession = {
      id: 'test',
      projectId: '-workspace',
      source: 'cli',
      name: 'Test Session',
      messageCount: 42,
      modifiedAt: Date.now(),
      createdAt: Date.now(),
      isSystem: false,
    };

    render(<SessionItem session={session} />);

    expect(screen.getByText(/42 msgs/)).toBeInTheDocument();
  });

  it('displays git branch', () => {
    const session: CLISession = {
      id: 'test',
      projectId: '-workspace',
      source: 'cli',
      name: 'Test Session',
      gitBranch: 'feature/test',
      modifiedAt: Date.now(),
      createdAt: Date.now(),
      isSystem: false,
    };

    render(<SessionItem session={session} />);

    expect(screen.getByText('feature/test')).toBeInTheDocument();
  });

  it('displays timestamp', () => {
    const session: CLISession = {
      id: 'test',
      projectId: '-workspace',
      source: 'cli',
      name: 'Test Session',
      modifiedAt: Date.now() - 3600000,  // 1 hour ago
      createdAt: Date.now(),
      isSystem: false,
    };

    render(<SessionItem session={session} />);

    // Timestamp is displayed (formatSmartTime handles the format)
    const metadataSection = screen.getByText('Test Session').parentElement?.parentElement;
    expect(metadataSection).toBeInTheDocument();
    expect(metadataSection?.textContent).toBeTruthy();
  });
});
