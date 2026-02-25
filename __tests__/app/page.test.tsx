import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '../../__tests__/test-utils';
import Home from '@/app/page';
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
      // Find the main flex container (may be nested in providers)
      const mainContainer = container.querySelector('.flex.h-screen');

      expect(mainContainer).toBeInTheDocument();
      expect(mainContainer).toHaveClass('flex');
      expect(mainContainer).toHaveClass('h-screen');
    });

    it('should render Sidebar as first child', () => {
      render(<Home />);
      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toBeInTheDocument();
    });

    it('should render main content area', () => {
      const { container } = render(<Home />);
      // Find the main content area with flex-1
      const mainContent = container.querySelector('.flex-1.flex.flex-col');

      expect(mainContent).toBeInTheDocument();
    });

    it('should render RightPanel', () => {
      render(<Home />);
      const rightPanel = screen.getByTestId('right-panel');
      expect(rightPanel).toBeInTheDocument();
    });

    it('should render all three main sections', () => {
      render(<Home />);

      const sidebar = screen.getByTestId('sidebar');
      const messageList = screen.getByTestId('message-list');
      const rightPanel = screen.getByTestId('right-panel');

      // All components should be in the document
      expect(sidebar).toBeInTheDocument();
      expect(messageList).toBeInTheDocument();
      expect(rightPanel).toBeInTheDocument();
    });

    it('should render in correct DOM order', () => {
      render(<Home />);

      const sidebar = screen.getByTestId('sidebar');
      const rightPanel = screen.getByTestId('right-panel');

      // Check DOM order by comparing positions
      // Verify sidebar appears before rightPanel in DOM
      expect(sidebar.compareDocumentPosition(rightPanel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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
    it('should render all three main sections', () => {
      render(<Home />);
      // Verify all three sections are present
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('message-list')).toBeInTheDocument();
      expect(screen.getByTestId('right-panel')).toBeInTheDocument();
    });

    it('should position Sidebar before MessageList', () => {
      render(<Home />);
      const sidebar = screen.getByTestId('sidebar');
      const messageList = screen.getByTestId('message-list');
      // Check sidebar comes before message list in DOM
      expect(sidebar.compareDocumentPosition(messageList) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('should render RightPanel', () => {
      render(<Home />);
      const rightPanel = screen.getByTestId('right-panel');
      expect(rightPanel).toBeInTheDocument();
    });

    it('should have main content area with flex-1', () => {
      const { container } = render(<Home />);
      // Find flex-1 element that contains the main content
      const mainContent = container.querySelector('.flex-1.flex.flex-col');
      expect(mainContent).toBeInTheDocument();
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
