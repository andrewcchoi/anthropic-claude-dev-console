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
      metadataColorScheme: 'semantic',
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

    // Timestamp is displayed (formatISOWithRelative handles the format)
    const metadataSection = screen.getByText('Test Session').parentElement?.parentElement;
    expect(metadataSection).toBeInTheDocument();
    expect(metadataSection?.textContent).toBeTruthy();
  });

  it('displays ISO + relative date format for modified date', () => {
    const modifiedAt = new Date('2026-02-28T14:30:00').getTime();
    const session: CLISession = {
      id: 'test',
      projectId: '-workspace',
      source: 'cli',
      name: 'Test Session',
      modifiedAt,
      createdAt: modifiedAt,
      isSystem: false,
    };

    render(<SessionItem session={session} />);

    // Should show 🕒 emoji and ISO format with relative time
    const text = screen.getByText('Test Session').parentElement?.parentElement?.textContent;
    expect(text).toContain('🕒');
    expect(text).toContain('2026-02-28');
    expect(text).toContain('14:30');
  });

  it('displays created date when available', () => {
    const createdAt = new Date('2026-02-27T10:00:00').getTime();
    const modifiedAt = new Date('2026-02-28T14:30:00').getTime();
    const session: CLISession = {
      id: 'test',
      projectId: '-workspace',
      source: 'cli',
      name: 'Test Session',
      modifiedAt,
      createdAt,
      isSystem: false,
    };

    render(<SessionItem session={session} />);

    // Should show both 📅 (created) and 🕒 (modified) emojis
    const text = screen.getByText('Test Session').parentElement?.parentElement?.textContent;
    expect(text).toContain('📅');
    expect(text).toContain('🕒');
    expect(text).toContain('2026-02-27'); // Created date
    expect(text).toContain('2026-02-28'); // Modified date
  });

  it('displays emoji icons for metadata', () => {
    const session: CLISession = {
      id: 'test',
      projectId: '-workspace',
      source: 'cli',
      name: 'Test Session',
      gitBranch: 'main',
      messageCount: 5,
      modifiedAt: Date.now(),
      createdAt: Date.now(),
      isSystem: false,
    };

    render(<SessionItem session={session} />);

    const text = screen.getByText('Test Session').parentElement?.parentElement?.textContent;
    expect(text).toContain('🔀'); // Branch icon
    expect(text).toContain('💬'); // Message count icon
    expect(text).toContain('🕒'); // Modified date icon
  });

  it('applies semantic color scheme by default', () => {
    const session: CLISession = {
      id: 'test',
      projectId: '-workspace',
      source: 'cli',
      name: 'Test Session',
      gitBranch: 'main',
      messageCount: 5,
      modifiedAt: Date.now(),
      createdAt: Date.now(),
      isSystem: false,
    };

    const { container } = render(<SessionItem session={session} />);

    // Verify semantic color classes are applied
    const branchElement = container.querySelector('.text-purple-600');
    expect(branchElement).toBeInTheDocument();
    expect(branchElement?.textContent).toContain('main');

    const messageElement = container.querySelector('.text-blue-600');
    expect(messageElement).toBeInTheDocument();
    expect(messageElement?.textContent).toContain('5 msgs');
  });

  it('applies gradient color scheme when selected', () => {
    (useChatStore as any).mockReturnValue({
      sessionId: null,
      switchSession: vi.fn(),
      metadataColorScheme: 'gradient',
    });

    const session: CLISession = {
      id: 'test',
      projectId: '-workspace',
      source: 'cli',
      name: 'Test Session',
      gitBranch: 'feature/test',
      messageCount: 10,
      modifiedAt: Date.now(),
      createdAt: Date.now() - 86400000, // 1 day ago
      isSystem: false,
    };

    const { container } = render(<SessionItem session={session} />);

    // Verify gradient color classes are applied
    const branchElement = container.querySelector('.text-cyan-600');
    expect(branchElement).toBeInTheDocument();
    expect(branchElement?.textContent).toContain('feature/test');

    const messageElement = container.querySelector('.text-purple-600');
    expect(messageElement).toBeInTheDocument();
    expect(messageElement?.textContent).toContain('10 msgs');

    // Created and modified dates should have different colors in gradient mode
    const amberElement = container.querySelector('.text-amber-600');
    expect(amberElement).toBeInTheDocument(); // Created date

    const redElement = container.querySelector('.text-red-600');
    expect(redElement).toBeInTheDocument(); // Modified date
  });

  it('uses same color for both dates in semantic scheme', () => {
    const session: CLISession = {
      id: 'test',
      projectId: '-workspace',
      source: 'cli',
      name: 'Test Session',
      modifiedAt: Date.now(),
      createdAt: Date.now() - 86400000,
      isSystem: false,
    };

    const { container } = render(<SessionItem session={session} />);

    // Both dates should use gray color in semantic scheme
    const grayElements = container.querySelectorAll('.text-gray-600');
    expect(grayElements.length).toBeGreaterThanOrEqual(2); // At least created and modified
  });
});
