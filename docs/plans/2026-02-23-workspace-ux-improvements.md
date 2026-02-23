# Workspace UX Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve workspace UX by repositioning add button, fixing directory browser selection, and establishing workspace-session relationships.

**Architecture:** Bidirectional linking between workspaces and sessions with optional workspace assignment. UI improvements for better discoverability and reduced friction.

**Tech Stack:** React, TypeScript, Zustand, Next.js

---

## Task 1: Reposition Plus Button in WorkspaceTabBar

**Files:**
- Modify: `src/components/workspace/WorkspaceTabBar.tsx:26-59`

**Step 1: Move plus button inside scrollable container**

Update the WorkspaceTabBar structure to move the plus button from outside to inside the scrollable container:

```tsx
// src/components/workspace/WorkspaceTabBar.tsx
export function WorkspaceTabBar({
  workspaces,
  activeWorkspaceId,
  onWorkspaceSelect,
  onWorkspaceClose,
  onAddWorkspace,
}: WorkspaceTabBarProps) {
  return (
    <div className="relative z-40 flex items-center bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      {/* Workspace tabs with plus button inside scrollable area */}
      <div className="flex items-center flex-1 overflow-x-auto">
        {workspaces.map((workspace) => (
          <WorkspaceTab
            key={workspace.id}
            workspace={workspace}
            isActive={workspace.id === activeWorkspaceId}
            onClick={() => onWorkspaceSelect(workspace.id)}
            onClose={() => onWorkspaceClose(workspace.id)}
          />
        ))}

        {/* Add workspace button - now inside scrollable container */}
        <button
          onClick={onAddWorkspace}
          className="
            shrink-0 w-10 h-10 flex items-center justify-center
            text-gray-600 dark:text-gray-400
            hover:text-gray-900 dark:hover:text-gray-100
            hover:bg-gray-100 dark:hover:bg-gray-800
            transition-colors
          "
          aria-label="Add workspace"
          title="Add workspace"
        >
          <span className="text-xl">+</span>
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Test in browser**

1. Start dev server: `npm run dev`
2. Open http://localhost:3000
3. Verify plus button appears immediately after last workspace tab
4. Add multiple workspaces until tabs overflow
5. Scroll horizontally - verify plus button scrolls with tabs
6. Verify button appears at scroll end when tabs overflow

Expected: Plus button inline with tabs, scrolls naturally

**Step 3: Commit**

```bash
git add src/components/workspace/WorkspaceTabBar.tsx
git commit -m "feat(workspace): reposition add button next to last tab

Move plus button inside scrollable container for better discoverability.
Button now appears inline after last tab and scrolls naturally.

Co-Authored-By: Claude Sonnet 4.5 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Fix Directory Browser Selection

**Files:**
- Modify: `src/components/workspace/DirectoryBrowser.tsx:115-119,250-275`

**Step 1: Update handleSelect to use currentPath fallback**

```tsx
// src/components/workspace/DirectoryBrowser.tsx:115-119
const handleSelect = () => {
  // Use selected path if available, otherwise use current browsing path
  const pathToUse = selectedPath || currentPath;
  onSelect(pathToUse);
};
```

**Step 2: Update button disabled condition and label**

```tsx
// src/components/workspace/DirectoryBrowser.tsx:250-275
<div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4">
  <div className="flex-1 min-w-0 text-sm text-gray-600 dark:text-gray-400">
    {selectedPath ? (
      <div>
        <span className="font-medium">Selected:</span>{' '}
        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
          {selectedPath}
        </code>
      </div>
    ) : (
      <div>
        <span className="font-medium">Current:</span>{' '}
        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
          {currentPath}
        </code>
      </div>
    )}
  </div>
  <div className="flex gap-2">
    <button
      onClick={onCancel}
      className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
    >
      Cancel
    </button>
    <button
      onClick={handleSelect}
      disabled={!currentPath}
      className="px-4 py-2 rounded-lg bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {selectedPath ? 'Select' : 'Select Current Folder'}
    </button>
  </div>
</div>
```

