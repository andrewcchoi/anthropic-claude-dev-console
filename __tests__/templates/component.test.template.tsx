/**
 * Component Test Template
 * Layer 3: Test UI components with mocked dependencies
 *
 * Copy this template and replace [ComponentName] with your component
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { [ComponentName] } from '@/components/[path]/[ComponentName]';

// Mock dependencies
vi.mock('@/lib/store', () => ({
  useChatStore: vi.fn(),
}));

vi.mock('@/hooks/use[Hook]', () => ({
  use[Hook]: vi.fn(),
}));

describe('[ComponentName] Component Tests (Layer 3)', () => {
  const mockProps = {
    // Default props
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    (useChatStore as any).mockReturnValue({
      // ...mock store state
    });

    (use[Hook] as any).mockReturnValue({
      // ...mock hook return
    });
  });

  describe('Rendering', () => {
    it('should render with props', () => {
      render(<[ComponentName] {...mockProps} />);

      expect(screen.getByText('Expected Text')).toBeInTheDocument();
    });

    it('should render loading state', () => {
      (use[Hook] as any).mockReturnValue({ isLoading: true });

      render(<[ComponentName] {...mockProps} />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should render error state', () => {
      (use[Hook] as any).mockReturnValue({ error: 'Test error' });

      render(<[ComponentName] {...mockProps} />);

      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });

    it('should conditionally render based on prop', () => {
      const { rerender } = render(<[ComponentName] show={false} />);

      expect(screen.queryByText('Conditional Content')).not.toBeInTheDocument();

      rerender(<[ComponentName] show={true} />);

      expect(screen.getByText('Conditional Content')).toBeInTheDocument();
    });
  });

  describe('User interactions', () => {
    it('should call handler with correct arguments on click', async () => {
      const mockHandler = vi.fn();
      (useChatStore as any).mockReturnValue({
        handleAction: mockHandler,
      });

      render(<[ComponentName] {...mockProps} />);

      await userEvent.click(screen.getByRole('button', { name: /action/i }));

      // CRITICAL: Verify ALL arguments are passed correctly
      expect(mockHandler).toHaveBeenCalledWith(
        'expectedArg1',
        'expectedArg2',  // ← Don't forget second parameter!
      );
    });

    it('should call handler on input change', async () => {
      const mockChange = vi.fn();

      render(<[ComponentName] onChange={mockChange} />);

      await userEvent.type(screen.getByRole('textbox'), 'test input');

      expect(mockChange).toHaveBeenCalled();
    });

    it('should submit form with correct data', async () => {
      const mockSubmit = vi.fn();

      render(<[ComponentName] onSubmit={mockSubmit} />);

      await userEvent.type(screen.getByLabelText(/name/i), 'Test Name');
      await userEvent.click(screen.getByRole('button', { name: /submit/i }));

      expect(mockSubmit).toHaveBeenCalledWith({
        name: 'Test Name',
        // ...other form data
      });
    });
  });

  describe('Event handler arguments', () => {
    // CRITICAL TEST: Verify event handlers pass ALL required arguments
    it('should pass all required arguments to callback', async () => {
      const mockCallback = vi.fn();

      render(<[ComponentName] onAction={mockCallback} itemId="item-123" />);

      await userEvent.click(screen.getByText('Item'));

      // Verify parameter count
      expect(mockCallback).toHaveBeenCalledTimes(1);

      // Verify each parameter
      const callArgs = mockCallback.mock.calls[0];
      expect(callArgs).toHaveLength(2); // Expected number of args
      expect(callArgs[0]).toBe('item-123'); // First arg
      expect(callArgs[1]).toBeDefined(); // Second arg (if applicable)
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<[ComponentName] {...mockProps} />);

      expect(screen.getByRole('button')).toHaveAccessibleName();
    });

    it('should be keyboard navigable', async () => {
      render(<[ComponentName] {...mockProps} />);

      await userEvent.tab();

      expect(screen.getByRole('button')).toHaveFocus();
    });
  });
});
