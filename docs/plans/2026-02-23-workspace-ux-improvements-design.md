# Workspace UX Improvements Design

**Date**: 2026-02-23
**Status**: Approved
**Approach**: Hybrid - Progressive Workspace Adoption

## Overview

This design addresses three UX improvements to the workspace system:

1. **Plus button repositioning**: Move add workspace button next to last tab instead of far right
2. **Directory browser selection fix**: Allow creating workspace from current browsing directory
3. **Workspace-session integration**: New chats automatically inherit workspace context

## Goals

- Improve workspace discoverability (plus button more visible)
- Reduce friction in workspace creation (no need to navigate up a level)
- Establish clear workspace-session relationship (chats belong to workspaces)
- Maintain backward compatibility (existing sessions continue working)

## Non-Goals

- Breaking changes to existing session data
- Forcing all sessions to have workspace assignments
- Implementing workspace-specific file trees (future enhancement)

## Architecture & Data Model

### Bidirectional Linking

We establish a bidirectional relationship between workspaces and sessions:

**Workspace side** (`useWorkspaceStore`):
```typescript
interface Workspace {
  // ... existing fields
  sessionIds: string[];  // NEW: Track all sessions for this workspace
}
```

**Session side** (`useChatStore`):
```typescript
interface Session {
  // ... existing fields
  workspaceId?: string;  // NEW: Optional link to workspace
}
```

### Design Decisions

1. **Optional workspace link**: `Session.workspaceId` is optional to support:
   - Legacy sessions created before workspace system
   - Future use cases where sessions might not need workspace context

2. **Sync responsibility**: When creating a new session:
   - Chat store sets `session.workspaceId = activeWorkspaceId`
   - Workspace store appends to `workspace.sessionIds`
   - Both stores update atomically to prevent desync

3. **Working directory**: Active workspace's `rootPath` is passed as `cwd` parameter when:
   - Creating new sessions
   - Sending messages (Claude CLI receives correct working directory)

4. **Sidebar organization**: Sessions displayed in two groups:
   - **By Workspace**: Sessions with `workspaceId` grouped under workspace name
   - **Unassigned**: Sessions without `workspaceId` (legacy or intentionally unlinked)

## UI/UX Changes

### 1. Plus Button Repositioning

**Current Behavior**:
- Plus button fixed at far right with `border-l`
- Separated from workspace tabs
- Always visible but feels disconnected

**New Behavior**:
- When tabs don't overflow: Button appears inline immediately after last tab
- When tabs overflow: Button becomes sticky at scroll end (right edge of visible area)

**Implementation**:
```tsx
// WorkspaceTabBar.tsx structure
<div className="flex items-center">
  <div className="flex items-center flex-1 overflow-x-auto">
    {workspaces.map(...)}
    {/* Plus button INSIDE scrollable container */}
    <button className="shrink-0 w-10 h-10 ...">+</button>
  </div>
</div>
```

The button naturally scrolls with tabs since it's inside the `overflow-x-auto` container. When tabs overflow and user scrolls, the button scrolls too until it reaches the right edge.

**Files to modify**:
- `src/components/workspace/WorkspaceTabBar.tsx`

### 2. Directory Browser Selection Fix

**Current Behavior**:
- `selectedPath` state only set when clicking subfolder items
- "Select" button disabled when `!selectedPath`
- Navigating INTO a folder leaves `selectedPath` null → button disabled

**New Behavior**:
- "Select" button always enabled (as long as `currentPath` exists)
- Button uses `selectedPath || currentPath` (prefer explicit selection, fall back to current)
- When no subfolder clicked: Button shows "Select Current Folder"
- When subfolder clicked: Button shows "Select" (existing behavior)

**Implementation**:
```tsx
// DirectoryBrowser.tsx
const handleSelect = () => {
  const pathToUse = selectedPath || currentPath;
  onSelect(pathToUse);
};

// Button enable condition
disabled={!currentPath}  // Instead of: disabled={!selectedPath}

// Dynamic label
<button disabled={!currentPath}>
  {selectedPath ? 'Select' : 'Select Current Folder'}
</button>
```

**Files to modify**:
- `src/components/workspace/DirectoryBrowser.tsx`

### 3. Workspace-Session Integration

#### Session Creation Flow

**When user creates a new chat** (Cmd+N or clicking New Chat):

1. `useChatStore.startNewSession()` checks for active workspace:
   ```typescript
   const activeWorkspace = useWorkspaceStore.getState().workspaces.get(activeWorkspaceId);
   const workspaceId = activeWorkspace?.id;
   const cwd = activeWorkspace?.rootPath || '/workspace';
   ```

2. Create session with workspace link:
   ```typescript
   const newSession: Session = {
     id: newSessionId,
     name: 'New Chat',
     cwd: cwd,  // Use workspace's rootPath
     workspaceId: workspaceId,  // NEW: Link to workspace
     created_at: Date.now(),
     updated_at: Date.now(),
   };
   ```