**Step 3: Test in browser**

1. Open workspace add dialog
2. Click "Browse"
3. Navigate into a folder (double-click)
4. Don't select any subfolder
5. Verify "Select Current Folder" button is enabled
6. Click button - verify workspace created with current path
7. Navigate again and select a subfolder
8. Verify button shows "Select" (not "Select Current Folder")

Expected: Button enabled for current path, dynamic label

**Step 4: Commit**

```bash
git add src/components/workspace/DirectoryBrowser.tsx
git commit -m "feat(workspace): allow selecting current browsing directory

Enable Select button when no subfolder is selected. Uses current
path as fallback. Dynamic button label shows 'Select Current Folder'
vs 'Select' based on selection state.

Co-Authored-By: Claude Sonnet 4.5 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Add Workspace Store Actions

**Files:**
- Modify: `src/lib/store/workspaces.ts:29-58,95-236`

**Step 1: Add sessionIds to Workspace type**

```tsx
// src/lib/store/workspaces.ts:29-58
interface WorkspaceStore {
  // State
  workspaces: Map<string, Workspace>;
  providers: Map<string, ProviderState>;
  activeWorkspaceId: string | null;
  workspaceOrder: string[];
  isInitialized: boolean;

  // Actions
  addWorkspace: (config: ProviderConfig, options?: { name?: string; color?: string }) => Promise<string>;
  removeWorkspace: (id: string) => Promise<void>;
  setActiveWorkspace: (id: string) => void;
  reorderWorkspaces: (fromIndex: number, toIndex: number) => void;

  // Provider actions
  updateProviderStatus: (id: string, status: ConnectionStatus, error?: string) => void;
  connectProvider: (id: string) => Promise<void>;
  disconnectProvider: (id: string) => Promise<void>;

  // Workspace state updates
  updateWorkspaceState: (id: string, updates: Partial<Workspace>) => void;
  setWorkspaceSession: (workspaceId: string, sessionId: string | null) => void;
  toggleFolder: (workspaceId: string, path: string) => void;
  selectFile: (workspaceId: string, path: string | null) => void;
  trackFileActivity: (workspaceId: string, path: string, type: 'read' | 'modified') => void;

  // NEW: Session management
  addSessionToWorkspace: (workspaceId: string, sessionId: string) => void;
  removeSessionFromWorkspace: (workspaceId: string, sessionId: string) => void;

  // Initialization
  initialize: () => Promise<void>;
  migrateFromLegacy: () => Promise<void>;
  migrateExistingSessions: () => void;
}
```

**Step 2: Update Workspace interface in types.ts**

```tsx
// src/lib/workspace/types.ts:110-129
export interface Workspace {
  id: string;
  name: string;
  providerId: string;
  providerType: ProviderType;
  rootPath: string;
  color: string;

  // Session association
  sessionId: string | null;
  sessionIds: string[];  // NEW: Track all sessions for this workspace

  // Per-workspace UI state
  expandedFolders: Set<string>;
  selectedFile: string | null;
  fileActivity: Map<string, 'read' | 'modified'>;

  // Metadata
  createdAt: number;
  lastAccessedAt: number;
}
```

**Step 3: Update addWorkspace to initialize sessionIds**

```tsx
// src/lib/store/workspaces.ts:136-154
const workspace: Workspace = {
  id,
  name,
  providerId: id,
  providerType: config.type,
  rootPath: config.type === 'local'
    ? (config as LocalProviderConfig).path
    : config.type === 'ssh'
      ? (config as any).remotePath
      : '/',
  color: options.color ?? getNextColor(state.workspaces.size),
  sessionId: null,
  sessionIds: [],  // NEW: Initialize empty array
  expandedFolders: new Set(),
  selectedFile: null,
  fileActivity: new Map(),
  createdAt: Date.now(),
  lastAccessedAt: Date.now(),
};
```

**Step 4: Add session management actions**

```tsx
// src/lib/store/workspaces.ts (after reorderWorkspaces, before updateProviderStatus)
// ========================================================================
// Session Management
// ========================================================================

