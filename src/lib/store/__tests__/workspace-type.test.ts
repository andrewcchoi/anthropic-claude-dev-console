import { Workspace } from '@/lib/workspace/types';

describe('Workspace type', () => {
  it('should allow lastActiveSessionId field', () => {
    const workspace: Workspace = {
      id: 'test',
      name: 'Test',
      providerId: 'provider-1',
      providerType: 'local',
      rootPath: '/test',
      color: '#3B82F6',
      sessionId: null,
      sessionIds: [],
      lastActiveSessionId: 'session-123',
      expandedFolders: new Set(),
      selectedFile: null,
      fileActivity: new Map(),
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
    };

    expect(workspace.lastActiveSessionId).toBe('session-123');
  });

  it('should allow lastActiveSessionId to be undefined', () => {
    const workspace: Workspace = {
      id: 'test',
      name: 'Test',
      providerId: 'provider-1',
      providerType: 'local',
      rootPath: '/test',
      color: '#3B82F6',
      sessionId: null,
      sessionIds: [],
      expandedFolders: new Set(),
      selectedFile: null,
      fileActivity: new Map(),
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
    };

    expect(workspace.lastActiveSessionId).toBeUndefined();
  });
});