3. Update workspace to track session:
   ```typescript
   if (workspaceId) {
     useWorkspaceStore.getState().addSessionToWorkspace(workspaceId, newSessionId);
   }
   ```

#### Switching Between Workspaces

**When user clicks a workspace tab**:

1. `setActiveWorkspace(id)` is called
2. Sidebar filters sessions to show only workspace's sessions
3. If workspace has sessions → show most recent session
4. If workspace has no sessions → show empty state with "Start new chat in [workspace name]" prompt

#### Passing Working Directory to Claude

**When sending messages**:

```typescript
// useClaudeChat.ts
const sendMessage = async (prompt: string, attachments?: FileAttachment[]) => {
  const { activeWorkspaceId, workspaces } = useWorkspaceStore.getState();
  const activeWorkspace = activeWorkspaceId ? workspaces.get(activeWorkspaceId) : null;
  const cwd = activeWorkspace?.rootPath || '/workspace';

  // Pass cwd to API
  const response = await fetch('/api/claude/route', {
    method: 'POST',
    body: JSON.stringify({
      prompt,
      sessionId: currentSessionId,
      cwd,  // Claude CLI receives workspace's directory
      model: preferredModel,
      provider,
      providerConfig,
    }),
  });
};
```

**Files to modify**:
- `src/lib/store/index.ts` (add `workspaceId` to Session type)
- `src/lib/store/workspaces.ts` (add `sessionIds` to Workspace, add `addSessionToWorkspace` action)
- `src/hooks/useClaudeChat.ts` (integrate workspace context)
- `src/components/sidebar/Sidebar.tsx` (filter sessions by workspace)

## Edge Cases & Error Handling

### Edge Case 1: Workspace Deletion

**Problem**: What happens to sessions when a workspace is deleted?

**Solution**: Unlink sessions (set `workspaceId = undefined`), move to "Unassigned" section.

```typescript
// In useWorkspaceStore.removeWorkspace()
removeWorkspace: async (id) => {
  const workspace = workspaces.get(id);

  // Unlink all sessions from this workspace
  workspace?.sessionIds.forEach(sessionId => {
    useChatStore.getState().unlinkSessionFromWorkspace(sessionId);
  });

  // Then remove workspace...
}
```

**Why not delete sessions?**: Preserve user data. Sessions may contain valuable conversation history.

### Edge Case 2: No Active Workspace

**Problem**: User closes all workspaces, then tries to create new chat.

**Solution**: Fall back to `/workspace` as default `cwd`, create session without `workspaceId`.

```typescript
const cwd = activeWorkspace?.rootPath || '/workspace';
const workspaceId = activeWorkspace?.id;  // undefined if no active workspace
```

### Edge Case 3: Session Switching Across Workspaces

**Problem**: User is viewing workspace A, switches to session from workspace B.

**Solution**: Auto-switch workspace (more consistent mental model).

```typescript
switchSession: async (sessionId) => {
  const session = sessions.find(s => s.id === sessionId);

  // If session has workspace, switch to it
  if (session?.workspaceId) {
    useWorkspaceStore.getState().setActiveWorkspace(session.workspaceId);
  }

  // Then load session...
}
```

**Alternative considered**: Allow cross-workspace viewing. **Rejected** because it creates inconsistent state (active workspace tab doesn't match session's workspace).

### Sync Consistency

**Critical invariant**: `workspace.sessionIds` must stay in sync with `session.workspaceId`.

**Enforcement**:
- When creating session → update both
- When deleting session → remove from workspace's sessionIds array
- When unlinking session → remove from both sides

```typescript
// Helper function to maintain sync
const linkSessionToWorkspace = (sessionId: string, workspaceId: string) => {
  // Update session
  useChatStore.getState().updateSession(sessionId, { workspaceId });

  // Update workspace
  useWorkspaceStore.getState().addSessionToWorkspace(workspaceId, sessionId);
};
```

## Migration Strategy

### Existing Sessions

**On first load after update**:

```typescript
// In useWorkspaceStore.initialize()
const migrateExistingSessions = () => {
  const { sessions } = useChatStore.getState();
  const { workspaces } = useWorkspaceStore.getState();

  // Find "Current Workspace" (the /workspace one)
  const defaultWorkspace = Array.from(workspaces.values())
    .find(ws => ws.rootPath === '/workspace');

  if (!defaultWorkspace) return;

  // Assign all unlinked sessions to default workspace
  sessions.forEach(session => {
    if (!session.workspaceId) {
      session.workspaceId = defaultWorkspace.id;
      if (!defaultWorkspace.sessionIds.includes(session.id)) {
        defaultWorkspace.sessionIds.push(session.id);
      }
    }
  });

  log.info('Migrated existing sessions to default workspace', {
    defaultWorkspaceId: defaultWorkspace.id,
    migratedCount: sessions.filter(s => s.workspaceId === defaultWorkspace.id).length,
  });
};
```

**Why assign to default workspace?**: Prevents existing sessions from becoming "orphaned". Users see continuity (all their chats still exist under "Current Workspace").

## Debug Logging