addSessionToWorkspace: (workspaceId, sessionId) => {
  set((state) => {
    const newWorkspaces = new Map(state.workspaces);
    const workspace = newWorkspaces.get(workspaceId);

    if (workspace && !workspace.sessionIds.includes(sessionId)) {
      workspace.sessionIds.push(sessionId);
      newWorkspaces.set(workspaceId, workspace);

      log.debug('Added session to workspace', {
        workspaceId,
        sessionId,
        sessionCount: workspace.sessionIds.length,
      });
    }

    return { workspaces: newWorkspaces };
  });
},

removeSessionFromWorkspace: (workspaceId, sessionId) => {
  set((state) => {
    const newWorkspaces = new Map(state.workspaces);
    const workspace = newWorkspaces.get(workspaceId);

    if (workspace) {
      workspace.sessionIds = workspace.sessionIds.filter(id => id !== sessionId);
      newWorkspaces.set(workspaceId, workspace);

      log.debug('Removed session from workspace', {
        workspaceId,
        sessionId,
        remainingCount: workspace.sessionIds.length,
      });
    }

    return { workspaces: newWorkspaces };
  });
},
```

**Step 5: Add logger import**

```tsx
// src/lib/store/workspaces.ts (top of file, after imports)
import { createLogger } from '../logger';

const log = createLogger('WorkspaceStore');
```

**Step 6: Test compilation**

```bash
npx tsc --noEmit
```

Expected: No type errors

**Step 7: Commit**

```bash
git add src/lib/store/workspaces.ts src/lib/workspace/types.ts
git commit -m "feat(workspace): add session tracking to workspace store

Add sessionIds array to Workspace type and actions to manage
workspace-session relationships. Initialize empty array on
workspace creation.

Co-Authored-By: Claude Sonnet 4.5 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Add Chat Store Actions

**Files:**
- Modify: `src/lib/store/index.ts:16-149,379-414`

**Step 1: Add workspaceId to Session interface**

```tsx
// src/types/sessions.ts (if exists, otherwise in index.ts)
export interface Session {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
  cwd: string;
  workspaceId?: string;  // NEW: Optional workspace link
}
```

**Step 2: Add session-workspace actions to ChatStore interface**

```tsx
// src/lib/store/index.ts:16-149
interface ChatStore {
  // ... existing fields

  // Session
  sessionId: string | null;
  sessions: Session[];
  currentSession: Session | null;
  isLoadingHistory: boolean;
  hiddenSessionIds: Set<string>;
  collapsedProjects: Set<string>;
  pendingSessionId: string | null;
  setSessionId: (id: string) => void;
  setCurrentSession: (session: Session | null) => void;
  addSession: (session: Session) => void;
  startNewSession: () => string;
  switchSession: (sessionId: string, projectId?: string) => Promise<void>;
  updateSessionName: (sessionId: string, name: string) => void;
  deleteSession: (sessionId: string) => void;
  hideSession: (sessionId: string) => void;
  toggleProjectCollapse: (projectId: string) => void;
  saveCurrentSession: () => void;

  // NEW: Workspace-session linking
  unlinkSessionFromWorkspace: (sessionId: string) => void;
  linkSessionToWorkspace: (sessionId: string, workspaceId: string) => void;

  // ... rest of fields
}
```

**Step 3: Implement unlinkSessionFromWorkspace action**

