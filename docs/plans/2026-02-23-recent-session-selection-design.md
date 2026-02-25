# Design: Select Most Recent Session When Switching Workspaces

**Date**: 2026-02-23
**Status**: Approved
**Author**: Claude + User

---

## Problem Statement

When users switch between workspaces, there is currently no automatic session selection. Users must manually click a session after switching workspaces, which disrupts workflow and creates unnecessary friction.

**User Story**: As a user, I want the system to remember which session I was viewing in each workspace, so that I can quickly context-switch between projects without manually searching for the right conversation.

---

## Goals

1. **Primary**: Auto-select last active session when switching to a workspace
2. **Secondary**: Fall back to most recent session if last active was deleted
3. **Tertiary**: Handle edge cases gracefully (no sessions, active streaming, data corruption)

**Success Criteria**:
- Zero manual session selection after workspace switch (95% of cases)
- Seamless UX with no perceived lag
- Data integrity maintained (no corruption, self-healing)
- Production-ready error handling

---

## Decisions Made

### Decision 1: Auto-Selection Behavior
**Selected**: Option C - Remember last active session per workspace

- Each workspace remembers which session was last active
- Switching back restores that specific session
- Falls back to most recent if no session was previously active
- **Rationale**: Provides best user experience by preserving context

### Decision 2: Session Deletion Handling
**Selected**: Option C - Fall back to most recent + show toast notification

- Combines automatic recovery with user feedback
- Shows toast: "Previous session deleted, showing most recent"
- **Rationale**: Balances automation with awareness

### Decision 3: Storage Location
**Selected**: Option A - Store `lastActiveSessionId` in Workspace store

**Critical Analysis** (via ultrathink):
- **Data locality**: "Last active session for workspace X" is workspace-specific state
- **Existing pattern**: Workspace already stores `sessionIds[]`, this is "which one was active"
- **Single source of truth**: Workspace owns workspace state, chat owns session state
- **Clear ownership**: Follows existing architectural boundaries

**Trade-offs Accepted**:
- Cross-store coordination required (mitigated by existing `storeSync`)
- Workspace must know about sessions (already true via `sessionIds[]`)

### Decision 4: Empty Workspace Handling
**Selected**: Show empty state + auto-focus "New Chat" button with keyboard hint

- Clear intent, accessible, guides user action
- No unwanted session creation
- **Rationale**: Respects user agency while providing clear guidance

### Decision 5: Streaming Interruption
**Selected**: Allow switch, gracefully close stream + show toast notification

- User maintains control
- Clean state with clear feedback
- **Rationale**: Balances UX with state integrity

### Decision 6: Data Corruption Recovery
**Selected**: Validate workspaceId on read + auto-repair + log warning

- Defensive programming prevents bugs from propagating
- Self-healing with visibility for debugging
- **Rationale**: Production-ready robustness

### Decision 7: Performance Strategy
**Selected**: Hybrid - Sync state update + async message loading with optimistic UI

- Instant workspace switch (no blocking)
- Progressive enhancement as messages load
- **Rationale**: Best UX without sacrificing reliability

---

## Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│ WORKSPACE SWITCH FLOW                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User Clicks Workspace                                      │
│         │                                                   │
│         ├─ Check streaming state                           │
│         │   └─ If active: cleanup stream + toast           │
│         │                                                   │
│         ├─ Update currentWorkspace (sync)                  │
│         │                                                   │
│         ├─ Read lastActiveSessionId for workspace          │
│         │   ├─ Validate workspaceId matches                │
│         │   ├─ If invalid: repair + log warning            │
│         │   └─ If missing: find most recent session        │
│         │                                                   │
│         ├─ Check sessions exist for workspace              │
│         │   ├─ Yes: setCurrentSession (sync)               │
│         │   │   └─ Load messages (async, non-blocking)     │
│         │   └─ No: show empty state + focus "New Chat"     │
│         │                                                   │
│         └─ Update lastActiveSessionId                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Data Model Changes

```typescript
// NEW FIELD in Workspace type
interface Workspace {
  id: string;
  name: string;
  rootPath: string;
  sessionIds: string[];
  lastActiveSessionId?: string;  // ← NEW
  lastAccessedAt: number;
  // ... other fields
}
```

### State Storage

