import { useChatStore } from '@/lib/store/index';
import { useWorkspaceStore } from '@/lib/store/workspaces';

// Make useChatStore available globally
(global as any).useChatStore = useChatStore;

describe('getMostRecentSessionForWorkspace', () => {
  beforeEach(() => {
    useChatStore.setState({ sessions: [] });
  });

  it('should return most recent session by updated_at', () => {
    const now = Date.now();
    useChatStore.setState({
      sessions: [
        {
          id: 'old',
          name: 'Old',
          workspaceId: 'workspace-1',
          created_at: now - 2000,
          updated_at: now - 2000,
          cwd: '/workspace',
        },
        {
          id: 'recent',
          name: 'Recent',
          workspaceId: 'workspace-1',
          created_at: now - 1000,
          updated_at: now - 500,  // Most recent
          cwd: '/workspace',
        },
        {
          id: 'middle',
          name: 'Middle',
          workspaceId: 'workspace-1',
          created_at: now - 1500,
          updated_at: now - 1000,
          cwd: '/workspace',
        },
      ],
    });

    const store = useWorkspaceStore.getState();
    const result = store.getMostRecentSessionForWorkspace('workspace-1');

    expect(result?.id).toBe('recent');
  });

  it('should return null when no sessions for workspace', () => {
    useChatStore.setState({
      sessions: [
        {
          id: 'other',
          name: 'Other',
          workspaceId: 'workspace-2',
          created_at: Date.now(),
          updated_at: Date.now(),
          cwd: '/workspace',
        },
      ],
    });

    const store = useWorkspaceStore.getState();
    const result = store.getMostRecentSessionForWorkspace('workspace-1');

    expect(result).toBeNull();
  });

  it('should return null when sessions array is empty', () => {
    const store = useWorkspaceStore.getState();
    const result = store.getMostRecentSessionForWorkspace('workspace-1');

    expect(result).toBeNull();
  });

  it('should ignore sessions without workspaceId', () => {
    useChatStore.setState({
      sessions: [
        {
          id: 'unassigned',
          name: 'Unassigned',
          // No workspaceId
          created_at: Date.now(),
          updated_at: Date.now(),
          cwd: '/workspace',
        },
      ],
    });

    const store = useWorkspaceStore.getState();
    const result = store.getMostRecentSessionForWorkspace('workspace-1');

    expect(result).toBeNull();
  });
});
