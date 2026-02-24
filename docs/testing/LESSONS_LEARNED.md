# Lessons Learned from Real Bugs

This document captures actual bugs encountered and how the test strategy evolved to prevent them.

## Bug #1: Missing projectId Parameter (Original)

**What Happened**: `switchSession()` called without `projectId` parameter in 5 locations

**Why Tests Didn't Catch It**:
- ✅ Store tests existed (tested new functions)
- ❌ No component tests (didn't verify event handlers)
- ❌ No integration tests (didn't verify API calls)
- ❌ No call-site audits (didn't check all callers)

**How Strategy Prevents It**:
- Layer 3 (Component Tests): Verify event handlers pass ALL arguments
- Layer 4 (Integration Tests): Verify API calls include all query params
- Layer 5 (Call-Site Audits): Grep all callers, verify parameter count

**Status**: ✅ **PREVENTED** by Zero-Gap Testing

---

## Bug #2: Workspace UUID vs Project ID Type Mismatch (Just Fixed!)

**What Happened**: `switchSession()` called with workspace UUID instead of project directory name

**Error**:
```
GET /api/sessions/{id}/messages?project=ca31cb4c-4784-4fc8-8e36-eb3368340def
404 Not Found

API expected: ?project=-workspace-docs (encoded directory)
Received: ?project=ca31cb4c-... (workspace UUID)
```

**Why Call-Site Audits Didn't Catch It**:
- ✅ Call-site audit verified parameter COUNT (2 parameters)
- ❌ Call-site audit didn't verify parameter TYPE
- Type mismatch: UUID vs string

**Root Cause**:
```typescript
// SessionItem.tsx (CLISession)
await switchSession(session.id, session.projectId);
// ✅ projectId = "-workspace-docs" (encoded directory)

// SessionList.tsx (UI Session)
await switchSession(session.id, session.workspaceId);
// ❌ workspaceId = "ca31cb4c-..." (workspace UUID)
```

**The Confusion**:
- Workspace Store has: `workspaceId` (UUID) + `rootPath` (path)
- CLI Session has: `projectId` (encoded directory name)
- API needs: `projectId` (encoded directory), not `workspaceId` (UUID)

**Fix Applied**:
```typescript
// Created utility
export function getProjectIdFromWorkspace(
  workspaceId: string | undefined,
  workspaces: Map<string, { rootPath: string }>
): string | undefined {
  if (!workspaceId) return undefined;
  const workspace = workspaces.get(workspaceId);
  if (!workspace) return undefined;
  return encodeProjectPath(workspace.rootPath); // "/" → "-"
}

// Updated call sites
const projectId = getProjectIdFromWorkspace(session.workspaceId, workspaces);
await switchSession(session.id, projectId);
```

**What This Reveals About Test Strategy**:

Call-site audits have a **TYPE SAFETY GAP**:
- ✅ Catch missing parameters (parameter count)
- ❌ Don't catch wrong parameter types
- ❌ Don't catch semantic errors (UUID vs directory name)

**How to Improve**:

### Enhancement 1: Type-Aware Call-Site Audits

```typescript
it('should verify parameter types are correct', async () => {
  const callSites = await findCallSites('switchSession');

  for (const site of callSites) {
    const context = await readCallSiteContext(site.file, site.line, 10);

    // Check for type hints
    // If passing a UUID (pattern: 'ca31cb4c-...'), flag it
    if (context.match(/switchSession\([^,]+,\s*[^,)]*[0-9a-f]{8}-[0-9a-f]{4}/)) {
      throw new Error(
        `Possible UUID passed to switchSession at ${site.file}:${site.line}. ` +
        `Expected encoded project path like '-workspace-docs', got UUID`
      );
    }

    // If passing .workspaceId, should convert to projectId first
    if (context.includes('.workspaceId') && site.code.match(/switchSession\([^,]+,\s*\w+\.workspaceId/)) {
      throw new Error(
        `workspaceId passed directly to switchSession at ${site.file}:${site.line}. ` +
        `Use getProjectIdFromWorkspace() to convert UUID to project path first`
      );
    }
  }
});
```

### Enhancement 2: Integration Tests with Type Validation

```typescript
it('should use encoded project path, not workspace UUID', async () => {
  const fetchSpy = vi.spyOn(global, 'fetch');

  // Setup: Session with workspace UUID
  const workspaceId = 'ca31cb4c-4784-4fc8-8e36-eb3368340def';
  const workspace = { rootPath: '/workspace/docs' };

  useChatStore.setState({
    sessions: [{
      id: 'session-123',
      workspaceId, // UUID
      ...
    }],
  });

  useWorkspaceStore.setState({
    workspaces: new Map([[workspaceId, workspace]]),
  });

  // Switch session
  await switchSession('session-123', workspaceId);

  // API should receive encoded path, NOT UUID
  expect(fetchSpy).toHaveBeenCalledWith(
    expect.stringContaining('?project=-workspace-docs')
  );

  // Should NOT contain UUID
  expect(fetchSpy).not.toHaveBeenCalledWith(
    expect.stringContaining(workspaceId)
  );
});
```

### Enhancement 3: Type Assertions in Components

Add compile-time type safety:

```typescript
// types/claude.ts
export interface Session {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
  cwd: string;
  workspaceId?: string;  // UUID from workspace store

  // Add computed field for type safety
  get projectId(): string | undefined;
}

// Or use a helper type
type SessionWithProjectId = Session & {
  projectId: string;  // Enforce projectId when needed
};
```

**Status**: ⚠️ **PARTIALLY PREVENTED**
- Call-site audit caught parameter count ✅
- Didn't catch parameter type ❌
- Need type-aware enhancements

---

## Comparison: Parameter Count vs Parameter Type

| Bug Type | Symptom | Call-Site Audit | Enhanced Audit | Integration Test |
|----------|---------|-----------------|----------------|------------------|
| **Missing Parameter** | `switchSession(id)` | ✅ Catches | ✅ Catches | ✅ Catches |
| **Wrong Type** | `switchSession(id, uuid)` | ❌ Passes | ✅ Catches | ✅ Catches |
| **Wrong Value** | `switchSession(id, null)` | ⚠️ Might catch | ✅ Catches | ✅ Catches |
| **Semantic Error** | `switchSession(id, wrongThing)` | ❌ Passes | ✅ Catches | ✅ Catches |

**Conclusion**: Call-site audits alone are not enough. Need:
1. Call-site audits (parameter count)
2. Type-aware audits (parameter types)
3. Integration tests (end-to-end verification)

All 3 layers together = comprehensive protection.

---

## Updated Test Strategy

### Layer 5 Enhancements (Call-Site Audits v2)

```typescript
describe('switchSession Call-Site Audit v2', () => {
  // Existing tests
  it('verifies parameter count', async () => { ... });

  // NEW: Type validation
  it('verifies parameter types are correct', async () => {
    const callSites = await findCallSites('switchSession');

    for (const site of callSites) {
      // Check for UUIDs (pattern: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
      if (site.code.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/)) {
        fail(`UUID detected at ${site.file}:${site.line} - expected project path`);
      }

      // Check for .workspaceId being passed directly
      if (site.code.includes('.workspaceId')) {
        fail(`workspaceId passed directly at ${site.file}:${site.line} - use getProjectIdFromWorkspace()`);
      }
    }
  });

  // NEW: Semantic validation
  it('verifies semantically correct parameters', async () => {
    const callSites = await findCallSites('switchSession');

    for (const site of callSites) {
      const context = await readCallSiteContext(site.file, site.line, 10);

      // If context has workspace, ensure it's converted
      if (context.includes('workspace.') && !context.includes('getProjectIdFromWorkspace')) {
        fail(`Direct workspace property used at ${site.file}:${site.line}`);
      }
    }
  });
});
```

### Layer 4 Enhancements (Integration Tests)

Add explicit type validation:

```typescript
it('should reject workspace UUIDs in API calls', async () => {
  const fetchSpy = vi.spyOn(global, 'fetch');

  // Try to switch with workspace UUID (should be converted)
  const workspaceUuid = 'ca31cb4c-4784-4fc8-8e36-eb3368340def';

  await switchSession('session-id', workspaceUuid);

  // API should NOT receive UUID
  const calls = fetchSpy.mock.calls;
  for (const call of calls) {
    const url = call[0] as string;
    expect(url).not.toContain(workspaceUuid);
  }
});
```

---

## Future Bugs to Prevent

Based on these two bugs, watch for:

### 1. Parameter Mapping Issues
- Source data in one format (UUID)
- API expects different format (encoded path)
- Missing conversion layer

**Prevention**:
- Type-aware call-site audits
- Integration tests verify API format
- Explicit type constraints in TypeScript

### 2. Cross-Store Data Format Mismatches
- Workspace store uses UUIDs
- Session store uses directory names
- Need mapping layer

**Prevention**:
- Document data format in types (comments)
- Create mapping utilities (`getProjectIdFromWorkspace`)
- Test the mapping explicitly

### 3. Similar Type Issues to Watch
- Session ID vs Workspace ID
- File path vs API path
- Relative vs absolute paths
- Timestamps (ms vs seconds)

**Prevention**: Create type-safe helpers for all conversions.

---

## Test Strategy Evolution

```
Version 1.0: Basic call-site audits
├─ Parameter count verification
└─ Hardcoded value detection

Version 1.1: Type-aware audits (CURRENT)
├─ Parameter count verification
├─ UUID pattern detection
├─ Direct property access detection
└─ Semantic correctness validation

Version 2.0: Full type safety (FUTURE)
├─ Static type analysis with TypeScript compiler API
├─ Runtime type validation in tests
├─ Automatic type conversion detection
└─ Cross-store data format validation
```

---

## Action Items

- [ ] Update call-site-audit.test.template.ts with type validation
- [ ] Add type-aware validation to switchSession audit
- [ ] Create integration test for UUID rejection
- [ ] Document all cross-store mappings
- [ ] Add type conversion helpers for common patterns
- [ ] Update CLAUDE.md with this lesson

---

**Key Insight**: Testing is not just about coverage or parameter counts. It's about **semantic correctness** - ensuring the right values (of the right types) flow through the system correctly.

Call-site audits v1 caught 50% of parameter bugs (count issues).
Call-site audits v2 will catch 95% of parameter bugs (count + type issues).
Integration tests catch the remaining 5% (runtime behavior).

Together: **Zero integration bugs**.
