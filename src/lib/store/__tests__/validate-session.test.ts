import { useChatStore } from '@/lib/store/index';
import { useWorkspaceStore } from '@/lib/store/workspaces';

// Make useChatStore available globally for the workspaces store to find
(global as any).useChatStore = useChatStore;

describe('validateLastActiveSession', () => {
  beforeEach(() => {
    // Reset stores
    useChatStore.setState({ sessions: [] });
    useWorkspaceStore.setState({ workspaces: new Map() });
  });

  it('should return sessionId when valid', () => {
    // Setup: Add session to store
    useChatStore.setState({
      sessions: [{
        id: 'session-123',
        name: 'Test',
        workspaceId: 'workspace-1',
        created_at: Date.now(),
        updated_at: Date.now(),
        cwd: '/workspace',
      }],
    });

    const store = useWorkspaceStore.getState();
    const result = store.validateLastActiveSession('workspace-1', 'session-123');

    expect(result).toBe('session-123');
  });

  it('should return null when session not found', () => {
    const store = useWorkspaceStore.getState();
    const result = store.validateLastActiveSession('workspace-1', 'nonexistent');

    expect(result).toBeNull();
  });

  it('should return null when workspace mismatch', () => {
    useChatStore.setState({
      sessions: [{
        id: 'session-123',
        name: 'Test',
        workspaceId: 'workspace-2',  // Different workspace
        created_at: Date.now(),
        updated_at: Date.now(),
        cwd: '/workspace',
      }],
    });

    const store = useWorkspaceStore.getState();
    const result = store.validateLastActiveSession('workspace-1', 'session-123');

    expect(result).toBeNull();
  });

  it('should return null when sessionId is undefined', () => {
    const store = useWorkspaceStore.getState();
    const result = store.validateLastActiveSession('workspace-1', undefined);

    expect(result).toBeNull();
  });
});
