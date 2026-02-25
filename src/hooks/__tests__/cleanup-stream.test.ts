import { renderHook, act } from '@testing-library/react';
import { useClaudeChat } from '@/hooks/useClaudeChat';
import { useChatStore } from '@/lib/store';
import { vi } from 'vitest';

// Mock EventSource
class MockEventSource {
  public close = vi.fn();
  public addEventListener = vi.fn();
  public removeEventListener = vi.fn();
}

(global as any).EventSource = MockEventSource;

// Make useChatStore available globally
(global as any).useChatStore = useChatStore;

describe('cleanupStream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useChatStore.setState({
      isStreaming: false,
      messages: [],
      sessions: [],
      sessionId: null,
    });
  });

  it('should be exported as a function', () => {
    const { result } = renderHook(() => useClaudeChat());

    expect(result.current).toHaveProperty('cleanupStream');
    expect(typeof result.current.cleanupStream).toBe('function');
  });

  it('should reset isStreaming state when called', () => {
    const { result } = renderHook(() => useClaudeChat());

    // Simulate active stream
    useChatStore.setState({ isStreaming: true });

    act(() => {
      result.current.cleanupStream();
    });

    expect(useChatStore.getState().isStreaming).toBe(false);
  });

  it('should do nothing if no active stream', () => {
    const { result } = renderHook(() => useClaudeChat());

    // No active stream
    useChatStore.setState({ isStreaming: false });

    // Should not throw
    expect(() => {
      act(() => {
        result.current.cleanupStream();
      });
    }).not.toThrow();

    expect(useChatStore.getState().isStreaming).toBe(false);
  });

  it('should be callable multiple times without errors', () => {
    const { result } = renderHook(() => useClaudeChat());

    expect(() => {
      act(() => {
        result.current.cleanupStream();
        result.current.cleanupStream();
        result.current.cleanupStream();
      });
    }).not.toThrow();
  });
});
