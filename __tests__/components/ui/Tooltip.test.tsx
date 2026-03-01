import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Tooltip } from '@/components/ui/Tooltip';

describe('Tooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children', () => {
    render(
      <Tooltip content="Test tooltip">
        <button>Hover me</button>
      </Tooltip>
    );

    expect(screen.getByText('Hover me')).toBeInTheDocument();
  });

  it('shows tooltip after delay on mouse enter', async () => {
    render(
      <Tooltip content="Test tooltip" delay={500}>
        <button>Hover me</button>
      </Tooltip>
    );

    const button = screen.getByText('Hover me');
    fireEvent.mouseEnter(button);

    // Tooltip should not be visible immediately
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    // Fast-forward time
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    // Tooltip should now be visible
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByText('Test tooltip')).toBeInTheDocument();
  });

  it('hides tooltip on mouse leave', async () => {
    render(
      <Tooltip content="Test tooltip" delay={500}>
        <button>Hover me</button>
      </Tooltip>
    );

    const button = screen.getByText('Hover me');
    fireEvent.mouseEnter(button);

    // Fast-forward to show tooltip
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    // Mouse leave
    fireEvent.mouseLeave(button);

    // Tooltip should be hidden
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('is keyboard accessible (focus/blur)', async () => {
    render(
      <Tooltip content="Test tooltip" delay={500}>
        <button>Focus me</button>
      </Tooltip>
    );

    const button = screen.getByText('Focus me');

    // Focus the button
    fireEvent.focus(button);

    // Fast-forward time
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    // Tooltip should be visible
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    // Blur the button
    fireEvent.blur(button);

    // Tooltip should be hidden
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('positions tooltip on the right by default', async () => {
    // Mock getBoundingClientRect to simulate enough space on right
    const mockGetBoundingClientRect = vi.fn(() => ({
      right: 100,
      left: 0,
      top: 0,
      bottom: 0,
      width: 100,
      height: 20,
      x: 0,
      y: 0,
      toJSON: () => {},
    }));

    // Mock window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1920,
    });

    render(
      <Tooltip content="Test tooltip" delay={500}>
        <button>Hover me</button>
      </Tooltip>
    );

    const button = screen.getByText('Hover me');
    const container = button.parentElement;

    if (container) {
      container.getBoundingClientRect = mockGetBoundingClientRect;
    }

    fireEvent.mouseEnter(button);

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveClass('left-full');
    expect(tooltip).toHaveClass('ml-2');
  });

  it('flips tooltip to left when near viewport edge', async () => {
    // Mock getBoundingClientRect to simulate near right edge
    const mockGetBoundingClientRect = vi.fn(() => ({
      right: 1850, // Near edge of 1920px viewport
      left: 1750,
      top: 0,
      bottom: 0,
      width: 100,
      height: 20,
      x: 1750,
      y: 0,
      toJSON: () => {},
    }));

    // Mock window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1920,
    });

    render(
      <Tooltip content="Test tooltip" delay={500}>
        <button>Hover me</button>
      </Tooltip>
    );

    const button = screen.getByText('Hover me');
    const container = button.parentElement;

    if (container) {
      container.getBoundingClientRect = mockGetBoundingClientRect;
    }

    fireEvent.mouseEnter(button);

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveClass('right-full');
    expect(tooltip).toHaveClass('mr-2');
  });

  it('has ARIA role="tooltip"', async () => {
    render(
      <Tooltip content="Test tooltip" delay={500}>
        <button>Hover me</button>
      </Tooltip>
    );

    const button = screen.getByText('Hover me');
    fireEvent.mouseEnter(button);

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveAttribute('role', 'tooltip');
  });

  it('cancels tooltip show timer on mouse leave before delay', async () => {
    render(
      <Tooltip content="Test tooltip" delay={500}>
        <button>Hover me</button>
      </Tooltip>
    );

    const button = screen.getByText('Hover me');
    fireEvent.mouseEnter(button);

    // Wait only 200ms (less than delay)
    vi.advanceTimersByTime(200);

    // Mouse leave before tooltip shows
    fireEvent.mouseLeave(button);

    // Fast-forward remaining time
    vi.advanceTimersByTime(500);

    // Tooltip should never appear
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('does not show tooltip when content is empty', async () => {
    render(
      <Tooltip content="" delay={500}>
        <button>Hover me</button>
      </Tooltip>
    );

    const button = screen.getByText('Hover me');
    fireEvent.mouseEnter(button);

    vi.advanceTimersByTime(500);

    // Tooltip should not appear
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('truncates long content properly', async () => {
    const longContent = 'This is a very long tooltip content that should wrap within the max-w-xs container and not overflow the viewport';

    render(
      <Tooltip content={longContent} delay={500}>
        <button>Hover me</button>
      </Tooltip>
    );

    const button = screen.getByText('Hover me');
    fireEvent.mouseEnter(button);

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveClass('max-w-xs');
    expect(tooltip).toHaveClass('whitespace-normal');
    expect(tooltip.textContent).toBe(longContent);
  });
});