```
┌──────────────────────────────┐
│ Workspace Store (Zustand)    │
├──────────────────────────────┤
│ - workspaces: Map<id, {...}> │
│   - id: string               │
│   - path: string             │
│   - sessionIds: string[]     │
│   - lastActiveSessionId: str │ ← NEW
│   - lastAccessedAt: number   │
└──────────────────────────────┘
         ↓ storeSync events
┌──────────────────────────────┐
│ Chat Store (Zustand)         │
├──────────────────────────────┤
│ - sessionId: string | null   │
│ - currentSession: Session    │
│ - sessions: Session[]        │
└──────────────────────────────┘
```

### Validation Logic

```typescript
validateLastActiveSession(workspaceId: string, sessionId?: string): string | null {
  if (!sessionId) return null;

  const session = sessions.find(s => s.id === sessionId);
  if (!session) {
    log.warn('lastActiveSessionId not found', { workspaceId, sessionId });
    return null;
  }

  if (session.workspaceId !== workspaceId) {
    log.warn('lastActiveSessionId workspace mismatch', {
      workspaceId,
      sessionId,
      sessionWorkspaceId: session.workspaceId
    });
    return null;
  }

  return sessionId;
}
```

---

## Components Modified

### 1. Store: `src/lib/store/index.ts`

**New Type Field**:
```typescript
interface Workspace {
  // ... existing fields
  lastActiveSessionId?: string; // NEW
}
```

**New Actions**:
```typescript
updateWorkspaceLastActiveSession: (workspaceId: string, sessionId: string) => void
validateLastActiveSession: (workspaceId: string, sessionId?: string) => string | null
getMostRecentSessionForWorkspace: (workspaceId: string) => Session | null
```

**Update Existing**:
```typescript
setCurrentSession: (sessionId: string) => {
  // ... existing logic

  // NEW: Update workspace's lastActiveSessionId
  const session = get().sessions.find(s => s.id === sessionId);
  if (session?.workspaceId) {
    get().updateWorkspaceLastActiveSession(session.workspaceId, sessionId);
  }
}
```

---

### 2. Hook: `src/hooks/useClaudeChat.ts`

**New Helper**:
```typescript
const cleanupStream = useCallback(() => {
  if (eventSourceRef.current) {
    log.info('Cleaning up active stream before workspace switch');
    eventSourceRef.current.close();
    eventSourceRef.current = null;
    setIsStreaming(false);
  }
}, []);

// Export via context for use in ProjectList
return {
  // ... existing exports
  cleanupStream
};
```

---

### 3. Component: `src/components/sidebar/ProjectList.tsx`

**New Handler**:
```typescript
const handleWorkspaceClick = useCallback(async (workspace: Workspace) => {
  const log = createLogger('ProjectList:workspaceClick');

  // Step 1: Cleanup active stream if any
  if (isStreaming) {
    cleanupStream();
    toast.info('Stopped active conversation');
  }

  // Step 2: Update current workspace (sync)
  setCurrentWorkspace(workspace.id);

  // Step 3: Find session to activate
  const sessions = getSessionsForWorkspace(workspace.id);

  if (sessions.length === 0) {
    // No sessions - show empty state
    log.debug('No sessions for workspace, showing empty state');
    setCurrentSession(null);
    setTimeout(() => {
      document.getElementById('new-chat-button')?.focus();
    }, 100);
    return;
  }

  // Step 4: Validate lastActiveSessionId
  let sessionToActivate = validateLastActiveSession(
    workspace.id,
    workspace.lastActiveSessionId
  );

  if (!sessionToActivate) {
    // Fall back to most recent
    const mostRecent = getMostRecentSessionForWorkspace(workspace.id);
    sessionToActivate = mostRecent?.id || sessions[0]?.id;

    if (workspace.lastActiveSessionId) {
      log.warn('Invalid lastActiveSessionId, falling back', {
        workspaceId: workspace.id,
        invalidSessionId: workspace.lastActiveSessionId,
        fallbackSessionId: sessionToActivate
      });
      toast.info('Restored most recent session');
    }
  }

  // Step 5: Activate session (sync state, async messages)
  setCurrentSession(sessionToActivate);
  updateWorkspaceLastActiveSession(workspace.id, sessionToActivate);
}, [isStreaming, cleanupStream, setCurrentWorkspace, setCurrentSession]);
```

---

### 4. Component: `src/components/sidebar/SessionPanel.tsx`