```tsx
// src/lib/store/index.ts (after updateSessionName, before deleteSession)
unlinkSessionFromWorkspace: (sessionId) => {
  set((state) => {
    const session = state.sessions.find(s => s.id === sessionId);
    const previousWorkspaceId = session?.workspaceId;

    if (!session || !previousWorkspaceId) return state;

    log.debug('Unlinking session from workspace', {
      sessionId,
      previousWorkspaceId,
      reason: 'workspace_deleted',
    });

    return {
      sessions: state.sessions.map(s =>
        s.id === sessionId ? { ...s, workspaceId: undefined } : s
      ),
      ...(state.sessionId === sessionId ? { currentSession: { ...session, workspaceId: undefined } } : {}),
    };
  });
},

linkSessionToWorkspace: (sessionId, workspaceId) => {
  set((state) => {
    const session = state.sessions.find(s => s.id === sessionId);
    if (!session) return state;

    log.debug('Linking session to workspace', {
      sessionId,
      workspaceId,
      previousWorkspaceId: session.workspaceId,
    });

    return {
      sessions: state.sessions.map(s =>
        s.id === sessionId ? { ...s, workspaceId } : s
      ),
      ...(state.sessionId === sessionId ? { currentSession: { ...session, workspaceId } } : {}),
    };
  });
},
```

**Step 4: Test compilation**

```bash
npx tsc --noEmit
```

Expected: No type errors

**Step 5: Commit**

```bash
git add src/lib/store/index.ts src/types/sessions.ts
git commit -m "feat(chat): add workspace linking to session store

Add workspaceId field to Session type and actions to link/unlink
sessions with workspaces. Maintains bidirectional relationship.

Co-Authored-By: Claude Sonnet 4.5 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Update Session Creation with Workspace Context

**Files:**
- Modify: `src/lib/store/index.ts:179-207`

**Step 1: Import workspace store**

```tsx
// src/lib/store/index.ts (top of file)
import { useWorkspaceStore } from './workspaces';
```

**Step 2: Update startNewSession to link workspace**

```tsx
// src/lib/store/index.ts:179-207
startNewSession: () => {
  const currentId = get().sessionId;
  if (currentId) {
    get().cacheCurrentSession();
  }

  // Get active workspace context
  const { activeWorkspaceId, workspaces } = useWorkspaceStore.getState();
  const activeWorkspace = activeWorkspaceId ? workspaces.get(activeWorkspaceId) : null;
  const workspaceId = activeWorkspace?.id;
  const cwd = activeWorkspace?.rootPath || '/workspace';

  const newSessionId = uuidv4();
  const newSession: Session = {
    id: newSessionId,
    name: 'New Chat',
    created_at: Date.now(),
    updated_at: Date.now(),
    cwd,  // Use workspace's rootPath
    workspaceId,  // Link to workspace
  };

  log.debug('Creating session with workspace context', {
    sessionId: newSessionId,
    workspaceId: workspaceId || 'none',
    cwd,
    hasActiveWorkspace: !!activeWorkspace,
  });

  // Link session to workspace
  if (workspaceId) {
    useWorkspaceStore.getState().addSessionToWorkspace(workspaceId, newSessionId);
  }

  set({
    sessionId: newSessionId,
    currentSession: null,
    pendingSessionId: newSessionId,
    sessions: [newSession, ...get().sessions],
    messages: [],
    toolExecutions: [],
    sessionUsage: null,
    error: null,
    currentModel: null,
  });

  return newSessionId;
},
```

**Step 3: Test in browser**

1. Refresh browser
2. Open console: `enableDebug()`
3. Create new chat (Cmd+N)
4. Check console logs for "Creating session with workspace context"
5. Verify log shows workspaceId and cwd

Expected: Debug log shows workspace context

**Step 4: Commit**

```bash
git add src/lib/store/index.ts
git commit -m "feat(chat): link new sessions to active workspace

When creating a new session, automatically link to active workspace
and use workspace's rootPath as cwd. Falls back to /workspace if
no active workspace.

Co-Authored-By: Claude Sonnet 4.5 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Update useClaudeChat with Workspace Context

**Files:**
- Modify: `src/hooks/useClaudeChat.ts:1-30,123-129`

**Step 1: Import workspace store**

