import { useChatStore } from '@/lib/store/index';
import { useWorkspaceStore } from '@/lib/store/workspaces';

// Make both stores available globally for cross-store access
(global as any).useChatStore = useChatStore;
(global as any).useWorkspaceStore = useWorkspaceStore;

describe('switchSession integration', () => {
  beforeEach(() => {
    useChatStore.setState({ sessions: [], sessionCache: new Map() });
    useWorkspaceStore.setState({
      workspaces: new Map([
        ['workspace-1', {
          id: 'workspace-1',
          name: 'Test',
          providerId: 'provider-1',
          providerType: 'local',
          rootPath: '/test',
          color: '#3B82F6',
          sessionId: null,
          sessionIds: ['session-123'],
          expandedFolders: new Set(),
          selectedFile: null,
          fileActivity: new Map(),
          createdAt: Date.now(),
          lastAccessedAt: Date.now(),
        }],
      ]),
    });
  });

  it('should update workspace lastActiveSessionId when switching session', async () => {
    // Setup session with cached messages to avoid API call
    const session = {
      id: 'session-123',
      name: 'Test',
      workspaceId: 'workspace-1',
      created_at: Date.now(),
      updated_at: Date.now(),
      cwd: '/test',
    };

    useChatStore.setState({
      sessions: [session],
      sessionCache: new Map([
        ['session-123', {
          messages: [],
          toolExecutions: [],
          timestamp: Date.now(),
        }],
      ]),
    });

    // Switch session (will use cache, no API call)
    await useChatStore.getState().switchSession('session-123');

    // Verify workspace updated
    const workspace = useWorkspaceStore.getState().workspaces.get('workspace-1');
    expect(workspace?.lastActiveSessionId).toBe('session-123');
  });

  it('should not update workspace for session without workspaceId', async () => {
    useChatStore.setState({
      sessions: [{
        id: 'unassigned',
        name: 'Unassigned',
        // No workspaceId
        created_at: Date.now(),
        updated_at: Date.now(),
        cwd: '/workspace',
      }],
      sessionCache: new Map([
        ['unassigned', {
          messages: [],
          toolExecutions: [],
          timestamp: Date.now(),
        }],
      ]),
    });

    await useChatStore.getState().switchSession('unassigned');

    // No workspace should be updated
    const workspace = useWorkspaceStore.getState().workspaces.get('workspace-1');
    expect(workspace?.lastActiveSessionId).toBeUndefined();
  });
});
