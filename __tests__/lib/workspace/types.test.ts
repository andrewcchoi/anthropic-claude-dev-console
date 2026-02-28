// __tests__/lib/workspace/types.test.ts
import { describe, it, expect } from 'vitest';
import type { Workspace } from '@/lib/workspace/types';

describe('Workspace types', () => {
  it('should allow isPinned field on Workspace interface', () => {
    const workspace: Workspace = {
      id: 'test-id',
      projectId: '-workspace',
      name: '🌴 groot',
      providerId: 'provider-1',
      providerType: 'local',
      rootPath: '/workspace',
      color: '#3B82F6',
      sessionId: null,
      activeSessionId: null,
      sessionIds: [],
      expandedFolders: new Set(),
      selectedFile: null,
      fileActivity: new Map(),
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      isPinned: true, // ✅ Should compile
    };

    expect(workspace.isPinned).toBe(true);
  });
});