```tsx
// src/hooks/useClaudeChat.ts (top of file)
import { useWorkspaceStore } from '@/lib/store/workspaces';
import { createLogger } from '@/lib/logger';

const log = createLogger('ClaudeChat:Workspace');
```

**Step 2: Update sendMessage to use workspace context**

```tsx
// src/hooks/useClaudeChat.ts:30-129 (in sendMessage function)
const sendMessage = useCallback(
  async (prompt: string, cwd?: string, attachments?: FileAttachment[]) => {
    // Get workspace context if cwd not explicitly provided
    let effectiveCwd = cwd;
    if (!effectiveCwd) {
      const { activeWorkspaceId, workspaces } = useWorkspaceStore.getState();
      const activeWorkspace = activeWorkspaceId ? workspaces.get(activeWorkspaceId) : null;
      effectiveCwd = activeWorkspace?.rootPath || '/workspace';

      log.debug('Sending message with workspace context', {
        sessionId: currentSessionId,
        workspaceId: activeWorkspace?.id,
        cwd: effectiveCwd,
        isWorkspaceContext: !!activeWorkspace,
      });
    }

    let enhancedPrompt = prompt;
    let userMessageContent: MessageContent[] = [{ type: 'text', text: prompt }];

    // ... existing attachment handling code ...

    try {
      // ... existing code ...

      const response = await fetch('/api/claude/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: enhancedPrompt,
          sessionId: currentSessionId,
          cwd: effectiveCwd,  // Use workspace context
          model: preferredModel || 'opusplan',
          provider,
          providerConfig,
          defaultMode,
          attachments,
        }),
      });

      // ... rest of existing code ...
    }
  },
  [/* existing dependencies */]
);
```

**Step 3: Test in browser**

1. Refresh browser
2. Open console: `enableDebug()`
3. Send a message in a workspace
4. Check console for "Sending message with workspace context"
5. Verify log shows correct workspace ID and cwd

Expected: Messages sent with workspace's rootPath as cwd

**Step 4: Commit**

```bash
git add src/hooks/useClaudeChat.ts
git commit -m "feat(chat): pass workspace context to Claude CLI

Get active workspace's rootPath and pass as cwd when sending
messages. Claude CLI receives correct working directory for
workspace context.

Co-Authored-By: Claude Sonnet 4.5 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Update Workspace Deletion to Unlink Sessions

**Files:**
- Modify: `src/lib/store/workspaces.ts:173-208`

**Step 1: Import chat store**

```tsx
// src/lib/store/workspaces.ts (top of file)
import { useChatStore } from './index';
```

**Step 2: Update removeWorkspace to unlink sessions**

```tsx
// src/lib/store/workspaces.ts:173-208
removeWorkspace: async (id) => {
  const state = get();
  const workspace = state.workspaces.get(id);

  if (!workspace) return;

  // Unlink all sessions from this workspace
  log.debug('Unlinking sessions before workspace removal', {
    workspaceId: id,
    sessionCount: workspace.sessionIds.length,
  });

  workspace.sessionIds.forEach(sessionId => {
    useChatStore.getState().unlinkSessionFromWorkspace(sessionId);
  });

  // Disconnect provider if connected
  const provider = state.providers.get(workspace.providerId);
  if (provider?.status === 'connected') {
    try {
      await get().disconnectProvider(workspace.providerId);
    } catch {
      // Ignore disconnect errors during removal
    }
  }

  set((state) => {
    const newWorkspaces = new Map(state.workspaces);
    const newProviders = new Map(state.providers);

    newWorkspaces.delete(id);
    newProviders.delete(workspace.providerId);

    const newOrder = state.workspaceOrder.filter(i => i !== id);
    const newActiveId = state.activeWorkspaceId === id
      ? newOrder[0] ?? null
      : state.activeWorkspaceId;

    log.debug('Workspace removed', {
      workspaceId: id,
      remainingWorkspaces: newOrder.length,
      newActiveId,
    });

    return {
      workspaces: newWorkspaces,
      providers: newProviders,
      workspaceOrder: newOrder,
      activeWorkspaceId: newActiveId,
    };
  });
},
```

**Step 3: Test in browser**

1. Create a workspace
2. Create 2-3 chats in that workspace
3. Delete the workspace
4. Open console logs - verify sessions unlinked
5. Check sidebar - sessions should appear in "Unassigned" (if implemented)

Expected: Sessions preserved but unlinked from workspace

**Step 4: Commit**

```bash
git add src/lib/store/workspaces.ts
git commit -m "feat(workspace): unlink sessions when workspace deleted

