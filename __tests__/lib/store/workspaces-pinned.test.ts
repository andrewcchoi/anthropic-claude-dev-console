// __tests__/lib/store/workspaces-pinned.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useWorkspaceStore } from '@/lib/store/workspaces';
import { showToast } from '@/lib/utils/toast';

vi.mock('@/lib/utils/toast');

describe('Pinned workspace protection', () => {
  let workspaceId: string;

  beforeEach(async () => {
    // Reset store
    useWorkspaceStore.setState({
      workspaces: new Map(),
      providers: new Map(),
      activeWorkspaceId: null,
      workspaceOrder: [],
    });

    // Create pinned workspace
    workspaceId = await useWorkspaceStore.getState().addWorkspace(
      { type: 'local', path: '/workspace' },
      { name: '🌴 groot' }
    );

    // Set as pinned
    useWorkspaceStore.getState().updateWorkspaceState(workspaceId, { isPinned: true });

    vi.clearAllMocks();
  });

  it('should prevent deletion of pinned workspace', async () => {
    await useWorkspaceStore.getState().removeWorkspace(workspaceId);

    // Workspace should still exist
    const workspace = useWorkspaceStore.getState().workspaces.get(workspaceId);
    expect(workspace).toBeDefined();
    expect(workspace?.name).toBe('🌴 groot');

    // Toast should be shown
    expect(showToast).toHaveBeenCalledWith(
      'Cannot delete pinned workspace',
      'error'
    );
  });

  it('should prevent archiving of pinned workspace', () => {
    useWorkspaceStore.getState().archiveWorkspace(workspaceId);

    // Workspace should not be archived
    const workspace = useWorkspaceStore.getState().workspaces.get(workspaceId);
    expect(workspace?.isArchived).toBeFalsy();

    // Toast should be shown
    expect(showToast).toHaveBeenCalledWith(
      'Cannot archive pinned workspace',
      'error'
    );
  });

  it('should allow deletion of non-pinned workspaces', async () => {
    // Create non-pinned workspace
    const otherWorkspaceId = await useWorkspaceStore.getState().addWorkspace(
      { type: 'local', path: '/other' },
      { name: 'Other Project' }
    );

    await useWorkspaceStore.getState().removeWorkspace(otherWorkspaceId);

    // Workspace should be deleted
    const workspace = useWorkspaceStore.getState().workspaces.get(otherWorkspaceId);
    expect(workspace).toBeUndefined();

    // No error toast
    expect(showToast).not.toHaveBeenCalledWith(
      expect.stringContaining('Cannot delete'),
      'error'
    );
  });
});
