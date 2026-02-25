# Spec Validation Examples

This document provides real-world examples of spec validation catching issues before implementation. Each example shows the spec text, what validation found, and how the issue was resolved.

---

## Table of Contents

1. [The UUID Bug (Real Case)](#the-uuid-bug-real-case)
2. [Missing Type Conversion](#missing-type-conversion)
3. [Conflicting Requirements](#conflicting-requirements)
4. [Non-Existent Dependency](#non-existent-dependency)
5. [Performance Infeasibility](#performance-infeasibility)
6. [Cross-Store Type Mismatch](#cross-store-type-mismatch)
7. [API Contract Mismatch](#api-contract-mismatch)
8. [Validation Process Walkthrough](#validation-process-walkthrough)

---

## The UUID Bug (Real Case)

This is the actual bug that motivated the spec validation skill.

### Original Spec

```markdown
## Workspace Session Selection

When user clicks on a workspace:
1. Get the workspace's sessions
2. Find the most recent session
3. Call switchSession with the session's workspaceId
4. Update UI to show selected session
```

### What Spec Validation Would Find

**Validation Step 1: Type Consistency**

```
Checking: switchSession(sessionId, projectId)

Source: session.workspaceId
  - Defined in: types/sessions.ts
  - Type: string (UUID format: "ca31cb4c-4784-4fc8-...")
  - Example value: "ca31cb4c-4784-4fc8-8e36-eb3368340def"

Consumer: switchSession second parameter
  - Defined in: lib/store/index.ts
  - Type: projectId: string (encoded path format: "-workspace-docs")
  - Used for: API call ?project={projectId}
  - Example value: "-workspace-docs"

MISMATCH DETECTED:
  - Source provides: UUID ("ca31cb4c-...")
  - Consumer expects: encoded path ("-workspace-docs")
  - These are NOT the same format
```

**Finding Report**

```
## Type Consistency Finding

| Field | Expected | Actual | Severity |
|-------|----------|--------|----------|
| switchSession 2nd param | encoded path | UUID | CRITICAL |

PROBLEM:
  Spec says "call switchSession with the session's workspaceId"
  But workspaceId is a UUID, and switchSession expects projectId (encoded path)

IMPACT:
  API call: /api/sessions/{id}/messages?project=ca31cb4c-4784-...
  Expected: /api/sessions/{id}/messages?project=-workspace-docs
  Result: 404 Not Found (project directory doesn't exist)

ROOT CAUSE:
  - Workspace Store has: workspaceId (UUID) + rootPath (file path)
  - CLI Session has: projectId (encoded directory name)
  - Spec confused the two identifiers

FIX:
  Change spec to:
  "Call switchSession with getProjectIdFromWorkspace(session.workspaceId)"

  Or more explicitly:
  "Convert workspace UUID to project path using:
   1. Look up workspace in workspace store
   2. Get workspace.rootPath
   3. Encode path: encodeProjectPath(rootPath)
   4. Pass encoded path to switchSession"
```

### Corrected Spec

```markdown
## Workspace Session Selection

When user clicks on a workspace:
1. Get the workspace's sessions
2. Find the most recent session
3. Convert workspace UUID to project ID:
   - Get workspace from store using workspaceId
   - Encode rootPath: encodeProjectPath(workspace.rootPath)
4. Call switchSession(sessionId, projectId)
5. Update UI to show selected session
```

### Outcome

Without spec validation: Bug shipped, caused 404 errors, required hotfix.
With spec validation: Bug caught in 30 seconds, fixed before any code written.

---

## Missing Type Conversion

### Spec Text

```markdown
## Display Session Timestamps

Show session timestamps in user-friendly format:
1. Get session.created_at from store
2. Display using formatDate(session.created_at)
```

### Validation Finding

```
Checking: formatDate parameter type

Source: session.created_at
  - Type: number (Unix timestamp in MILLISECONDS)
  - Example: 1708790400000

Consumer: formatDate(date: Date)
  - Expects: Date object
  - Usage: date.toLocaleDateString()

MISMATCH DETECTED:
  - Source provides: number (milliseconds)
  - Consumer expects: Date object
```

### Finding Report

```
## Type Consistency Finding

PROBLEM:
  Spec assumes direct compatibility between timestamp and Date
  formatDate expects Date, but session stores milliseconds

IMPACT:
  formatDate(1708790400000) would fail or produce garbage

FIX OPTIONS:
  1. Add conversion: formatDate(new Date(session.created_at))
  2. Create wrapper: formatTimestamp(session.created_at)
  3. Change formatDate to accept number

RECOMMENDATION: Option 2 (cleaner, reusable)
```

### Corrected Spec

```markdown
## Display Session Timestamps

Show session timestamps in user-friendly format:
1. Get session.created_at from store (milliseconds)
2. Convert to Date: new Date(session.created_at)
3. Display using formatDate(dateObject)
```

---

## Conflicting Requirements

### Spec Text

```markdown
## Session Management

Requirements:
- R1: Every message must have a sessionId
- R2: New conversations start with empty state (no session)
- R3: First message creates the session
```

### Validation Finding

```
Checking: Logical consistency

R1: "Every message must have a sessionId"
R2: "New conversations start with empty state (no session)"

CONFLICT DETECTED:
  - R1 requires sessionId for EVERY message
  - R2 says new conversations have NO session
  - What sessionId does the FIRST message have?

R3 clarifies, but creates race condition:
  - User types first message
  - Message needs sessionId (per R1)
  - But session doesn't exist yet (per R2)
  - Session created by first message (per R3)
  - Circular dependency: message needs session, session created by message
```

### Finding Report

```
## Logical Consistency Finding

PROBLEM:
  Requirements R1, R2, R3 create a chicken-and-egg problem
  Cannot send first message without sessionId
  Cannot create sessionId without first message

IMPACT:
  Implementer will be confused or make arbitrary choice
  Different implementations may be incompatible

FIX:
  Clarify the lifecycle:
  1. Generate sessionId BEFORE first message (optimistic)
  2. First message sent WITH pre-generated sessionId
  3. Backend creates session record on first message receipt

  Or alternative:
  1. Relax R1: "Every message EXCEPT first must have sessionId"
  2. First message creates session, returns sessionId
  3. Subsequent messages use returned sessionId
```

### Corrected Spec

```markdown
## Session Management

Requirements:
- R1: New conversation generates UUID sessionId before first message
- R2: First message sent with pre-generated sessionId
- R3: Backend creates session record on first message receipt
- R4: Subsequent messages use same sessionId
- R5: SessionId persisted client-side for recovery
```

---

## Non-Existent Dependency

### Spec Text

```markdown
## Auto-Save Feature

When content changes:
1. Debounce for 500ms
2. Call workspace.autoSave(content)
3. Update last saved timestamp
```

### Validation Finding

```
Checking: Dependency existence

workspace.autoSave
  - Searching: types/workspace.ts
  - Searching: lib/store/workspaces.ts
  - Searching: hooks/useWorkspace.ts

NOT FOUND:
  - Workspace interface has no autoSave method
  - No autoSave function exists in codebase

Workspace interface (actual):
  interface Workspace {
    id: string;
    name: string;
    rootPath: string;
    // No autoSave!
  }
```

### Finding Report

```
## Dependency Check Finding

PROBLEM:
  Spec references workspace.autoSave(content)
  This method does not exist

IMPACT:
  Implementation would fail immediately
  TypeScript would catch this, but after time wasted

FIX OPTIONS:
  1. Add autoSave method to Workspace interface + implementation
  2. Use existing file write APIs: writeFile(path, content)
  3. Create new useAutoSave hook

RECOMMENDATION:
  Review if autoSave was intended to be implemented earlier
  If new feature, add to scope with proper estimation
```

### Corrected Spec

```markdown
## Auto-Save Feature

When content changes:
1. Debounce for 500ms
2. Get file path from current workspace context
3. Call writeFile(workspace.rootPath + '/file.md', content)
4. Update last saved timestamp

NOTE: If workspace.autoSave is preferred, implement first:
- Add autoSave method to Workspace interface
- Implement in workspaceStore
- Estimated additional work: 2 hours
```

---

## Performance Infeasibility

### Spec Text

```markdown
## Global Search

When user types in search box:
1. Search all session content in real-time
2. Display matching results as they type
3. Highlight matches in context
```

### Validation Finding

```
Checking: Feasibility

"Search all session content in real-time"

Data volume analysis:
  - Average sessions per workspace: 50
  - Average session file size: 100KB
  - Total data to search: 5MB per workspace
  - Users may have 10+ workspaces: 50MB+ total

Performance calculation:
  - String search: ~100MB/sec on modern hardware
  - Time for 50MB: 500ms
  - User expectation for "real-time": <50ms
  - Gap: 10x too slow

Additional concerns:
  - Loading 50MB into memory on page load?
  - Network transfer if sessions on server?
  - Mobile devices even slower
```

### Finding Report

```
## Feasibility Finding

PROBLEM:
  "Real-time search all session content" is not feasible
  Data volume exceeds real-time threshold by 10x

IMPACT:
  Implementation would result in:
  - UI freezing during search
  - High memory usage
  - Poor mobile experience

FIX OPTIONS:
  1. Index-based search (pre-build inverted index)
  2. Server-side search (offload processing)
  3. Scope limitation (search recent N sessions only)
  4. Debounced search (not true real-time, but acceptable)
  5. Progressive search (search headers first, content on demand)

RECOMMENDATION:
  Combination of 4 + 5:
  - Debounce input by 300ms
  - Search session headers/titles first (<1MB)
  - Search content only when user requests specific session
```

### Corrected Spec

```markdown
## Global Search

When user types in search box:
1. Debounce input by 300ms
2. Search session headers/titles (name, date, first line)
3. Display matching sessions in list
4. On session click, search within that session's content
5. Highlight matches in context

Performance targets:
- Header search: <50ms
- Single session content search: <100ms
- Total perceived latency: <200ms (feels instant)
```

---

## Cross-Store Type Mismatch

### Spec Text

```markdown
## Session-Workspace Linking

When loading session:
1. Get session's workspaceId
2. Find matching workspace in workspaceStore
3. Display workspace name in session header
```

### Validation Finding

```
Checking: Type consistency across stores

Session (from chatStore):
  {
    id: string,          // UUID: "abc-123-..."
    workspaceId: string, // Actually projectId: "-workspace-docs"
    ...
  }

Workspace (from workspaceStore):
  {
    id: string,          // UUID: "xyz-789-..."
    rootPath: string,    // Path: "/workspace/docs"
    ...
  }

Finding workspace match:
  - Session has: workspaceId = "-workspace-docs" (encoded path!)
  - Workspace has: id = "xyz-789-..." (UUID!)
  - Cannot directly match: session.workspaceId !== workspace.id

Wait - session.workspaceId is actually an ENCODED PATH disguised as an ID!
This is a naming confusion in the schema.
```

### Finding Report

```
## Type Consistency Finding

PROBLEM:
  Field naming creates confusion:
  - session.workspaceId looks like a workspace UUID
  - It's actually an ENCODED PATH (e.g., "-workspace-docs")
  - Cannot match directly against workspace.id (UUID)

IMPACT:
  workspaceStore.get(session.workspaceId) returns undefined
  Logic fails silently or with confusing errors

ROOT CAUSE:
  Schema naming doesn't reflect actual data format
  session.workspaceId should be session.projectId

FIX:
  To find workspace from session:
  1. Decode session.workspaceId to path: decodeProjectPath("-workspace-docs") -> "/workspace/docs"
  2. Find workspace by rootPath match, not by id
  3. Or: maintain projectId -> workspaceId mapping

BETTER LONG-TERM:
  - Rename session.workspaceId to session.projectPath
  - Add session.workspaceUUID if UUID lookup needed
  - Document the difference clearly
```

### Corrected Spec

```markdown
## Session-Workspace Linking

When loading session:
1. Get session's projectId (note: stored as workspaceId, but is encoded path)
2. Decode to path: decodeProjectPath(session.workspaceId)
3. Find workspace where workspace.rootPath matches decoded path
4. Display workspace.name in session header

NOTE: Field naming is confusing - session.workspaceId is actually projectId format
Future refactor: rename to session.projectPath for clarity
```

---

## API Contract Mismatch

### Spec Text

```markdown
## Load Session Messages

When switching sessions:
1. Call GET /api/sessions/{id}/messages
2. Parse response.messages array
3. Display in chat view
```

### Validation Finding

```
Checking: API contract

Expected (from spec):
  GET /api/sessions/{id}/messages
  Response: { messages: Message[] }

Actual (from route.ts):
  GET /api/sessions/{id}/messages?project={projectId}  // Query param required!
  Response: {
    messages: SDKMessage[],  // Different type name!
    error?: string           // Error field exists
  }

MISMATCHES:
  1. Missing required ?project= query parameter
  2. Response type is SDKMessage, not Message
  3. Error handling not specified
```

### Finding Report

```
## Dependency Check Finding

PROBLEM:
  Spec API contract doesn't match actual implementation

MISMATCHES:
  1. Query param ?project= is required but not mentioned
  2. Response type SDKMessage vs Message (different fields)
  3. Error response not handled

IMPACT:
  - Missing ?project= -> 400 Bad Request
  - Wrong type -> TypeScript errors or runtime failures
  - No error handling -> silent failures

FIX:
  Update spec to match actual API:
  1. Add ?project= parameter
  2. Use correct SDKMessage type
  3. Add error handling
```

### Corrected Spec

```markdown
## Load Session Messages

When switching sessions:
1. Get projectId for session (see workspace linking spec)
2. Call GET /api/sessions/{id}/messages?project={projectId}
3. Check response for errors:
   - If response.error, display error message
   - If success, parse response.messages (type: SDKMessage[])
4. Transform SDKMessage[] to display format
5. Display in chat view
```

---

## Validation Process Walkthrough

Here's a complete example of running spec validation on a new feature spec.

### Input Spec

```markdown
## Feature: Auto-Select Last Active Session

When user switches to a workspace:
1. Check if workspace has lastActiveSessionId
2. If yes, switch to that session
3. If no, show empty state
4. Update lastActiveSessionId when user selects a session
```

### Step 1: Type Consistency

```
CHECKING TYPES...

lastActiveSessionId:
  - Where stored: Workspace interface?
  - Type: string (session UUID)
  - FINDING: Workspace interface has NO lastActiveSessionId field

switchSession requirement:
  - Needs: (sessionId: string, projectId: string)
  - Spec mentions: sessionId only
  - FINDING: Missing projectId parameter

Scores:
  - lastActiveSessionId field: MISSING (CRITICAL)
  - switchSession parameters: INCOMPLETE (CRITICAL)
```

### Step 2: Logical Consistency

```
CHECKING LOGIC...

"If workspace has lastActiveSessionId, switch to that session"
  - What if session was deleted? (edge case)
  - What if session belongs to different workspace? (validation)
  - What if user is streaming? (interrupt handling)

FINDINGS:
  - Deleted session: UNDEFINED (HIGH)
  - Wrong workspace: UNDEFINED (HIGH)
  - Active streaming: UNDEFINED (MEDIUM)
```

### Step 3: Dependency Check

```
CHECKING DEPENDENCIES...

Required but missing:
  - Workspace.lastActiveSessionId field
  - updateWorkspaceLastActiveSession action
  - validateSessionInWorkspace helper

Existing and available:
  - switchSession action
  - Workspace store
  - Session store
```

### Step 4: Feasibility

```
CHECKING FEASIBILITY...

Storage: lastActiveSessionId
  - Where: localStorage (via Zustand persist)
  - Size: ~50 bytes per workspace
  - Count: ~10 workspaces typical
  - Total: ~500 bytes
  - FEASIBLE

Performance:
  - Lookup: O(1) from Map
  - Switch: Existing operation
  - FEASIBLE

Security:
  - No sensitive data
  - User's own sessions
  - FEASIBLE
```

### Validation Report

```
## Spec Validation Report: Auto-Select Last Active Session

### Type Consistency
| Issue | Severity | Resolution |
|-------|----------|------------|
| Workspace.lastActiveSessionId missing | CRITICAL | Add field to interface |
| switchSession missing projectId | CRITICAL | Add to spec |

### Logical Consistency
| Issue | Severity | Resolution |
|-------|----------|------------|
| Deleted session not handled | HIGH | Add validation + fallback |
| Wrong workspace session | HIGH | Add ownership check |
| Active streaming not handled | MEDIUM | Add interrupt logic |

### Dependency Check
| Missing | Required By |
|---------|-------------|
| lastActiveSessionId field | Core feature |
| updateWorkspaceLastActiveSession action | Step 4 |
| validateSessionInWorkspace helper | Edge cases |

### Feasibility
- Storage: PASS
- Performance: PASS
- Security: PASS

### Summary
- CRITICAL: 2
- HIGH: 2
- MEDIUM: 1

### Recommendation
DO NOT PROCEED until CRITICAL issues resolved.
Estimated spec revision time: 30 minutes.
```

### Revised Spec

```markdown
## Feature: Auto-Select Last Active Session

### Data Model Changes
- Add to Workspace interface: lastActiveSessionId?: string

### Store Changes
- Add action: updateWorkspaceLastActiveSession(workspaceId, sessionId)
- Add selector: getLastActiveSession(workspaceId) -> Session | null

### Behavior

When user switches to a workspace:
1. Get lastActiveSessionId from workspace
2. If exists, validate:
   a. Session still exists (not deleted)
   b. Session belongs to this workspace
   c. If validation fails, clear lastActiveSessionId, goto step 5
3. If valid, check for active streaming:
   a. If streaming, cleanup stream first
   b. Then proceed to switch
4. Get projectId: getProjectIdFromWorkspace(workspaceId)
5. Call switchSession(lastActiveSessionId, projectId)
6. Show empty state if no lastActiveSessionId

When user selects a session:
1. Validate session belongs to current workspace
2. Call updateWorkspaceLastActiveSession(workspaceId, sessionId)
3. Persist to localStorage via Zustand

### Edge Cases
- Deleted session: Clear lastActiveSessionId, show empty state
- Wrong workspace: Clear, show warning, empty state
- Active streaming: Cleanup stream with toast notification
- Multiple rapid switches: Debounce to prevent race conditions
```

---

## Summary

Spec validation catches issues in these categories:

| Category | % of Bugs | Example |
|----------|-----------|---------|
| Type Mismatches | 40% | UUID vs encoded path |
| Missing Dependencies | 25% | Field doesn't exist |
| Logical Gaps | 20% | Edge cases undefined |
| Infeasibility | 15% | Performance impossible |

**Key insight**: Most spec bugs are detectable by asking:
1. "Does this type match what's expected?"
2. "Does this thing actually exist?"
3. "What happens when this fails?"
4. "Is this physically possible?"

Time to validate: 5-15 minutes.
Time to fix bugs later: 2-8 hours.

**ROI: 8-32x time saved by catching issues early.**
