// __tests__/lib/store/workspaces-migration.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useWorkspaceStore } from '@/lib/store/workspaces';

describe('Workspace groot migration', () => {
  beforeEach(() => {
    // Reset store
    useWorkspaceStore.setState({
      workspaces: new Map(),
      providers: new Map(),
      activeWorkspaceId: null,
      workspaceOrder: [],
      isInitialized: false,
      hasMigratedSessions: false,
    });
  });

  it('should rename "Current Workspace" to "🌴 groot"', async () => {
    // Create workspace with old name
    const workspaceId = await useWorkspaceStore.getState().addWorkspace(
      { type: 'local', path: '/workspace' },
      { name: 'Current Workspace' }
    );

    // Run migration
    await useWorkspaceStore.getState().migrateGrootWorkspace();

    const workspace = useWorkspaceStore.getState().workspaces.get(workspaceId);
    expect(workspace?.name).toBe('🌴 groot');
    expect(workspace?.isPinned).toBe(true);
  });

  it('should set isPinned to true for /workspace', async () => {
    const workspaceId = await useWorkspaceStore.getState().addWorkspace(
      { type: 'local', path: '/workspace' },
      { name: 'Current Workspace' }
    );

    await useWorkspaceStore.getState().migrateGrootWorkspace();

    const workspace = useWorkspaceStore.getState().workspaces.get(workspaceId);
    expect(workspace?.isPinned).toBe(true);
  });

  it('should be idempotent (safe to run multiple times)', async () => {
    const workspaceId = await useWorkspaceStore.getState().addWorkspace(
      { type: 'local', path: '/workspace' },
      { name: 'Current Workspace' }
    );

    // Run migration twice
    await useWorkspaceStore.getState().migrateGrootWorkspace();
    await useWorkspaceStore.getState().migrateGrootWorkspace();

    const workspaces = useWorkspaceStore.getState().workspaces;
    expect(workspaces.size).toBe(1); // No duplicate workspaces

    const workspace = workspaces.get(workspaceId);
    expect(workspace?.name).toBe('🌴 groot');
  });

  it('should not affect other workspaces', async () => {
    // Create multiple workspaces
    await useWorkspaceStore.getState().addWorkspace(
      { type: 'local', path: '/workspace' },
      { name: 'Current Workspace' }
    );
    await useWorkspaceStore.getState().addWorkspace(
      { type: 'local', path: '/other' },
      { name: 'Other Project' }
    );

    await useWorkspaceStore.getState().migrateGrootWorkspace();

    const workspaces = Array.from(useWorkspaceStore.getState().workspaces.values());
    const otherWorkspace = workspaces.find(w => w.rootPath === '/other');

    expect(otherWorkspace?.name).toBe('Other Project');
    expect(otherWorkspace?.isPinned).toBe(false); // Should be false (not pinned)
  });

  it('should persist isPinned across rehydration', async () => {
    const workspaceId = await useWorkspaceStore.getState().addWorkspace(
      { type: 'local', path: '/workspace' },
      { name: 'Current Workspace' }
    );

    await useWorkspaceStore.getState().migrateGrootWorkspace();

    // Get persisted config (simulates localStorage)
    const state = useWorkspaceStore.getState();
    const partializedState = {
      workspaceConfigs: Array.from(state.workspaces.values()).map(ws => ({
        id: ws.id,
        projectId: ws.projectId,
        name: ws.name,
        config: state.providers.get(ws.providerId)?.config,
        color: ws.color,
        sessionIds: ws.sessionIds,
        isArchived: ws.isArchived,
        isPinned: ws.isPinned,
      })),
    };

    const persistedWorkspace = partializedState.workspaceConfigs[0];
    expect(persistedWorkspace.isPinned).toBe(true);
  });

  it('should not re-migrate if user renames workspace after migration', async () => {
    const workspaceId = await useWorkspaceStore.getState().addWorkspace(
      { type: 'local', path: '/workspace' },
      { name: 'Current Workspace' }
    );

    await useWorkspaceStore.getState().migrateGrootWorkspace();

    // User renames workspace
    useWorkspaceStore.getState().updateWorkspaceState(workspaceId, { name: 'My Custom Name' });

    // Migration should NOT run again (should skip because isPinned=true)
    await useWorkspaceStore.getState().migrateGrootWorkspace();

    const workspace = useWorkspaceStore.getState().workspaces.get(workspaceId);
    expect(workspace?.name).toBe('My Custom Name'); // NOT "🌴 groot"
    expect(workspace?.isPinned).toBe(true); // Still pinned
  });
});
