import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useWorkspaceStore } from '../workspaces';

global.fetch = vi.fn();

describe('Workspace Migration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWorkspaceStore.getState().workspaces.clear();
    localStorage.clear();
  });

  it('creates workspaces from discovered projects', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        projects: [
          { id: '-workspace', path: '/workspace', sessionCount: 5 },
          { id: '-workspace-docs', path: '/workspace/docs', sessionCount: 3 },
        ],
        sessions: [],
      }),
    });

    await useWorkspaceStore.getState().migrateToWorkspaces();

    const workspaces = useWorkspaceStore.getState().workspaces;
    expect(workspaces.size).toBe(2);

    const workspaceArray = Array.from(workspaces.values());
    expect(workspaceArray[0].projectId).toBe('-workspace');
    expect(workspaceArray[1].projectId).toBe('-workspace-docs');
  });

  it('is idempotent - skips if already migrated', async () => {
    // First migration
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        projects: [{ id: '-workspace', path: '/workspace' }],
        sessions: [],
      }),
    });

    await useWorkspaceStore.getState().migrateToWorkspaces();
    const count1 = useWorkspaceStore.getState().workspaces.size;

    // Second migration - should skip
    await useWorkspaceStore.getState().migrateToWorkspaces();
    const count2 = useWorkspaceStore.getState().workspaces.size;

    expect(count1).toBe(count2);
    expect(global.fetch).toHaveBeenCalledTimes(1);  // Only called once
  });

  it('rolls back on error', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    await expect(
      useWorkspaceStore.getState().migrateToWorkspaces()
    ).rejects.toThrow('Network error');

    const workspaces = useWorkspaceStore.getState().workspaces;
    expect(workspaces.size).toBe(0);
    expect(localStorage.getItem('workspace-migration-started')).toBeNull();
  });
});