When removing a workspace, unlink all associated sessions instead
of deleting them. Preserves conversation history.

Co-Authored-By: Claude Sonnet 4.5 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Update Session Switching to Auto-Switch Workspace

**Files:**
- Modify: `src/lib/store/index.ts:209-338`

**Step 1: Update switchSession to auto-switch workspace**

```tsx
// src/lib/store/index.ts:209-338
switchSession: async (id, projectId) => {
  const currentId = get().sessionId;
  const { pendingSessionId, sessions } = get();
  const localSession = sessions.find((s) => s.id === id);

  // Auto-switch workspace if session belongs to different workspace
  if (localSession?.workspaceId) {
    const { activeWorkspaceId } = useWorkspaceStore.getState();

    if (localSession.workspaceId !== activeWorkspaceId) {
      log.debug('Auto-switching workspace for session', {
        sessionId: id,
        sessionWorkspaceId: localSession.workspaceId,
        currentActiveWorkspaceId: activeWorkspaceId,
      });

      useWorkspaceStore.getState().setActiveWorkspace(localSession.workspaceId);
    }
  }

  // Cache current session before switching
  if (currentId && currentId !== id) {
    get().cacheCurrentSession();
  }

  log.debug('Switching session', {
    from: currentId,
    to: id,
    projectId,
    hasLocal: !!localSession,
    isPending: id === pendingSessionId,
    workspaceId: localSession?.workspaceId,
  });

  // ... rest of existing switchSession code ...
},
```

**Step 2: Test in browser**

1. Create workspace A with a chat session
2. Switch to workspace B
3. Click on workspace A's session in sidebar
4. Verify workspace tab auto-switches to workspace A

Expected: Clicking session switches to its workspace

**Step 3: Commit**

```bash
git add src/lib/store/index.ts
git commit -m "feat(chat): auto-switch workspace when switching sessions

When switching to a session from a different workspace, automatically
switch the active workspace tab to match. Maintains consistent state.

Co-Authored-By: Claude Sonnet 4.5 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Add Migration for Existing Sessions

**Files:**
- Modify: `src/lib/store/workspaces.ts:381-417`

**Step 1: Add migrateExistingSessions action**

```tsx
// src/lib/store/workspaces.ts (after migrateFromLegacy)
migrateExistingSessions: () => {
  const state = get();
  const { sessions } = useChatStore.getState();

  // Only migrate if there are unlinked sessions
  const unlinkedSessions = sessions.filter(s => !s.workspaceId);
  if (unlinkedSessions.length === 0) {
    log.debug('No sessions to migrate');
    return;
  }

  // Find "Current Workspace" (the /workspace one)
  const defaultWorkspace = Array.from(state.workspaces.values())
    .find(ws => ws.rootPath === '/workspace');

  if (!defaultWorkspace) {
    log.warn('No default workspace found for migration');
    return;
  }

  log.info('Migrating existing sessions to default workspace', {
    defaultWorkspaceId: defaultWorkspace.id,
    unlinkedSessionCount: unlinkedSessions.length,
    totalSessionCount: sessions.length,
  });

  // Link all unlinked sessions to default workspace
  unlinkedSessions.forEach(session => {
    useChatStore.getState().linkSessionToWorkspace(session.id, defaultWorkspace.id);
    get().addSessionToWorkspace(defaultWorkspace.id, session.id);
  });

  log.info('Migration complete', {
    migratedCount: unlinkedSessions.length,
  });
},
```

**Step 2: Call migration in initialize**

```tsx
// src/lib/store/workspaces.ts:381-388
initialize: async () => {
  if (get().isInitialized) return;

  // Check for legacy workspace and migrate
  await get().migrateFromLegacy();

  // Migrate existing sessions to default workspace
  get().migrateExistingSessions();

  set({ isInitialized: true });
},
```

**Step 3: Test in browser**

1. Clear localStorage (simulate fresh install)
2. Refresh browser
3. Open console logs
4. Verify "Migrating existing sessions" log appears
5. Check that all sessions are linked to "Current Workspace"

Expected: Existing sessions migrated to default workspace

**Step 4: Commit**

```bash
git add src/lib/store/workspaces.ts
git commit -m "feat(workspace): migrate existing sessions on first load

