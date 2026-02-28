import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkspaceStore } from '../workspaces';

describe('Workspace Archive', () => {
  beforeEach(() => {
    useWorkspaceStore.getState().workspaces.clear();
    useWorkspaceStore.setState({ activeWorkspaceId: null, workspaceOrder: [] });
  });

  it('archives workspace without deleting data', async () => {
    const id = await useWorkspaceStore.getState().addWorkspace({
      type: 'local',
      path: '/workspace',
    });

    useWorkspaceStore.getState().archiveWorkspace(id);

    const workspace = useWorkspaceStore.getState().workspaces.get(id);
    expect(workspace?.isArchived).toBe(true);
  });

  it('restores archived workspace', async () => {
    const id = await useWorkspaceStore.getState().addWorkspace({
      type: 'local',
      path: '/workspace',
    });

    useWorkspaceStore.getState().archiveWorkspace(id);
    useWorkspaceStore.getState().restoreWorkspace(id);

    const workspace = useWorkspaceStore.getState().workspaces.get(id);
    expect(workspace?.isArchived).toBe(false);
  });

  it('switches to another workspace when archiving active', async () => {
    const id1 = await useWorkspaceStore.getState().addWorkspace({
      type: 'local',
      path: '/workspace',
    });
    const id2 = await useWorkspaceStore.getState().addWorkspace({
      type: 'local',
      path: '/workspace/docs',
    });

    useWorkspaceStore.getState().setActiveWorkspace(id1);
    useWorkspaceStore.getState().archiveWorkspace(id1);

    const activeId = useWorkspaceStore.getState().activeWorkspaceId;
    expect(activeId).toBe(id2);
  });
});
