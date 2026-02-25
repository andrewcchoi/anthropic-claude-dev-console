# ADR 0001: Store lastActiveSessionId in Workspace Store

**Date**: 2026-02-23
**Status**: Accepted
**Context**: Issue #50 - Auto-select session when switching workspaces
**Decision Makers**: Claude + User

---

## Context

When implementing automatic session selection for workspace switches, we needed to decide where to store the `lastActiveSessionId` field. This field tracks which session was last active in each workspace, enabling auto-restore when users return to a workspace.

**Problem**: Where should `lastActiveSessionId` be stored?

**Options**:
1. Workspace store (selected)
2. Chat store
3. Separate SessionMapping store

---

## Decision

Store `lastActiveSessionId` in the **Workspace store**, not the Chat store or a separate store.

---

## Rationale

### 1. Data Locality
- "Last active session for workspace X" is **workspace-specific state**
- Belongs with workspace data (name, path, sessionIds)
- Natural extension of existing workspace model

### 2. Existing Pattern
- Workspace already stores `sessionIds: string[]` (which sessions exist)
- `lastActiveSessionId` answers "which one was active?" - natural extension
- Follows established architectural pattern

### 3. Single Source of Truth
- **Workspace store** owns workspace state (paths, sessions, configuration)
- **Chat store** owns session state (messages, tool executions, streaming)
- Clear separation of concerns

### 4. Clear Ownership
- No ambiguity about which store owns the field
- Follows existing architectural boundaries
- Easy to reason about and debug

---

## Alternatives Considered

### Option A: Store in Chat Store ❌

**Rejected because**:
- ❌ Violates data locality principle (workspace-specific state in chat store)
- ❌ Would require `Map<workspaceId, sessionId>` for multiple workspaces (complex)
- ❌ Mixes workspace concerns into chat store (architectural boundary violation)
- ❌ Chat store already manages session state; adding workspace tracking is scope creep

**Example of what we avoided**:
```typescript
// BAD: Workspace state in Chat store
interface ChatStore {
  sessions: Session[];
  currentSession: Session | null;
  workspaceSessionMap: Map<string, string>; // ← Workspace concern in chat store
}
```

### Option B: Separate SessionMapping Store ❌

**Rejected because**:
- ❌ Over-engineering for a single field
- ❌ Three-way sync complexity (workspace ↔ mapping ↔ chat)
- ❌ No clear benefit over workspace storage
- ❌ Introduces unnecessary indirection

**Example of what we avoided**:
```typescript
// BAD: Over-engineered separate store
interface SessionMappingStore {
  workspaceToSession: Map<string, string>;
  // Now we have to keep 3 stores in sync
}
```

---

## Implementation

### Data Model

```typescript
interface Workspace {
  id: string;
  name: string;
  rootPath: string;
  sessionIds: string[];
  lastActiveSessionId?: string;  // ← NEW FIELD
  lastAccessedAt: number;
  // ... other existing fields
}
```

### Store Functions Added

```typescript
interface WorkspaceStore {
  // Validation (prevents stale references)
  validateLastActiveSession: (workspaceId: string, sessionId?: string) => string | null;

  // Fallback (when validation fails)
  getMostRecentSessionForWorkspace: (workspaceId: string) => Session | null;

  // Update (tracks active session)
  updateWorkspaceLastActiveSession: (workspaceId: string, sessionId: string) => void;
}
```

### Cross-Store Coordination

Integration point in Chat store's `switchSession`:

```typescript
switchSession: async (id, projectId) => {
  // ... load session ...

  // Update workspace tracking (cross-store coordination)
  if (session?.workspaceId) {
    const workspaceStore = useWorkspaceStore.getState();
    workspaceStore.updateWorkspaceLastActiveSession(session.workspaceId, id);
  }
}
```

**Coordination mechanism**: Existing `storeSync` event system handles cross-store updates.

---

## Consequences

### Positive ✅

