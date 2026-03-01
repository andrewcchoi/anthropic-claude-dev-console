import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from '../EmptyState';
import { MessageSquare } from 'lucide-react';

describe('EmptyState', () => {
  it('renders icon, title, description, and action', () => {
    const handleAction = vi.fn();

    render(
      <EmptyState
        icon={<MessageSquare data-testid="icon" />}
        title="No conversations"
        description="Start a new chat"
        action={<button onClick={handleAction}>New Chat</button>}
      />
    );

    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByText('No conversations')).toBeInTheDocument();
    expect(screen.getByText('Start a new chat')).toBeInTheDocument();

    const button = screen.getByText('New Chat');
    fireEvent.click(button);
    expect(handleAction).toHaveBeenCalled();
  });
});
