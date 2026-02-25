import { useWorkspaceStore } from '@/lib/store/workspaces';

describe('updateWorkspaceLastActiveSession', () => {
  beforeEach(() => {
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
          sessionIds: ['session-1', 'session-2'],
          expandedFolders: new Set(),
          selectedFile: null,
          fileActivity: new Map(),
          createdAt: Date.now(),
          lastAccessedAt: Date.now(),
        }],
      ]),
    });
  });

  it('should update lastActiveSessionId', () => {
    const store = useWorkspaceStore.getState();
    store.updateWorkspaceLastActiveSession('workspace-1', 'session-2');

    const workspace = useWorkspaceStore.getState().workspaces.get('workspace-1');
    expect(workspace?.lastActiveSessionId).toBe('session-2');
  });

  it('should not throw if workspace not found', () => {
    const store = useWorkspaceStore.getState();

    expect(() => {
      store.updateWorkspaceLastActiveSession('nonexistent', 'session-1');
    }).not.toThrow();
  });

  it('should persist to state', () => {
    const store = useWorkspaceStore.getState();
    store.updateWorkspaceLastActiveSession('workspace-1', 'session-2');

    // Check that the update was persisted in state
    const workspace = useWorkspaceStore.getState().workspaces.get('workspace-1');
    expect(workspace?.lastActiveSessionId).toBe('session-2');
  });
});
