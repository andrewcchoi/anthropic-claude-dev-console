import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkspaceStore } from '../workspaces';
import type { CLISession } from '@/types/sessions';

describe('Orphaned Session Handling', () => {
  beforeEach(() => {
    useWorkspaceStore.getState().workspaces.clear();
  });

  it('creates workspace for orphaned sessions', async () => {
    const orphans: CLISession[] = [
      {
        id: 'session-1',
        projectId: '-workspace-new',
        source: 'cli',
        name: 'Orphan 1',
        modifiedAt: Date.now(),
        createdAt: Date.now(),
        isSystem: false,
      },
      {
        id: 'session-2',
        projectId: '-workspace-new',
        source: 'cli',
        name: 'Orphan 2',
        modifiedAt: Date.now(),
        createdAt: Date.now(),
        isSystem: false,
      },
    ];

    await useWorkspaceStore.getState().handleOrphanedSessions(orphans);

    const workspaces = Array.from(useWorkspaceStore.getState().workspaces.values());
    expect(workspaces).toHaveLength(1);
    expect(workspaces[0].projectId).toBe('-workspace-new');
    expect(workspaces[0].name).toContain('(Recovered)');
  });

  it('groups orphans by projectId', async () => {
    const orphans: CLISession[] = [
      { id: '1', projectId: '-workspace-foo', source: 'cli', name: 'A', modifiedAt: Date.now(), createdAt: Date.now(), isSystem: false },
      { id: '2', projectId: '-workspace-bar', source: 'cli', name: 'B', modifiedAt: Date.now(), createdAt: Date.now(), isSystem: false },
      { id: '3', projectId: '-workspace-foo', source: 'cli', name: 'C', modifiedAt: Date.now(), createdAt: Date.now(), isSystem: false },
    ];

    await useWorkspaceStore.getState().handleOrphanedSessions(orphans);

    const workspaces = useWorkspaceStore.getState().workspaces;
    expect(workspaces.size).toBe(2);  // Two unique projectIds
  });

  it('identifies orphaned sessions correctly', () => {
    // Create a workspace
    useWorkspaceStore.getState().workspaces.set('ws-1', {
      id: 'ws-1',
      projectId: '-workspace',
      name: 'Main',
      providerId: 'ws-1',
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
    });

    const sessions: CLISession[] = [
      { id: '1', projectId: '-workspace', source: 'cli', name: 'A', modifiedAt: Date.now(), createdAt: Date.now(), isSystem: false },
      { id: '2', projectId: '-workspace-orphan', source: 'cli', name: 'B', modifiedAt: Date.now(), createdAt: Date.now(), isSystem: false },
    ];

    const orphans = useWorkspaceStore.getState().getOrphanedSessions(sessions);

    expect(orphans).toHaveLength(1);
    expect(orphans[0].id).toBe('2');
  });
});
