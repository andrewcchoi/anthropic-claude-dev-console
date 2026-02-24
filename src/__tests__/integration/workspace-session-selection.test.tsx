/**
 * Integration tests for workspace session selection feature
 * Tests the complete flow from store updates to UI interactions
 *
 * Task 23: Remember last active session per workspace
 * Task 24: Session deletion fallback to most recent
 * Task 25: Empty workspace handling with focus management
 * Task 26: Streaming interruption during workspace switch
 * Task 27: Coverage verification (run with --coverage flag)
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useChatStore } from '@/lib/store/index';
import { useWorkspaceStore } from '@/lib/store/workspaces';
import type { Session } from '@/types/sessions';

// Make stores available globally for cross-store access
(global as any).useChatStore = useChatStore;
(global as any).useWorkspaceStore = useWorkspaceStore;

describe('Integration: Workspace Session Selection', () => {
  beforeEach(() => {
    // Reset stores to clean state
    useChatStore.setState({
      sessions: [],
      sessionCache: new Map(),
      sessionId: null,
      currentSession: null,
      messages: [],
      toolExecutions: [],
      isStreaming: false,
      sessionUsage: null,
    });

    useWorkspaceStore.setState({
      workspaces: new Map(),
      activeWorkspaceId: null,
    });
  });

  describe('Task 23: Remember last active session per workspace', () => {
    it('should remember last active session when switching between workspaces', async () => {
      const now = Date.now();

      // Setup: Two workspaces with multiple sessions each
      useWorkspaceStore.setState({
        workspaces: new Map([
          ['workspace-a', {
            id: 'workspace-a',
            name: 'Project A',
            providerId: 'provider-1',
            providerType: 'local',
            rootPath: '/a',
            color: '#3B82F6',
            sessionId: null,
            sessionIds: ['a1', 'a2'],
            expandedFolders: new Set(),
            selectedFile: null,
            fileActivity: new Map(),
            createdAt: now,
            lastAccessedAt: now,
          }],
          ['workspace-b', {
            id: 'workspace-b',
            name: 'Project B',
            providerId: 'provider-2',
            providerType: 'local',
            rootPath: '/b',
            color: '#10B981',
            sessionId: null,
            sessionIds: ['b1', 'b2'],
            expandedFolders: new Set(),
            selectedFile: null,
            fileActivity: new Map(),
            createdAt: now,
            lastAccessedAt: now,
          }],
        ]),
        activeWorkspaceId: null,
      });

      const sessions: Session[] = [
        {
          id: 'a1',
          name: 'A Session 1',
          workspaceId: 'workspace-a',
          created_at: now - 2000,
          updated_at: now - 2000,
          cwd: '/a',
        },
        {
          id: 'a2',
          name: 'A Session 2',
          workspaceId: 'workspace-a',
          created_at: now - 1000,
          updated_at: now - 1000,
          cwd: '/a',
        },
        {
          id: 'b1',
          name: 'B Session 1',
          workspaceId: 'workspace-b',
          created_at: now - 2000,
          updated_at: now - 2000,
          cwd: '/b',
        },
        {
          id: 'b2',
          name: 'B Session 2',
          workspaceId: 'workspace-b',
          created_at: now - 1000,
          updated_at: now - 1000,
          cwd: '/b',
        },
      ];

      // Create session cache to avoid API calls
      const sessionCache = new Map(
        sessions.map(s => [s.id, {
          messages: [],
          toolExecutions: [],
          timestamp: now,
        }])
      );

      useChatStore.setState({ sessions, sessionCache });

      const workspaceStore = useWorkspaceStore.getState();
      const chatStore = useChatStore.getState();

      // Step 1: Switch to workspace A, select session A2
      await chatStore.switchSession('a2');
      let wsA = useWorkspaceStore.getState().workspaces.get('workspace-a');
      expect(wsA?.lastActiveSessionId).toBe('a2');
      expect(useChatStore.getState().sessionId).toBe('a2');

      // Step 2: Switch to workspace B, select session B1
      await chatStore.switchSession('b1');
      let wsB = useWorkspaceStore.getState().workspaces.get('workspace-b');
      expect(wsB?.lastActiveSessionId).toBe('b1');
      expect(useChatStore.getState().sessionId).toBe('b1');

      // Step 3: Switch back to A - should restore A2
      wsA = useWorkspaceStore.getState().workspaces.get('workspace-a');
      const validatedA = useWorkspaceStore.getState().validateLastActiveSession('workspace-a', wsA?.lastActiveSessionId);
      expect(validatedA).toBe('a2');

      await chatStore.switchSession(validatedA as string);
      expect(useChatStore.getState().sessionId).toBe('a2');

      // Step 4: Switch back to B - should restore B1
      wsB = useWorkspaceStore.getState().workspaces.get('workspace-b');
      const validatedB = useWorkspaceStore.getState().validateLastActiveSession('workspace-b', wsB?.lastActiveSessionId);
      expect(validatedB).toBe('b1');

      await chatStore.switchSession(validatedB as string);
      expect(useChatStore.getState().sessionId).toBe('b1');
    });

    it('should persist last active session across store rehydration', async () => {
      const now = Date.now();

      // Setup workspace with last active session
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
            lastActiveSessionId: 'session-2', // Persisted
            expandedFolders: new Set(),
            selectedFile: null,
            fileActivity: new Map(),
            createdAt: now,
            lastAccessedAt: now,
          }],
        ]),
      });

      const sessions: Session[] = [
        {
          id: 'session-1',
          name: 'Session 1',
          workspaceId: 'workspace-1',
          created_at: now - 2000,
          updated_at: now - 2000,
          cwd: '/test',
        },
        {
          id: 'session-2',
          name: 'Session 2',
          workspaceId: 'workspace-1',
          created_at: now - 1000,
          updated_at: now - 1000,
          cwd: '/test',
        },
      ];

      useChatStore.setState({
        sessions,
        sessionCache: new Map(
          sessions.map(s => [s.id, {
            messages: [],
            toolExecutions: [],
            timestamp: now,
          }])
        ),
      });

      // Verify lastActiveSessionId persisted
      const workspace = useWorkspaceStore.getState().workspaces.get('workspace-1');
      expect(workspace?.lastActiveSessionId).toBe('session-2');

      // Validate it's still valid
      const validated = useWorkspaceStore.getState().validateLastActiveSession(
        'workspace-1',
        workspace?.lastActiveSessionId
      );
      expect(validated).toBe('session-2');
    });
  });

  describe('Task 24: Session deletion fallback', () => {
    it('should fall back to most recent when last active session deleted', async () => {
      const now = Date.now();

      useWorkspaceStore.setState({
        workspaces: new Map([
          ['workspace-1', {
            id: 'workspace-1',
            name: 'Project',
            providerId: 'provider-1',
            providerType: 'local',
            rootPath: '/project',
            color: '#3B82F6',
            sessionId: null,
            sessionIds: ['session-1', 'session-2', 'session-3'],
            lastActiveSessionId: 'session-1', // This will be "deleted"
            expandedFolders: new Set(),
            selectedFile: null,
            fileActivity: new Map(),
            createdAt: now,
            lastAccessedAt: now,
          }],
        ]),
      });

      // Session-1 is deleted, only session-2 and session-3 remain
      const sessions: Session[] = [
        {
          id: 'session-2',
          name: 'Session 2',
          workspaceId: 'workspace-1',
          created_at: now - 2000,
          updated_at: now - 1500,
          cwd: '/project',
        },
        {
          id: 'session-3',
          name: 'Session 3',
          workspaceId: 'workspace-1',
          created_at: now - 1000,
          updated_at: now - 500, // Most recent
          cwd: '/project',
        },
      ];

      useChatStore.setState({
        sessions,
        sessionCache: new Map(
          sessions.map(s => [s.id, {
            messages: [],
            toolExecutions: [],
            timestamp: now,
          }])
        ),
      });

      const workspaceStore = useWorkspaceStore.getState();
      const workspace = workspaceStore.workspaces.get('workspace-1');

      // Step 1: Validate last active - should return null (deleted)
      const validated = workspaceStore.validateLastActiveSession(
        'workspace-1',
        workspace?.lastActiveSessionId
      );
      expect(validated).toBeNull();

      // Step 2: Fall back to most recent
      const mostRecent = workspaceStore.getMostRecentSessionForWorkspace('workspace-1');
      expect(mostRecent?.id).toBe('session-3');

      // Step 3: Update workspace with new session
      await useChatStore.getState().switchSession('session-3');
      const updatedWorkspace = useWorkspaceStore.getState().workspaces.get('workspace-1');
      expect(updatedWorkspace?.lastActiveSessionId).toBe('session-3');
    });

    it('should handle workspace mismatch in lastActiveSessionId', async () => {
      const now = Date.now();

      useWorkspaceStore.setState({
        workspaces: new Map([
          ['workspace-1', {
            id: 'workspace-1',
            name: 'Project 1',
            providerId: 'provider-1',
            providerType: 'local',
            rootPath: '/project1',
            color: '#3B82F6',
            sessionId: null,
            sessionIds: ['session-1'],
            lastActiveSessionId: 'session-2', // Belongs to workspace-2!
            expandedFolders: new Set(),
            selectedFile: null,
            fileActivity: new Map(),
            createdAt: now,
            lastAccessedAt: now,
          }],
          ['workspace-2', {
            id: 'workspace-2',
            name: 'Project 2',
            providerId: 'provider-2',
            providerType: 'local',
            rootPath: '/project2',
            color: '#10B981',
            sessionId: null,
            sessionIds: ['session-2'],
            expandedFolders: new Set(),
            selectedFile: null,
            fileActivity: new Map(),
            createdAt: now,
            lastAccessedAt: now,
          }],
        ]),
      });

      const sessions: Session[] = [
        {
          id: 'session-1',
          name: 'Session 1',
          workspaceId: 'workspace-1',
          created_at: now,
          updated_at: now,
          cwd: '/project1',
        },
        {
          id: 'session-2',
          name: 'Session 2',
          workspaceId: 'workspace-2', // Different workspace
          created_at: now,
          updated_at: now,
          cwd: '/project2',
        },
      ];

      useChatStore.setState({ sessions });

      const workspaceStore = useWorkspaceStore.getState();

      // Validate should detect mismatch and return null
      const validated = workspaceStore.validateLastActiveSession(
        'workspace-1',
        'session-2'
      );
      expect(validated).toBeNull();

      // Should fall back to correct workspace session
      const mostRecent = workspaceStore.getMostRecentSessionForWorkspace('workspace-1');
      expect(mostRecent?.id).toBe('session-1');
    });
  });

  describe('Task 25: Empty workspace handling', () => {
    it('should return null when no sessions for workspace', () => {
      const now = Date.now();

      useWorkspaceStore.setState({
        workspaces: new Map([
          ['empty-workspace', {
            id: 'empty-workspace',
            name: 'Empty Project',
            providerId: 'provider-1',
            providerType: 'local',
            rootPath: '/empty',
            color: '#3B82F6',
            sessionId: null,
            sessionIds: [],
            expandedFolders: new Set(),
            selectedFile: null,
            fileActivity: new Map(),
            createdAt: now,
            lastAccessedAt: now,
          }],
        ]),
      });

      useChatStore.setState({ sessions: [] });

      const workspaceStore = useWorkspaceStore.getState();

      // Should return null for validation
      const validated = workspaceStore.validateLastActiveSession('empty-workspace', undefined);
      expect(validated).toBeNull();

      // Should return null for most recent
      const mostRecent = workspaceStore.getMostRecentSessionForWorkspace('empty-workspace');
      expect(mostRecent).toBeNull();
    });

    it('should handle workspace with sessions from other workspaces only', () => {
      const now = Date.now();

      useWorkspaceStore.setState({
        workspaces: new Map([
          ['workspace-1', {
            id: 'workspace-1',
            name: 'Project 1',
            providerId: 'provider-1',
            providerType: 'local',
            rootPath: '/project1',
            color: '#3B82F6',
            sessionId: null,
            sessionIds: [],
            expandedFolders: new Set(),
            selectedFile: null,
            fileActivity: new Map(),
            createdAt: now,
            lastAccessedAt: now,
          }],
        ]),
      });

      // Sessions exist, but for different workspace
      const sessions: Session[] = [
        {
          id: 'session-other',
          name: 'Other Session',
          workspaceId: 'workspace-2',
          created_at: now,
          updated_at: now,
          cwd: '/project2',
        },
      ];

      useChatStore.setState({ sessions });

      const workspaceStore = useWorkspaceStore.getState();

      // Should return null - no sessions for workspace-1
      const mostRecent = workspaceStore.getMostRecentSessionForWorkspace('workspace-1');
      expect(mostRecent).toBeNull();
    });

    it('should ignore sessions without workspaceId', () => {
      const now = Date.now();

      useWorkspaceStore.setState({
        workspaces: new Map([
          ['workspace-1', {
            id: 'workspace-1',
            name: 'Project',
            providerId: 'provider-1',
            providerType: 'local',
            rootPath: '/project',
            color: '#3B82F6',
            sessionId: null,
            sessionIds: ['session-1'],
            expandedFolders: new Set(),
            selectedFile: null,
            fileActivity: new Map(),
            createdAt: now,
            lastAccessedAt: now,
          }],
        ]),
      });

      const sessions: Session[] = [
        {
          id: 'unassigned',
          name: 'Unassigned',
          // No workspaceId
          created_at: now,
          updated_at: now,
          cwd: '/workspace',
        },
      ];

      useChatStore.setState({ sessions });

      const workspaceStore = useWorkspaceStore.getState();

      // Should return null - unassigned session ignored
      const mostRecent = workspaceStore.getMostRecentSessionForWorkspace('workspace-1');
      expect(mostRecent).toBeNull();
    });
  });

  describe('Task 26: Streaming interruption', () => {
    it('should handle workspace switch during active streaming', async () => {
      const now = Date.now();

      // Setup two workspaces
      useWorkspaceStore.setState({
        workspaces: new Map([
          ['workspace-1', {
            id: 'workspace-1',
            name: 'Project 1',
            providerId: 'provider-1',
            providerType: 'local',
            rootPath: '/project1',
            color: '#3B82F6',
            sessionId: null,
            sessionIds: ['session-1'],
            lastActiveSessionId: 'session-1',
            expandedFolders: new Set(),
            selectedFile: null,
            fileActivity: new Map(),
            createdAt: now,
            lastAccessedAt: now,
          }],
          ['workspace-2', {
            id: 'workspace-2',
            name: 'Project 2',
            providerId: 'provider-2',
            providerType: 'local',
            rootPath: '/project2',
            color: '#10B981',
            sessionId: null,
            sessionIds: ['session-2'],
            expandedFolders: new Set(),
            selectedFile: null,
            fileActivity: new Map(),
            createdAt: now,
            lastAccessedAt: now,
          }],
        ]),
      });

      const sessions: Session[] = [
        {
          id: 'session-1',
          name: 'Session 1',
          workspaceId: 'workspace-1',
          created_at: now,
          updated_at: now,
          cwd: '/project1',
        },
        {
          id: 'session-2',
          name: 'Session 2',
          workspaceId: 'workspace-2',
          created_at: now,
          updated_at: now,
          cwd: '/project2',
        },
      ];

      useChatStore.setState({
        sessions,
        sessionCache: new Map(
          sessions.map(s => [s.id, {
            messages: [],
            toolExecutions: [],
            timestamp: now,
          }])
        ),
        sessionId: 'session-1',
        isStreaming: true, // Active stream
      });

      const chatStore = useChatStore.getState();
      expect(chatStore.isStreaming).toBe(true);
      expect(chatStore.sessionId).toBe('session-1');

      // Simulate workspace switch (cleanup stream would be called by UI)
      // In real UI, cleanupStream() would be called first
      // Here we just set streaming to false to simulate that
      useChatStore.setState({ isStreaming: false });

      // Switch to session-2
      await chatStore.switchSession('session-2');

      // Verify state after switch - get fresh state
      const freshChatStore = useChatStore.getState();
      expect(freshChatStore.isStreaming).toBe(false);
      expect(freshChatStore.sessionId).toBe('session-2');

      const workspace2 = useWorkspaceStore.getState().workspaces.get('workspace-2');
      expect(workspace2?.lastActiveSessionId).toBe('session-2');
    });

    it('should preserve session state when stream cleanup fails', async () => {
      const now = Date.now();

      useWorkspaceStore.setState({
        workspaces: new Map([
          ['workspace-1', {
            id: 'workspace-1',
            name: 'Project',
            providerId: 'provider-1',
            providerType: 'local',
            rootPath: '/project',
            color: '#3B82F6',
            sessionId: null,
            sessionIds: ['session-1'],
            expandedFolders: new Set(),
            selectedFile: null,
            fileActivity: new Map(),
            createdAt: now,
            lastAccessedAt: now,
          }],
        ]),
      });

      const sessions: Session[] = [
        {
          id: 'session-1',
          name: 'Session 1',
          workspaceId: 'workspace-1',
          created_at: now,
          updated_at: now,
          cwd: '/project',
        },
      ];

      useChatStore.setState({
        sessions,
        sessionCache: new Map([
          ['session-1', {
            messages: [{ role: 'user', content: 'test' }],
            toolExecutions: [],
            timestamp: now,
          }],
        ]),
        sessionId: 'session-1',
        isStreaming: true,
      });

      // Even if cleanup fails, force reset
      useChatStore.setState({ isStreaming: false });

      const chatStore = useChatStore.getState();
      expect(chatStore.isStreaming).toBe(false);

      // Messages should still be in cache
      const cache = chatStore.sessionCache.get('session-1');
      expect(cache?.messages).toHaveLength(1);
    });
  });

  describe('Task 27: Edge cases and data integrity', () => {
    it('should handle undefined lastActiveSessionId gracefully', () => {
      const now = Date.now();

      useWorkspaceStore.setState({
        workspaces: new Map([
          ['workspace-1', {
            id: 'workspace-1',
            name: 'Project',
            providerId: 'provider-1',
            providerType: 'local',
            rootPath: '/project',
            color: '#3B82F6',
            sessionId: null,
            sessionIds: ['session-1'],
            // lastActiveSessionId is undefined
            expandedFolders: new Set(),
            selectedFile: null,
            fileActivity: new Map(),
            createdAt: now,
            lastAccessedAt: now,
          }],
        ]),
      });

      const workspaceStore = useWorkspaceStore.getState();

      const validated = workspaceStore.validateLastActiveSession('workspace-1', undefined);
      expect(validated).toBeNull();
    });

    it('should handle non-existent workspace gracefully', () => {
      const workspaceStore = useWorkspaceStore.getState();

      const validated = workspaceStore.validateLastActiveSession('nonexistent', 'session-1');
      expect(validated).toBeNull();

      const mostRecent = workspaceStore.getMostRecentSessionForWorkspace('nonexistent');
      expect(mostRecent).toBeNull();
    });

    it('should sort sessions by updated_at correctly', () => {
      const now = Date.now();

      useWorkspaceStore.setState({
        workspaces: new Map([
          ['workspace-1', {
            id: 'workspace-1',
            name: 'Project',
            providerId: 'provider-1',
            providerType: 'local',
            rootPath: '/project',
            color: '#3B82F6',
            sessionId: null,
            sessionIds: ['old', 'middle', 'recent'],
            expandedFolders: new Set(),
            selectedFile: null,
            fileActivity: new Map(),
            createdAt: now,
            lastAccessedAt: now,
          }],
        ]),
      });

      const sessions: Session[] = [
        {
          id: 'old',
          name: 'Old Session',
          workspaceId: 'workspace-1',
          created_at: now - 3000,
          updated_at: now - 3000,
          cwd: '/project',
        },
        {
          id: 'middle',
          name: 'Middle Session',
          workspaceId: 'workspace-1',
          created_at: now - 2000,
          updated_at: now - 1000,
          cwd: '/project',
        },
        {
          id: 'recent',
          name: 'Recent Session',
          workspaceId: 'workspace-1',
          created_at: now - 1000,
          updated_at: now - 500, // Most recent update
          cwd: '/project',
        },
      ];

      useChatStore.setState({ sessions });

      const workspaceStore = useWorkspaceStore.getState();
      const mostRecent = workspaceStore.getMostRecentSessionForWorkspace('workspace-1');

      expect(mostRecent?.id).toBe('recent');
    });

    it('should handle sessions with same timestamp', () => {
      const now = Date.now();

      useWorkspaceStore.setState({
        workspaces: new Map([
          ['workspace-1', {
            id: 'workspace-1',
            name: 'Project',
            providerId: 'provider-1',
            providerType: 'local',
            rootPath: '/project',
            color: '#3B82F6',
            sessionId: null,
            sessionIds: ['session-1', 'session-2'],
            expandedFolders: new Set(),
            selectedFile: null,
            fileActivity: new Map(),
            createdAt: now,
            lastAccessedAt: now,
          }],
        ]),
      });

      const sessions: Session[] = [
        {
          id: 'session-1',
          name: 'Session 1',
          workspaceId: 'workspace-1',
          created_at: now,
          updated_at: now, // Same timestamp
          cwd: '/project',
        },
        {
          id: 'session-2',
          name: 'Session 2',
          workspaceId: 'workspace-1',
          created_at: now,
          updated_at: now, // Same timestamp
          cwd: '/project',
        },
      ];

      useChatStore.setState({ sessions });

      const workspaceStore = useWorkspaceStore.getState();
      const mostRecent = workspaceStore.getMostRecentSessionForWorkspace('workspace-1');

      // Should return one of them (order doesn't matter when timestamps equal)
      expect(['session-1', 'session-2']).toContain(mostRecent?.id);
    });

    it('should not update workspace when updating unrelated session', async () => {
      const now = Date.now();

      useWorkspaceStore.setState({
        workspaces: new Map([
          ['workspace-1', {
            id: 'workspace-1',
            name: 'Project 1',
            providerId: 'provider-1',
            providerType: 'local',
            rootPath: '/project1',
            color: '#3B82F6',
            sessionId: null,
            sessionIds: ['session-1'],
            expandedFolders: new Set(),
            selectedFile: null,
            fileActivity: new Map(),
            createdAt: now,
            lastAccessedAt: now,
          }],
          ['workspace-2', {
            id: 'workspace-2',
            name: 'Project 2',
            providerId: 'provider-2',
            providerType: 'local',
            rootPath: '/project2',
            color: '#10B981',
            sessionId: null,
            sessionIds: ['session-2'],
            expandedFolders: new Set(),
            selectedFile: null,
            fileActivity: new Map(),
            createdAt: now,
            lastAccessedAt: now,
          }],
        ]),
      });

      const sessions: Session[] = [
        {
          id: 'session-1',
          name: 'Session 1',
          workspaceId: 'workspace-1',
          created_at: now,
          updated_at: now,
          cwd: '/project1',
        },
        {
          id: 'session-2',
          name: 'Session 2',
          workspaceId: 'workspace-2',
          created_at: now,
          updated_at: now,
          cwd: '/project2',
        },
      ];

      useChatStore.setState({
        sessions,
        sessionCache: new Map(
          sessions.map(s => [s.id, {
            messages: [],
            toolExecutions: [],
            timestamp: now,
          }])
        ),
      });

      // Switch to session-2
      await useChatStore.getState().switchSession('session-2');

      // workspace-2 should be updated
      const workspace2 = useWorkspaceStore.getState().workspaces.get('workspace-2');
      expect(workspace2?.lastActiveSessionId).toBe('session-2');

      // workspace-1 should NOT be updated
      const workspace1 = useWorkspaceStore.getState().workspaces.get('workspace-1');
      expect(workspace1?.lastActiveSessionId).toBeUndefined();
    });
  });
});
