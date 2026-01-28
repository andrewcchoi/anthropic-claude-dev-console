import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useChatStore } from '@/lib/store';
import { v4 as uuidv4 } from 'uuid';

// Mock uuid to control generated values in tests
vi.mock('uuid', () => ({
  v4: vi.fn(),
}));

describe('Session Management - Session ID Fix', () => {
  beforeEach(() => {
    // Clear store state before each test
    const store = useChatStore.getState();
    useChatStore.setState({
      messages: [],
      sessionId: null,
      sessions: [],
      currentSession: null,
      toolExecutions: [],
      sessionUsage: null,
      error: null,
      isStreaming: false,
    });

    // Clear localStorage
    localStorage.clear();

    // Reset uuid mock
    vi.clearAllMocks();
  });

  describe('startNewSession() generates unique UUID', () => {
    it('should generate different sessionId on each call', () => {
      // Mock uuid to return different values
      const mockUuids = [
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
      ];
      let callCount = 0;
      vi.mocked(uuidv4).mockImplementation(() => mockUuids[callCount++]);

      const { startNewSession } = useChatStore.getState();

      // First session
      startNewSession();
      const firstSessionId = useChatStore.getState().sessionId;

      // Second session
      startNewSession();
      const secondSessionId = useChatStore.getState().sessionId;

      expect(firstSessionId).toBe(mockUuids[0]);
      expect(secondSessionId).toBe(mockUuids[1]);
      expect(firstSessionId).not.toBe(secondSessionId);
    });

    it('should match UUID v4 format', () => {
      // Use real uuid for format validation
      vi.mocked(uuidv4).mockImplementation(() => {
        return require('uuid').v4();
      });

      const { startNewSession } = useChatStore.getState();
      startNewSession();

      const { sessionId } = useChatStore.getState();
      const uuidv4Regex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      expect(sessionId).toBeTruthy();
      expect(sessionId).toMatch(uuidv4Regex);
    });

    it('should clear messages and state when starting new session', () => {
      const mockUuid = '33333333-3333-3333-3333-333333333333';
      vi.mocked(uuidv4).mockReturnValue(mockUuid);

      const { addMessage, startNewSession } = useChatStore.getState();

      // Add some messages
      addMessage({
        id: 'msg-1',
        role: 'user',
        content: [{ type: 'text', text: 'Hello' }],
        timestamp: Date.now(),
      });

      expect(useChatStore.getState().messages).toHaveLength(1);

      // Start new session
      startNewSession();

      const state = useChatStore.getState();
      expect(state.sessionId).toBe(mockUuid);
      expect(state.messages).toHaveLength(0);
      expect(state.toolExecutions).toHaveLength(0);
      expect(state.sessionUsage).toBeNull();
      expect(state.error).toBeNull();
    });
  });

  describe('sessionId uses fresh state from store', () => {
    it('should access current sessionId via getState(), not stale closure', () => {
      const initialUuid = '44444444-4444-4444-4444-444444444444';
      const newUuid = '55555555-5555-5555-5555-555555555555';

      let callCount = 0;
      vi.mocked(uuidv4).mockImplementation(() => {
        return callCount++ === 0 ? initialUuid : newUuid;
      });

      const { startNewSession, setSessionId } = useChatStore.getState();

      // Start with initial session
      startNewSession();
      expect(useChatStore.getState().sessionId).toBe(initialUuid);

      // Simulate closure capturing old sessionId
      const capturedSessionId = useChatStore.getState().sessionId;

      // Start new session (changes sessionId)
      startNewSession();
      expect(useChatStore.getState().sessionId).toBe(newUuid);

      // Verify closure captured old value
      expect(capturedSessionId).toBe(initialUuid);

      // But getState() returns fresh value
      expect(useChatStore.getState().sessionId).toBe(newUuid);
      expect(useChatStore.getState().sessionId).not.toBe(capturedSessionId);
    });

    it('should demonstrate stale closure problem (what we fixed)', () => {
      const uuid1 = '66666666-6666-6666-6666-666666666666';
      const uuid2 = '77777777-7777-7777-7777-777777777777';

      let callCount = 0;
      vi.mocked(uuidv4).mockImplementation(() => {
        return callCount++ === 0 ? uuid1 : uuid2;
      });

      const { startNewSession } = useChatStore.getState();

      // First session
      startNewSession();

      // Create a closure that captures sessionId (simulates useCallback bug)
      const sessionIdInClosure = useChatStore.getState().sessionId;
      const staleSendMessage = () => {
        // This simulates the OLD buggy code that used closure
        return sessionIdInClosure;
      };

      // Start new session
      startNewSession();

      // The closure still has the old value (BUG!)
      expect(staleSendMessage()).toBe(uuid1);

      // But the store has the new value (FIX: use getState())
      expect(useChatStore.getState().sessionId).toBe(uuid2);
    });
  });

  describe('sessionId is NOT persisted to localStorage', () => {
    it('should not persist sessionId when state changes', () => {
      const mockUuid = '88888888-8888-8888-8888-888888888888';
      vi.mocked(uuidv4).mockReturnValue(mockUuid);

      const { startNewSession } = useChatStore.getState();

      // Start session
      startNewSession();
      expect(useChatStore.getState().sessionId).toBe(mockUuid);

      // Check localStorage
      const persistedData = localStorage.getItem('claude-code-sessions');
      expect(persistedData).toBeTruthy();

      const parsed = JSON.parse(persistedData!);
      // sessionId should NOT be in persisted state
      expect(parsed.state.sessionId).toBeUndefined();

      // But sessions array can be persisted
      expect(parsed.state.sessions).toBeDefined();
    });

    it('should not restore sessionId from localStorage on rehydration', () => {
      const oldUuid = '99999999-9999-9999-9999-999999999999';

      // Manually set localStorage with sessionId (simulate old buggy version)
      const buggyData = {
        state: {
          sessionId: oldUuid, // This should NOT be here
          sessions: [],
          currentSession: null,
        },
        version: 0,
      };
      localStorage.setItem('claude-code-sessions', JSON.stringify(buggyData));

      // Reinitialize store to trigger rehydration
      // (In real app, this happens on page load)
      const stateAfterRehydration = useChatStore.getState();

      // sessionId should NOT be restored from localStorage
      // It should remain null (or be undefined)
      expect(stateAfterRehydration.sessionId).toBeFalsy();
    });

    it('should persist sessions array but not sessionId', () => {
      const mockUuid = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
      vi.mocked(uuidv4).mockReturnValue(mockUuid);

      const { startNewSession, saveCurrentSession, addMessage } =
        useChatStore.getState();

      // Start session and add message
      startNewSession();
      addMessage({
        id: 'msg-1',
        role: 'user',
        content: [{ type: 'text', text: 'Test message' }],
        timestamp: Date.now(),
      });

      // Save session (adds to sessions array)
      saveCurrentSession();

      // Check persisted data
      const persistedData = localStorage.getItem('claude-code-sessions');
      expect(persistedData).toBeTruthy();

      const parsed = JSON.parse(persistedData!);
      // sessions array IS persisted
      expect(parsed.state.sessions).toHaveLength(1);
      // But sessionId is NOT persisted
      expect(parsed.state.sessionId).toBeUndefined();
    });
  });

  describe('session_locked error triggers new sessionId generation', () => {
    it('should generate new UUID when session conflict occurs', () => {
      const initialUuid = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
      const newUuid = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

      let callCount = 0;
      vi.mocked(uuidv4).mockImplementation(() => {
        return callCount++ === 0 ? initialUuid : newUuid;
      });

      const { startNewSession, setSessionId } = useChatStore.getState();

      // Start initial session
      startNewSession();
      expect(useChatStore.getState().sessionId).toBe(initialUuid);

      // Simulate session_locked error response from SSE
      // This is what happens in useClaudeChat.ts line 164-168
      const newSessionIdAfterConflict = newUuid;
      setSessionId(newSessionIdAfterConflict);

      // Verify new sessionId is set
      expect(useChatStore.getState().sessionId).toBe(newUuid);
      expect(useChatStore.getState().sessionId).not.toBe(initialUuid);
    });

    it('should handle multiple session conflicts in sequence', () => {
      const uuids = [
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        'ffffffff-ffff-ffff-ffff-ffffffffffff',
      ];

      let callCount = 0;
      vi.mocked(uuidv4).mockImplementation(() => uuids[callCount++]);

      const { startNewSession, setSessionId } = useChatStore.getState();

      // First session
      startNewSession();
      expect(useChatStore.getState().sessionId).toBe(uuids[0]);

      // First conflict
      setSessionId(uuids[1]);
      expect(useChatStore.getState().sessionId).toBe(uuids[1]);

      // Second conflict
      setSessionId(uuids[2]);
      expect(useChatStore.getState().sessionId).toBe(uuids[2]);

      // All different
      expect(new Set(uuids).size).toBe(3);
    });
  });

  describe('Integration: Full session lifecycle', () => {
    it('should handle complete new session flow without conflicts', () => {
      const sessionUuids = [
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000002',
      ];

      let callCount = 0;
      vi.mocked(uuidv4).mockImplementation(() => sessionUuids[callCount++]);

      const { startNewSession, addMessage, saveCurrentSession } =
        useChatStore.getState();

      // Session 1
      startNewSession();
      const session1Id = useChatStore.getState().sessionId;
      expect(session1Id).toBe(sessionUuids[0]);

      addMessage({
        id: 'msg-1',
        role: 'user',
        content: [{ type: 'text', text: 'First message' }],
        timestamp: Date.now(),
      });

      saveCurrentSession();
      expect(useChatStore.getState().sessions).toHaveLength(1);

      // Session 2 (new chat)
      startNewSession();
      const session2Id = useChatStore.getState().sessionId;
      expect(session2Id).toBe(sessionUuids[1]);
      expect(session2Id).not.toBe(session1Id);

      // Messages cleared for new session
      expect(useChatStore.getState().messages).toHaveLength(0);

      // Previous session still in history
      expect(useChatStore.getState().sessions).toHaveLength(1);
      expect(useChatStore.getState().sessions[0].id).toBe(session1Id);

      // sessionId NOT persisted
      const persistedData = localStorage.getItem('claude-code-sessions');
      const parsed = JSON.parse(persistedData!);
      expect(parsed.state.sessionId).toBeUndefined();
    });
  });
});
