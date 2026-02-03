import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { useChatStore } from '@/lib/store';

// Mock the store
vi.mock('@/lib/store', () => ({
  useChatStore: vi.fn(),
}));

// Mock child components
vi.mock('@/components/sidebar/SessionList', () => ({
  SessionList: () => <div data-testid="session-list">SessionList Mock</div>,
}));

// Mock components that should be removed
vi.mock('@/components/ui/ThemeToggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle">ThemeToggle Mock</div>,
}));

vi.mock('@/components/ui/ModelSelector', () => ({
  ModelSelector: () => <div data-testid="model-selector">ModelSelector Mock</div>,
}));

vi.mock('@/components/ui/ProviderSelector', () => ({
  ProviderSelector: () => <div data-testid="provider-selector">ProviderSelector Mock</div>,
}));

describe('Sidebar Component - Selector Removal', () => {
  const mockToggleSidebar = vi.fn();
  const mockStartNewSession = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock store state with sidebar open
    vi.mocked(useChatStore).mockReturnValue({
      sidebarOpen: true,
      toggleSidebar: mockToggleSidebar,
      startNewSession: mockStartNewSession,
      currentModel: 'claude-3-opus-20240229',
      // Add other required store properties as needed
    } as any);
  });

  describe('Components that should NOT be rendered', () => {
    it('should NOT render ThemeToggle component', () => {
      render(<Sidebar />);

      const themeToggle = screen.queryByTestId('theme-toggle');
      expect(themeToggle).not.toBeInTheDocument();
    });

    it('should NOT render ModelSelector component', () => {
      render(<Sidebar />);

      const modelSelector = screen.queryByTestId('model-selector');
      expect(modelSelector).not.toBeInTheDocument();
    });

    it('should NOT render ProviderSelector component', () => {
      render(<Sidebar />);

      const providerSelector = screen.queryByTestId('provider-selector');
      expect(providerSelector).not.toBeInTheDocument();
    });
  });

  describe('Components that SHOULD be rendered', () => {
    it('should render the header with title', () => {
      render(<Sidebar />);

      const title = screen.getByText('Claude Code UI');
      expect(title).toBeInTheDocument();
    });

    it('should render the close button in header', () => {
      render(<Sidebar />);

      const closeButton = screen.getByRole('button', { name: /✕/i });
      expect(closeButton).toBeInTheDocument();
    });

    it('should render the "New Chat" button', () => {
      render(<Sidebar />);

      const newChatButton = screen.getByRole('button', { name: /\+ New Chat/i });
      expect(newChatButton).toBeInTheDocument();
    });

    it('should render the SessionList component', () => {
      render(<Sidebar />);

      const sessionList = screen.getByTestId('session-list');
      expect(sessionList).toBeInTheDocument();
    });

    it('should render the History section label', () => {
      render(<Sidebar />);

      const historyLabel = screen.getByText('History');
      expect(historyLabel).toBeInTheDocument();
    });

    it('should render the footer with Working Directory', () => {
      render(<Sidebar />);

      const workingDirLabel = screen.getByText('Working Directory:');
      expect(workingDirLabel).toBeInTheDocument();

      const workingDirPath = screen.getByText('/workspace');
      expect(workingDirPath).toBeInTheDocument();
    });

    it('should render the current model in footer', () => {
      render(<Sidebar />);

      const modelLabel = screen.getByText('Model:');
      expect(modelLabel).toBeInTheDocument();

      const modelValue = screen.getByText('claude-3-opus-20240229');
      expect(modelValue).toBeInTheDocument();
    });
  });

  describe('Sidebar toggle button when closed', () => {
    it('should render toggle button when sidebar is closed', () => {
      vi.mocked(useChatStore).mockReturnValue({
        sidebarOpen: false,
        toggleSidebar: mockToggleSidebar,
        startNewSession: mockStartNewSession,
        currentModel: null,
      } as any);

      render(<Sidebar />);

      const toggleButton = screen.getByRole('button', { name: /☰/i });
      expect(toggleButton).toBeInTheDocument();
    });

    it('should NOT render ThemeToggle when sidebar is closed', () => {
      vi.mocked(useChatStore).mockReturnValue({
        sidebarOpen: false,
        toggleSidebar: mockToggleSidebar,
        startNewSession: mockStartNewSession,
        currentModel: null,
      } as any);

      render(<Sidebar />);

      const themeToggle = screen.queryByTestId('theme-toggle');
      expect(themeToggle).not.toBeInTheDocument();
    });
  });

  describe('Structure validation', () => {
    it('should have proper structure: header, action area, history, footer', () => {
      render(<Sidebar />);

      // Check header exists
      const header = screen.getByText('Claude Code UI').closest('div');
      expect(header).toBeInTheDocument();

      // Check "New Chat" button exists (action area)
      const newChatButton = screen.getByRole('button', { name: /\+ New Chat/i });
      expect(newChatButton).toBeInTheDocument();

      // Check history section exists
      const historyLabel = screen.getByText('History');
      expect(historyLabel).toBeInTheDocument();

      // Check footer exists
      const workingDirLabel = screen.getByText('Working Directory:');
      expect(workingDirLabel).toBeInTheDocument();
    });

    it('should NOT have any border-t divs wrapping removed selectors', () => {
      const { container } = render(<Sidebar />);

      // Get all divs with border-t class
      const borderDivs = container.querySelectorAll('div.border-t');

      // Should only have the footer border-t (one for history section if exists)
      // After removal, we should have fewer border-t elements
      const borderDivsArray = Array.from(borderDivs);

      // None of the border-t divs should contain the removed components
      borderDivsArray.forEach((div) => {
        expect(div.querySelector('[data-testid="theme-toggle"]')).not.toBeInTheDocument();
        expect(div.querySelector('[data-testid="model-selector"]')).not.toBeInTheDocument();
        expect(div.querySelector('[data-testid="provider-selector"]')).not.toBeInTheDocument();
      });
    });
  });
});