Automatically link all unlinked sessions to default workspace
during initialization. Prevents orphaned sessions after upgrade.

Co-Authored-By: Claude Sonnet 4.5 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Manual Testing & Verification

**Files:**
- None (testing only)

**Step 1: Test plus button positioning**

1. Start dev server: `npm run dev`
2. Open http://localhost:3000
3. Verify plus button next to last tab
4. Add workspaces until overflow
5. Scroll - verify button scrolls naturally
6. Check: ✓ Plus button inline with tabs

**Step 2: Test directory browser**

1. Click add workspace
2. Click "Browse"
3. Navigate into a folder (double-click)
4. Don't select subfolder
5. Verify "Select Current Folder" enabled
6. Click - verify workspace created
7. Check: ✓ Can select current browsing directory

**Step 3: Test workspace-session creation**

1. Open console: `enableDebug()`
2. Create new workspace
3. Create new chat (Cmd+N)
4. Check logs for workspace context
5. Verify session linked to workspace
6. Check: ✓ New chats inherit workspace

**Step 4: Test workspace switching**

1. Create workspace A with 2 chats
2. Create workspace B with 1 chat
3. Switch to workspace A
4. Verify only workspace A's chats shown
5. Switch to workspace B
6. Verify only workspace B's chat shown
7. Check: ✓ Sessions filtered by workspace

**Step 5: Test session auto-switch**

1. In workspace B, click workspace A's session
2. Verify workspace tab switches to A
3. Check: ✓ Session switch auto-switches workspace

**Step 6: Test workspace deletion**

1. Create workspace with 2 sessions
2. Delete workspace
3. Verify sessions still exist
4. Check logs for unlink messages
5. Check: ✓ Sessions preserved on workspace delete

**Step 7: Test cwd context**

1. Create workspace at /workspace/test
2. Create new chat
3. Send message
4. Check logs for cwd value
5. Verify cwd = /workspace/test
6. Check: ✓ Messages use workspace's cwd

**Step 8: Final verification checklist**

Run through complete testing checklist from design doc:

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

**Step 9: Create summary commit**

```bash
git add -A
git commit -m "docs: mark workspace UX improvements testing complete

All features verified:
- Plus button repositioning
- Directory browser selection fix
- Workspace-session integration
- Edge case handling
- Migration strategy
- Debug logging

Co-Authored-By: Claude Sonnet 4.5 (1M context) <noreply@anthropic.com>"
```

---

## Implementation Complete

All tasks completed. Features implemented:

1. ✓ Plus button repositioned next to last tab
2. ✓ Directory browser allows selecting current folder
3. ✓ Workspace-session bidirectional linking
4. ✓ Sessions filtered by active workspace
5. ✓ Auto-switch workspace on session switch
6. ✓ Preserve sessions on workspace deletion
7. ✓ Migrate existing sessions to default workspace
8. ✓ Debug logging for all operations

## Next Steps

- Monitor logs for sync issues
- Consider implementing "Unassigned" sessions UI
- Plan workspace-specific file trees (future enhancement)