**New Empty State**:
```tsx
{sessions.length === 0 && currentWorkspace && (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    <p className="text-gray-500 dark:text-gray-400 mb-4">
      No sessions in this workspace
    </p>
    <button
      id="new-chat-button"
      onClick={handleNewChat}
      className="px-4 py-2 bg-blue-600 text-white rounded-md
                 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500/50
                 focus:outline-none"
    >
      New Chat <kbd className="ml-2 text-xs">⌘N</kbd>
    </button>
  </div>
)}
```

---

## Error Handling

### 1. No Sessions in Workspace
```typescript
if (sessions.length === 0) {
  setCurrentSession(null);
  // Show empty state with auto-focus on "New Chat"
  setTimeout(() => document.getElementById('new-chat-button')?.focus(), 100);
  return;
}
```

### 2. Invalid lastActiveSessionId (Data Corruption)
```typescript
const validSessionId = validateLastActiveSession(workspace.id, workspace.lastActiveSessionId);

if (!validSessionId && workspace.lastActiveSessionId) {
  log.warn('Data corruption detected', {
    workspaceId: workspace.id,
    invalidSessionId: workspace.lastActiveSessionId
  });
  // Auto-repair by falling back to most recent
  toast.info('Restored most recent session');
}
```

### 3. Stream Cleanup Failure
```typescript
const cleanupStream = useCallback(() => {
  try {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsStreaming(false);
    }
  } catch (error) {
    log.error('Failed to cleanup stream', { error });
    // Force reset even if close() fails
    eventSourceRef.current = null;
    setIsStreaming(false);
  }
}, []);
```

### 4. Session Load Failure (Async)
```typescript
useEffect(() => {
  if (!currentSessionId) return;

  const loadMessages = async () => {
    try {
      setIsLoadingMessages(true);
      const messages = await fetchMessages(currentSessionId);
      setMessages(messages);
    } catch (error) {
      log.error('Failed to load messages', { sessionId: currentSessionId, error });
      toast.error('Failed to load conversation history');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  loadMessages();
}, [currentSessionId]);
```

---

## Testing Strategy

### Unit Tests (13 test cases)

**Store Tests** (`src/lib/store/__tests__/workspace-session-selection.test.ts`):
1. `validateLastActiveSession` returns sessionId when valid
2. `validateLastActiveSession` returns null when session missing
3. `validateLastActiveSession` returns null + logs when workspace mismatch
4. `getMostRecentSessionForWorkspace` returns latest timestamp
5. `getMostRecentSessionForWorkspace` returns null when no sessions
6. `updateWorkspaceLastActiveSession` updates field
7. `updateWorkspaceLastActiveSession` persists to localStorage

**Hook Tests** (`src/hooks/__tests__/cleanupStream.test.ts`):
8. `cleanupStream` closes EventSource
9. `cleanupStream` sets isStreaming to false
10. `cleanupStream` handles errors gracefully

**Integration Tests** (`src/components/sidebar/__tests__/workspace-switch.test.tsx`):
11. Switches to last active session
12. Falls back to most recent when last active invalid
13. Shows empty state when no sessions

### E2E Tests (4 scenarios)

1. **Remember last active**: Switch A→B→A, verify correct sessions restored
2. **Handle deletion**: Delete active session, verify fallback + toast
3. **Empty workspace**: Create workspace with no sessions, verify empty state + focus
4. **Streaming interruption**: Switch workspace during streaming, verify cleanup + toast

---

## Performance

### Metrics

- **Workspace switch (sync)**: < 5ms (state update only)
- **Session validation**: < 10ms (O(1) lookup for 1000 sessions)
- **Message loading (async)**: Show skeleton if > 100ms
- **localStorage persist**: < 20ms (debounced via Zustand)

### Optimizations

1. **Sync state updates**: UI responds immediately
2. **Async message loading**: Non-blocking, progressive enhancement
3. **Optimistic UI**: Show skeleton during load
4. **Debounced persistence**: Avoid excessive localStorage writes

---

## Accessibility

### Keyboard Navigation
- `Tab` to navigate between workspaces
- `Enter` to activate workspace
- `⌘N` to create new session
- Auto-focus on "New Chat" button in empty state

### Screen Reader Support
- Announce workspace switch: "Switched to Project A, Session A2 active"
- Announce empty state: "No sessions in this workspace, press Enter to create"
- Announce stream cleanup: "Active conversation stopped"