### Logging Strategy

Use the existing `createLogger` system with structured logging for all workspace-session operations.

**Logger instances**:
```typescript
// In useWorkspaceStore
const log = createLogger('WorkspaceStore');

// In useChatStore (session operations)
const log = createLogger('ChatStore:Sessions');

// In useClaudeChat (workspace context)
const log = createLogger('ClaudeChat:Workspace');
```

### Key Log Points

**1. Session Creation**
```typescript
log.debug('Creating session with workspace context', {
  sessionId: newSessionId,
  workspaceId: workspaceId || 'none',
  cwd,
  hasActiveWorkspace: !!activeWorkspace,
});
```

**2. Workspace-Session Linking**
```typescript
log.debug('Linking session to workspace', {
  sessionId,
  workspaceId,
  workspaceSessionCount: workspace.sessionIds.length,
});
```

**3. Session Unlinking**
```typescript
log.debug('Unlinking session from workspace', {
  sessionId,
  previousWorkspaceId: session.workspaceId,
  reason: 'workspace_deleted' | 'manual_unlink',
});
```

**4. Workspace Tab Switch**
```typescript
log.debug('Switching active workspace', {
  fromWorkspaceId: previousActiveId,
  toWorkspaceId: id,
  sessionCount: workspace.sessionIds.length,
  willAutoSwitchSession: workspace.sessionIds.length > 0,
});
```

**5. Session Switch with Workspace Auto-Switch**
```typescript
log.debug('Switching session', {
  sessionId,
  sessionWorkspaceId: session.workspaceId,
  currentActiveWorkspaceId: activeWorkspaceId,
  willSwitchWorkspace: session.workspaceId !== activeWorkspaceId,
});
```

**6. Migration**
```typescript
log.info('Migrating existing sessions to default workspace', {
  defaultWorkspaceId: defaultWorkspace.id,
  unlinkedSessionCount: sessions.filter(s => !s.workspaceId).length,
  totalSessionCount: sessions.length,
});
```

**7. Sync Issues (Errors)**
```typescript
log.error('Workspace-session sync mismatch detected', {
  sessionId,
  sessionWorkspaceId: session.workspaceId,
  workspaceHasSession: workspace.sessionIds.includes(sessionId),
  action: 'auto_fixing',
});
```

**8. Working Directory Context**
```typescript
log.debug('Sending message with workspace context', {
  sessionId,
  workspaceId: activeWorkspace?.id,
  cwd,
  isWorkspaceContext: !!activeWorkspace,
});
```

### Log Levels

- **debug**: Normal operations (creation, linking, switching)
- **info**: Significant events (migration, initialization)
- **warn**: Recoverable issues (missing workspace, fallback to default)
- **error**: Sync mismatches, failed operations

### Verification Commands

After implementation, users can verify behavior:

```javascript
// In browser console
enableDebug()

// Then perform actions and watch logs:
// - Create new workspace
// - Switch between workspaces
// - Create new chat
// - Switch between sessions
// - Delete workspace
```

## Implementation Summary

### Files to Modify

1. **WorkspaceTabBar.tsx** - Move plus button inside scrollable container
2. **DirectoryBrowser.tsx** - Enable select for current path, dynamic button label
3. **workspaces.ts** - Add `sessionIds: string[]` to Workspace, add `addSessionToWorkspace` action
4. **index.ts (ChatStore)** - Add `workspaceId?: string` to Session, add `unlinkSessionFromWorkspace` action
5. **useClaudeChat.ts** - Integrate workspace context, pass `cwd` from active workspace
6. **Sidebar.tsx** - Filter sessions by active workspace, show "Unassigned" group

### New Store Actions

**useWorkspaceStore**:
- `addSessionToWorkspace(workspaceId: string, sessionId: string): void`
- `removeSessionFromWorkspace(workspaceId: string, sessionId: string): void`

**useChatStore**:
- `unlinkSessionFromWorkspace(sessionId: string): void`
- `linkSessionToWorkspace(sessionId: string, workspaceId: string): void`

### Testing Checklist

- [ ] Plus button appears next to last tab when tabs fit on screen
- [ ] Plus button sticky at scroll end when tabs overflow
- [ ] Directory browser "Select" enabled when navigating into folder
- [ ] Directory browser creates workspace from current path when no subfolder selected
- [ ] New chat created in workspace A has `workspaceId` set to A
- [ ] New chat uses workspace's `rootPath` as `cwd`
- [ ] Switching to workspace B shows only workspace B's sessions
- [ ] Deleting workspace unlinks sessions, moves to "Unassigned"
- [ ] Existing sessions migrated to default workspace on first load
- [ ] Debug logs show workspace-session operations
- [ ] Session switching auto-switches workspace tab

## Open Questions

None - all design decisions approved.

## Future Enhancements

- Workspace-specific file trees (show only files from active workspace's rootPath)
- Drag-and-drop sessions between workspaces
- Workspace colors/icons for better visual distinction
- Export/import workspace configurations
- Multi-workspace search (search across all workspaces)
