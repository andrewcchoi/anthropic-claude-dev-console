import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RightPanel } from './RightPanel';
import { useChatStore } from '@/lib/store';

// Mock the child components
vi.mock('@/components/ui/ThemeToggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle">ThemeToggle</div>,
}));

vi.mock('@/components/ui/ModelSelector', () => ({
  ModelSelector: () => <div data-testid="model-selector">ModelSelector</div>,
}));

vi.mock('@/components/ui/ProviderSelector', () => ({
  ProviderSelector: () => <div data-testid="provider-selector">ProviderSelector</div>,
}));

describe('RightPanel', () => {
  beforeEach(() => {
    // Reset store state before each test
    useChatStore.setState({
      rightPanelOpen: true,
    });
  });

  describe('when panel is open', () => {
    it('should render the panel with Settings title', () => {
      render(<RightPanel />);
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<RightPanel />);
      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toBeInTheDocument();
    });

    it('should render all three selectors in correct order', () => {
      render(<RightPanel />);

      const themeToggle = screen.getByTestId('theme-toggle');
      const providerSelector = screen.getByTestId('provider-selector');
      const modelSelector = screen.getByTestId('model-selector');

      expect(themeToggle).toBeInTheDocument();
      expect(providerSelector).toBeInTheDocument();
      expect(modelSelector).toBeInTheDocument();

      // Check order by DOM position
      const container = themeToggle.parentElement;
      const children = Array.from(container?.children || []);
      const themeIndex = children.indexOf(themeToggle);
      const providerIndex = children.indexOf(providerSelector);
      const modelIndex = children.indexOf(modelSelector);

      expect(themeIndex).toBeLessThan(providerIndex);
      expect(providerIndex).toBeLessThan(modelIndex);
    });

    it('should close panel when close button is clicked', () => {
      const { rerender } = render(<RightPanel />);

      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      // Verify store was updated
      expect(useChatStore.getState().rightPanelOpen).toBe(false);

      // Rerender with new state
      rerender(<RightPanel />);

      // Panel content should not be visible
      expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    });

    it('should have fixed positioning on the right side', () => {
      const { container } = render(<RightPanel />);
      const panel = container.querySelector('[data-panel="right"]');

      expect(panel).toHaveClass('fixed');
      expect(panel).toHaveClass('right-0');
    });

    it('should have correct width when open', () => {
      const { container } = render(<RightPanel />);
      const panel = container.querySelector('[data-panel="right"]');

      expect(panel).toHaveClass('w-64');
    });

    it('should have border on the left side', () => {
      const { container } = render(<RightPanel />);
      const panel = container.querySelector('[data-panel="right"]');

      expect(panel).toHaveClass('border-l');
    });
  });

  describe('when panel is collapsed', () => {
    beforeEach(() => {
      useChatStore.setState({
        rightPanelOpen: false,
      });
    });

    it('should render gear/settings icon button', () => {
      render(<RightPanel />);

      const openButton = screen.getByRole('button', { name: /settings/i });
      expect(openButton).toBeInTheDocument();
    });

    it('should not render Settings title when collapsed', () => {
      render(<RightPanel />);

      expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    });

    it('should not render selectors when collapsed', () => {
      render(<RightPanel />);

      expect(screen.queryByTestId('theme-toggle')).not.toBeInTheDocument();
      expect(screen.queryByTestId('provider-selector')).not.toBeInTheDocument();
      expect(screen.queryByTestId('model-selector')).not.toBeInTheDocument();
    });

    it('should open panel when gear button is clicked', () => {
      const { rerender } = render(<RightPanel />);

      const openButton = screen.getByRole('button', { name: /settings/i });
      fireEvent.click(openButton);

      // Verify store was updated
      expect(useChatStore.getState().rightPanelOpen).toBe(true);

      // Rerender with new state
      rerender(<RightPanel />);

      // Panel should now be visible
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should have fixed positioning on top-right when collapsed', () => {
      const { container } = render(<RightPanel />);
      const button = screen.getByRole('button', { name: /settings/i });

      expect(button).toHaveClass('fixed');
      expect(button).toHaveClass('right-4');
      expect(button).toHaveClass('top-4');
    });
  });

  describe('styling', () => {
    it('should use gray background colors matching left sidebar', () => {
      const { container } = render(<RightPanel />);
      const panel = container.querySelector('[data-panel="right"]');

      // Should have light/dark mode background
      expect(panel?.className).toMatch(/bg-gray-(50|900)/);
    });

    it('should have correct height (full screen)', () => {
      const { container } = render(<RightPanel />);
      const panel = container.querySelector('[data-panel="right"]');

      expect(panel).toHaveClass('h-screen');
    });
  });

  describe('accessibility', () => {
    it('should have proper aria-label on close button', () => {
      render(<RightPanel />);

      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toHaveAttribute('aria-label');
    });

    it('should have proper aria-label on open button when collapsed', () => {
      useChatStore.setState({ rightPanelOpen: false });
      render(<RightPanel />);

      const openButton = screen.getByRole('button', { name: /settings/i });
      expect(openButton).toHaveAttribute('aria-label');
    });
  });
});