### Focus Management
- Focus moves to active session after workspace switch
- Focus moves to "New Chat" button in empty state
- Focus returns to workspace list after session creation

---

## Migration & Rollout

### Phase 1: Store Changes (No User Impact)
1. Add `lastActiveSessionId` to Workspace type
2. Add validation and helper functions
3. Update `setCurrentSession` to track last active
4. Write unit tests
5. **Verification**: `npm test -- store`

### Phase 2: Hook Integration (Internal)
1. Add `cleanupStream()` to useClaudeChat
2. Export via context
3. Write unit tests
4. **Verification**: Manual test in console

### Phase 3: UI Updates (User-Facing)
1. Update ProjectList click handler
2. Add empty state to SessionPanel
3. Add toast notifications
4. Write integration tests
5. **Verification**: Manual testing

### Phase 4: E2E Testing
1. Write E2E tests for all scenarios
2. Run full regression suite
3. **Verification**: All tests pass

### Phase 5: Deployment
1. Merge to main
2. Monitor logs for validation warnings
3. Verify localStorage migration

---

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Stream cleanup fails | User sees error | Low | Comprehensive error handling, force reset state |
| Data corruption (wrong workspace) | Wrong session loaded | Medium | Validation + auto-repair + logging |
| Race condition (rapid switching) | Inconsistent state | Low | Sync state updates, atomic operations |
| localStorage full | Persistence fails | Very Low | Graceful degradation, log warning |
| Performance degradation | Slow switches | Very Low | Optimistic UI, async loading |

**Overall Risk**: Low - Comprehensive testing and error handling

---

## Success Metrics

### Quantitative
- Session selection time: 0ms (automatic)
- Workspace switch time: < 50ms (perceived)
- Error rate: < 0.1% (validation failures)
- Test coverage: > 90% (unit + integration)

### Qualitative
- User can switch workspaces without manual session selection
- Session context is preserved per workspace
- Edge cases handled gracefully with clear feedback
- No data corruption or orphaned state

---

## Future Enhancements

1. **Session history per workspace** - Navigate through previous sessions with ⌘[/⌘]
2. **Pin sessions to workspace** - Keep certain sessions always visible
3. **Recent sessions dropdown** - Quick access to last 5 sessions per workspace
4. **Cross-workspace search** - Find sessions across all workspaces
5. **Workspace templates** - Pre-configure session structure for new workspaces

---

## Appendix: Implementation Checklist

### Store (`src/lib/store/index.ts`)
- [ ] Add `lastActiveSessionId?: string` to Workspace type
- [ ] Implement `updateWorkspaceLastActiveSession(workspaceId, sessionId)`
- [ ] Implement `validateLastActiveSession(workspaceId, sessionId?)`
- [ ] Implement `getMostRecentSessionForWorkspace(workspaceId)`
- [ ] Update `setCurrentSession` to call `updateWorkspaceLastActiveSession`
- [ ] Write 7 unit tests

### Hook (`src/hooks/useClaudeChat.ts`)
- [ ] Implement `cleanupStream()` with error handling
- [ ] Export `cleanupStream` via context
- [ ] Write 3 unit tests

### UI (`src/components/sidebar/ProjectList.tsx`)
- [ ] Implement `handleWorkspaceClick` with full flow
- [ ] Add stream cleanup call
- [ ] Add validation and fallback logic
- [ ] Add toast notifications
- [ ] Write 3 integration tests

### Empty State (`src/components/sidebar/SessionPanel.tsx`)
- [ ] Add empty state UI
- [ ] Add auto-focus on "New Chat" button
- [ ] Add keyboard hint (⌘N)
- [ ] Add `id="new-chat-button"` attribute

### Testing
- [ ] Unit tests: 13 test cases
- [ ] E2E tests: 4 scenarios
- [ ] Manual testing: 8 flows

### Documentation
- [ ] Update FEATURES.md
- [ ] Update CLAUDE.md Memory section
- [ ] Add ADR for storage decision

---

**Estimated Total Effort**: 5 hours
- Store: 1h (30min code + 30min tests)
- Hook: 30min (20min code + 10min tests)
- UI: 2h (1h code + 1h tests)
- E2E: 1h
- Docs: 30min

**Status**: Design Approved ✅
**Next Step**: Create implementation plan (invoke writing-plans skill)
