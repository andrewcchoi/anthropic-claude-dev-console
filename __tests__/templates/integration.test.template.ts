/**
 * Integration Test Template
 * Layer 4: Test full data flow from Component → Hook → Store → API
 *
 * This is where the projectId bug would have been caught
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { [ComponentName] } from '@/components/[path]/[ComponentName]';
import { useChatStore } from '@/lib/store';
import { useWorkspaceStore } from '@/lib/store/workspaces';

describe('[FeatureName] Integration Tests (Layer 4)', () => {
  beforeEach(() => {
    // Reset all stores to clean state
    useChatStore.setState({
      sessions: [],
      sessionId: null,
      messages: [],
    });

    useWorkspaceStore.setState({
      workspaces: new Map(),
      activeWorkspaceId: null,
    });

    vi.clearAllMocks();
  });

  describe('Full data flow: Component → Store → API', () => {
    it('should complete full flow with correct API parameters', async () => {
      // Setup: Mock API
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({
          messages: [],
          toolExecutions: [],
        }))
      );

      // Setup: Initial state
      useChatStore.setState({
        sessions: [
          {
            id: 'session-123',
            name: 'Test Session',
            workspaceId: '-workspace-docs',  // ← Non-default workspace
            created_at: Date.now(),
            updated_at: Date.now(),
            cwd: '/workspace/docs',
          }
        ],
      });

      // Step 1: Render component
      render(<[ComponentName] />);

      // Step 2: User interaction
      await userEvent.click(screen.getByText('Test Session'));

      // Step 3: Wait for async operations
      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalled();
      });

      // CRITICAL: Verify API call includes ALL required parameters
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/sessions/session-123/messages')
      );

      // CRITICAL: Verify query parameters
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('?project=-workspace-docs')
        // ← This is what was missing in the bug!
      );

      // Step 4: Verify store updated correctly
      const state = useChatStore.getState();
      expect(state.sessionId).toBe('session-123');
      expect(state.messages).toEqual([]);
    });

    it('should handle API errors and propagate to UI', async () => {
      // Mock API failure
      vi.spyOn(global, 'fetch').mockRejectedValue(
        new Error('404 Not Found')
      );

      useChatStore.setState({
        sessions: [{
          id: 'session-123',
          name: 'Test',
          workspaceId: '-workspace',
          created_at: Date.now(),
          updated_at: Date.now(),
          cwd: '/workspace',
        }],
      });

      render(<[ComponentName] />);
      await userEvent.click(screen.getByText('Test'));

      // Verify error propagated to UI
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });

      // Verify error logged
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('404')
      );
    });
  });

  describe('Cross-store coordination', () => {
    it('should update related stores when action occurs', async () => {
      // Setup both stores
      const workspaceId = 'workspace-a';
      useWorkspaceStore.setState({
        workspaces: new Map([[workspaceId, {
          id: workspaceId,
          name: 'Workspace A',
          sessionIds: ['session-1', 'session-2'],
          rootPath: '/a',
        }]]),
      });

      useChatStore.setState({
        sessions: [{
          id: 'session-1',
          name: 'Session 1',
          workspaceId,
          created_at: Date.now(),
          updated_at: Date.now(),
          cwd: '/a',
        }],
      });

      // Mock API
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ messages: [], toolExecutions: [] }))
      );

      // Trigger action
      const { switchSession } = useChatStore.getState();
      await switchSession('session-1', workspaceId);

      // Verify Chat store updated
      expect(useChatStore.getState().sessionId).toBe('session-1');

      // Verify Workspace store updated (cross-store coordination)
      const workspace = useWorkspaceStore.getState().workspaces.get(workspaceId);
      expect(workspace?.lastActiveSessionId).toBe('session-1');
    });
  });

  describe('Response handling', () => {
    it('should handle successful API response', async () => {
      const mockMessages = [
        { id: '1', role: 'user', content: 'Test', timestamp: Date.now() },
        { id: '2', role: 'assistant', content: 'Response', timestamp: Date.now() },
      ];

      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({
          messages: mockMessages,
          toolExecutions: [],
        }))
      );

      useChatStore.setState({
        sessions: [{
          id: 'session-123',
          name: 'Test',
          workspaceId: '-workspace',
          created_at: Date.now(),
          updated_at: Date.now(),
          cwd: '/workspace',
        }],
      });

      render(<[ComponentName] />);
      await userEvent.click(screen.getByText('Test'));

      // Verify messages displayed
      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument();
        expect(screen.getByText('Response')).toBeInTheDocument();
      });

      // Verify store updated
      expect(useChatStore.getState().messages).toEqual(mockMessages);
    });

    it('should handle malformed API response', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response('invalid json')
      );

      useChatStore.setState({
        sessions: [{
          id: 'session-123',
          name: 'Test',
          workspaceId: '-workspace',
          created_at: Date.now(),
          updated_at: Date.now(),
          cwd: '/workspace',
        }],
      });

      render(<[ComponentName] />);
      await userEvent.click(screen.getByText('Test'));

      // Should show error
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });
  });

  describe('State synchronization', () => {
    it('should keep UI and store in sync', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ messages: [], toolExecutions: [] }))
      );

      useChatStore.setState({
        sessions: [
          { id: 's1', name: 'Session 1', workspaceId: '-workspace', created_at: Date.now(), updated_at: Date.now(), cwd: '/workspace' },
          { id: 's2', name: 'Session 2', workspaceId: '-workspace', created_at: Date.now(), updated_at: Date.now(), cwd: '/workspace' },
        ],
      });

      render(<[ComponentName] />);

      // Click first session
      await userEvent.click(screen.getByText('Session 1'));
      await waitFor(() => {
        expect(useChatStore.getState().sessionId).toBe('s1');
      });

      // Click second session
      await userEvent.click(screen.getByText('Session 2'));
      await waitFor(() => {
        expect(useChatStore.getState().sessionId).toBe('s2');
      });

      // UI should reflect current session
      expect(screen.getByText('Session 2')).toHaveClass('active');
    });
  });
});
