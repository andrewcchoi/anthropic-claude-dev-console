import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from './page';
import { useChatStore } from '@/lib/store';
import { useClaudeChat } from '@/hooks/useClaudeChat';

// Mock the hooks
vi.mock('@/hooks/useClaudeChat', () => ({
  useClaudeChat: vi.fn(),
}));

// Mock the child components
vi.mock('@/components/chat/ChatInput', () => ({
  ChatInput: () => <div data-testid="chat-input">ChatInput</div>,
}));

vi.mock('@/components/chat/MessageList', () => ({
  MessageList: () => <div data-testid="message-list">MessageList</div>,
}));

vi.mock('@/components/sidebar/Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
}));

vi.mock('@/components/sidebar/RightPanel', () => ({
  RightPanel: () => <div data-testid="right-panel">RightPanel</div>,
}));

vi.mock('@/components/usage/UsageDisplay', () => ({
  UsageDisplay: () => <div data-testid="usage-display">UsageDisplay</div>,
}));

describe('Home Page', () => {
  beforeEach(() => {
    // Mock useClaudeChat hook
    (useClaudeChat as any).mockReturnValue({
      messages: [],
      sendMessage: vi.fn(),
      isStreaming: false,
    });

    // Reset store state
    useChatStore.setState({
      error: null,
      sidebarOpen: true,
      isLoadingHistory: false,
    });
  });

  describe('layout structure', () => {
    it('should render main container with flex layout', () => {
      const { container } = render(<Home />);
      const mainContainer = container.firstChild as HTMLElement;

      expect(mainContainer).toHaveClass('flex');
      expect(mainContainer).toHaveClass('h-screen');
      expect(mainContainer).toHaveClass('overflow-hidden');
    });

    it('should render Sidebar as first child', () => {
      const { container } = render(<Home />);
      const mainContainer = container.firstChild as HTMLElement;
      const firstChild = mainContainer.firstChild;

      expect(firstChild).toHaveAttribute('data-testid', 'sidebar');
    });

    it('should render main content area as second child', () => {
      const { container } = render(<Home />);
      const mainContainer = container.firstChild as HTMLElement;
      const children = Array.from(mainContainer.children);

      expect(children[1]).toHaveClass('flex-1');
      expect(children[1]).toHaveClass('flex');
      expect(children[1]).toHaveClass('flex-col');
    });

    it('should render RightPanel as third child', () => {
      const { container } = render(<Home />);
      const mainContainer = container.firstChild as HTMLElement;
      const children = Array.from(mainContainer.children);

      expect(children[2]).toHaveAttribute('data-testid', 'right-panel');
    });

    it('should render all three main sections in correct order', () => {
      render(<Home />);

      const sidebar = screen.getByTestId('sidebar');
      const messageList = screen.getByTestId('message-list');
      const rightPanel = screen.getByTestId('right-panel');

      // All components should be in the document
      expect(sidebar).toBeInTheDocument();
      expect(messageList).toBeInTheDocument();
      expect(rightPanel).toBeInTheDocument();

      // Check DOM order
      const container = sidebar.parentElement;
      const children = Array.from(container?.children || []);
      const sidebarIndex = children.indexOf(sidebar);
      const rightPanelIndex = children.indexOf(rightPanel);

      expect(sidebarIndex).toBe(0);
      expect(rightPanelIndex).toBe(2);
    });
  });

  describe('main content area', () => {
    it('should render MessageList', () => {
      render(<Home />);
      expect(screen.getByTestId('message-list')).toBeInTheDocument();
    });

    it('should render UsageDisplay', () => {
      render(<Home />);
      expect(screen.getByTestId('usage-display')).toBeInTheDocument();
    });

    it('should render ChatInput', () => {
      render(<Home />);
      expect(screen.getByTestId('chat-input')).toBeInTheDocument();
    });

    it('should render error banner when error exists', () => {
      useChatStore.setState({ error: 'Test error message' });
      render(<Home />);

      const errorBanner = screen.getByText(/Test error message/);
      expect(errorBanner).toBeInTheDocument();
      expect(errorBanner.closest('div')).toHaveClass('bg-red-600');
    });

    it('should not render error banner when no error', () => {
      useChatStore.setState({ error: null });
      render(<Home />);

      expect(screen.queryByText(/Error:/)).not.toBeInTheDocument();
    });
  });

  describe('three-column layout', () => {
    it('should have three direct children in flex container', () => {
      const { container } = render(<Home />);
      const mainContainer = container.firstChild as HTMLElement;
      const children = Array.from(mainContainer.children);

      expect(children.length).toBe(3);
    });

    it('should position Sidebar on the left', () => {
      render(<Home />);
      const sidebar = screen.getByTestId('sidebar');
      const container = sidebar.parentElement as HTMLElement;

      expect(container.firstChild).toBe(sidebar);
    });

    it('should position RightPanel on the right', () => {
      render(<Home />);
      const rightPanel = screen.getByTestId('right-panel');
      const container = rightPanel.parentElement as HTMLElement;

      expect(container.lastChild).toBe(rightPanel);
    });

    it('should have main content flex-1 between sidebars', () => {
      const { container } = render(<Home />);
      const mainContainer = container.firstChild as HTMLElement;
      const children = Array.from(mainContainer.children);

      // Middle child should have flex-1
      expect(children[1]).toHaveClass('flex-1');
    });
  });

  describe('responsive behavior', () => {
    it('should maintain layout structure with all components', () => {
      render(<Home />);

      // Verify all main layout components are present
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('message-list')).toBeInTheDocument();
      expect(screen.getByTestId('chat-input')).toBeInTheDocument();
      expect(screen.getByTestId('usage-display')).toBeInTheDocument();
      expect(screen.getByTestId('right-panel')).toBeInTheDocument();
    });
  });
});
