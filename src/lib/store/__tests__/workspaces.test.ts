import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkspaceStore } from '../workspaces';

describe('WorkspaceStore - projectId', () => {
  beforeEach(() => {
    useWorkspaceStore.getState().workspaces.clear();
  });

  it('sets projectId when creating workspace', async () => {
    const id = await useWorkspaceStore.getState().addWorkspace({
      type: 'local',
      path: '/workspace',
    });

    const workspace = useWorkspaceStore.getState().workspaces.get(id);
    expect(workspace?.projectId).toBe('-workspace');
  });

  it('handles nested paths correctly', async () => {
    const id = await useWorkspaceStore.getState().addWorkspace({
      type: 'local',
      path: '/workspace/docs',
    });

    const workspace = useWorkspaceStore.getState().workspaces.get(id);
    expect(workspace?.projectId).toBe('-workspace-docs');
  });
});