- ✅ **Clean data model** with clear ownership
- ✅ **Follows existing patterns** in codebase (`sessionIds[]` precedent)
- ✅ **Easy to reason about** - workspace data lives in workspace store
- ✅ **Simple implementation** - single field addition, no new stores
- ✅ **Testable** - store functions are pure and isolated

### Negative ⚠️

- ⚠️ **Cross-store coordination required**
  - **Mitigation**: Use existing `storeSync` event system (already battle-tested)
  - **Example**: Chat store's `switchSession` updates workspace store

- ⚠️ **Workspace must know about sessions**
  - **Mitigation**: Already true via `sessionIds[]` field
  - **Not a new coupling**: Workspace has always tracked its sessions

### Trade-offs Accepted

We accept the need for cross-store coordination because:
1. It's a **one-way dependency** (workspace ← chat) that's easy to test
2. Existing `storeSync` handles this pattern reliably
3. Alternative approaches (separate store, chat store) have worse trade-offs

---

## Validation

### Data Integrity

The implementation includes self-healing validation:

```typescript
validateLastActiveSession: (workspaceId, sessionId) => {
  if (!sessionId) return null;

  const session = chatStore.sessions.find(s => s.id === sessionId);

  // Check 1: Session exists
  if (!session) {
    log.warn('lastActiveSessionId not found', { workspaceId, sessionId });
    return null;
  }

  // Check 2: Workspace matches
  if (session.workspaceId !== workspaceId) {
    log.warn('lastActiveSessionId workspace mismatch', {
      workspaceId,
      sessionId,
      sessionWorkspaceId: session.workspaceId,
    });
    return null;
  }

  return sessionId;
}
```

### Fallback Strategy

When validation fails (deleted session, data corruption), fall back to most recent:

```typescript
getMostRecentSessionForWorkspace: (workspaceId) => {
  const workspaceSessions = chatStore.sessions.filter(
    s => s.workspaceId === workspaceId
  );

  if (workspaceSessions.length === 0) return null;

  // Sort by updated_at descending, return first
  return workspaceSessions.sort((a, b) =>
    (b.updated_at || b.created_at || 0) - (a.updated_at || a.created_at || 0)
  )[0];
}
```

---

## Testing

### Test Coverage

45 tests across 4 layers:

1. **Store tests** (15 tests):
   - `validateLastActiveSession` - handles invalid refs, workspace mismatch
   - `getMostRecentSessionForWorkspace` - sorts correctly, handles empty
   - `updateWorkspaceLastActiveSession` - updates state, persists to localStorage

2. **Hook tests** (4 tests):
   - `cleanupStream` - gracefully stops EventSource before switch

3. **UI tests** (12 tests):
   - ProjectList workspace click - auto-selects, falls back, shows empty state
   - SessionPanel empty state - displays correctly, auto-focuses button

4. **Integration tests** (14 tests):
   - E2E: Remember last active across workspace switches
   - E2E: Deletion fallback with toast notification
   - E2E: Empty workspace handling
   - E2E: Streaming interruption handling

### Coverage

- Lines: >90%
- Branches: >90%
- Functions: 100%

---

## Related Documentation

- **Design**: [`docs/plans/2026-02-23-recent-session-selection-design.md`](../plans/2026-02-23-recent-session-selection-design.md)
- **Implementation**: [`docs/plans/2026-02-23-workspace-session-selection.md`](../plans/2026-02-23-workspace-session-selection.md)
- **Feature Docs**: [`docs/FEATURES.md`](../FEATURES.md#auto-select-last-active-session)
- **Memory Entry**: [`CLAUDE.md`](../../CLAUDE.md#workspace-session-selection-2026-02-23)

---

## Revision History

| Date | Change | Author |
|------|--------|--------|
| 2026-02-23 | Initial decision | Claude + User |

---

## Notes

This ADR captures a **fundamental architectural decision** about state ownership. The principle "workspace state lives in workspace store" should guide future decisions about adding workspace-related fields.

**Future considerations**: If we ever need to store more session-related workspace state (e.g., `lastScrollPosition`, `lastActiveFile`), this ADR establishes the precedent that such state belongs in the Workspace store, not scattered across multiple stores.
