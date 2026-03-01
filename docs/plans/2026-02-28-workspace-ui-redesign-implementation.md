# Workspace UI Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with ultrathink workflow and adversarial review at each phase.

**Goal:** Transform the workspace sidebar UI with "🌴 groot" pinned workspace, three-tier session organization (🏠 Home / 🛠️ System / ❓ Unassigned), color-coded sections, enhanced metadata with tooltips, and auto-switching behavior.

**Architecture:** Component restructuring approach with specialized section components, enhanced store management for collapsed state and metadata preferences, new tooltip system, and seamless integration with existing workspace isolation logic.

**Tech Stack:** React 19, TypeScript, Zustand (state), Tailwind CSS v4, Vitest (testing), Next.js 16 App Router

**Execution Strategy:**
- 7 phases, each handled by dedicated subagent
- TDD approach: Write test → Run (fail) → Implement → Run (pass) → Commit
- Ultrathink workflow with adversarial review after each phase
- Max iterations: 9 per phase
- Completion promises: "doh" (planning), "michaelangelo" (execution)

---

## Phase 1: Core Infrastructure (Subagent 1)

**Scope:** Store updates, type definitions, utility functions
**Subagent Assignment:** Phase 1 Infrastructure Agent
**Estimated Time:** 45 minutes

### Task 1.1: Add isPinned field to Workspace interface

**Files:**
- Modify: `src/lib/workspace/types.ts:10-45`
- Test: `__tests__/lib/workspace/types.test.ts` (create)

**Step 1: Write the failing test**

Create test file:
```typescript
// __tests__/lib/workspace/types.test.ts
import { describe, it, expect } from 'vitest';
import type { Workspace } from '@/lib/workspace/types';

describe('Workspace types', () => {
  it('should allow isPinned field on Workspace interface', () => {
    const workspace: Workspace = {
      id: 'test-id',
      projectId: '-workspace',
      name: '🌴 groot',
      providerId: 'provider-1',
      providerType: 'local',
      rootPath: '/workspace',
      color: '#3B82F6',
      sessionId: null,
      activeSessionId: null,
      sessionIds: [],
      expandedFolders: new Set(),
      selectedFile: null,
      fileActivity: new Map(),
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      isPinned: true, // ✅ Should compile
    };

    expect(workspace.isPinned).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test __tests__/lib/workspace/types.test.ts`
Expected: TYPE ERROR - "Property 'isPinned' does not exist on type 'Workspace'"

**Step 3: Add isPinned to Workspace interface**

```typescript
// src/lib/workspace/types.ts (modify interface)
export interface Workspace {
  id: string;
  projectId: string;
  name: string;
  providerId: string;
  providerType: ProviderType;
  rootPath: string;
  color: string;
  sessionId: string | null;
  activeSessionId: string | null;
  sessionIds: string[];
  expandedFolders: Set<string>;
  selectedFile: string | null;
  fileActivity: Map<string, 'read' | 'modified'>;
  createdAt: number;
  lastAccessedAt: number;
  isArchived?: boolean;
  isPinned?: boolean; // ✅ NEW FIELD
}
```

**Step 4: Run test to verify it passes**

Run: `npm test __tests__/lib/workspace/types.test.ts`
Expected: PASS ✅

**Step 5: Commit**

```bash
git add src/lib/workspace/types.ts __tests__/lib/workspace/types.test.ts
git commit -m "feat(workspace): add isPinned field to Workspace interface

- Add isPinned optional boolean to Workspace type
- Add test coverage for isPinned field
- Supports pinned workspaces that cannot be deleted/archived

Co-Authored-By: Claude Sonnet 4.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 1.2: Add collapsedSections to ChatStore

**Files:**
- Modify: `src/lib/store/index.ts:50-100`
- Test: `__tests__/lib/store/collapsed-sections.test.ts` (create)

**Step 1: Write the failing test**

```typescript
// __tests__/lib/store/collapsed-sections.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore } from '@/lib/store';

describe('ChatStore collapsedSections', () => {
  beforeEach(() => {
    // Reset store state
    useChatStore.setState({ collapsedSections: new Set() });
  });

  it('should initialize collapsedSections as empty Set', () => {
    const { collapsedSections } = useChatStore.getState();
    expect(collapsedSections).toBeInstanceOf(Set);
    expect(collapsedSections.size).toBe(0);
  });

  it('should toggle section collapse', () => {
    const { toggleSectionCollapse, collapsedSections: initial } = useChatStore.getState();
    expect(initial.has('system')).toBe(false);

    // Collapse section
    toggleSectionCollapse('system');
    expect(useChatStore.getState().collapsedSections.has('system')).toBe(true);

    // Expand section (toggle again)
    toggleSectionCollapse('system');
    expect(useChatStore.getState().collapsedSections.has('system')).toBe(false);
  });

  it('should handle multiple sections independently', () => {
    const { toggleSectionCollapse } = useChatStore.getState();

    toggleSectionCollapse('system');
    toggleSectionCollapse('unassigned');
    toggleSectionCollapse('home-workspace-1');

    const { collapsedSections } = useChatStore.getState();
    expect(collapsedSections.size).toBe(3);
    expect(collapsedSections.has('system')).toBe(true);
    expect(collapsedSections.has('unassigned')).toBe(true);
    expect(collapsedSections.has('home-workspace-1')).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test __tests__/lib/store/collapsed-sections.test.ts`
Expected: FAIL - "Property 'collapsedSections' does not exist" and "toggleSectionCollapse is not a function"

**Step 3: Add collapsedSections to ChatStore**

```typescript
// src/lib/store/index.ts (add to interface and state)

interface ChatStore {
  // ... existing fields ...
  collapsedSections: Set<string>;
  toggleSectionCollapse: (sectionId: string) => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      // ... existing initial state ...
      collapsedSections: new Set<string>(),

      toggleSectionCollapse: (sectionId: string) => {
        set((state) => {
          const newCollapsed = new Set(state.collapsedSections);
          if (newCollapsed.has(sectionId)) {
            newCollapsed.delete(sectionId);
          } else {
            newCollapsed.add(sectionId);
          }
          return { collapsedSections: newCollapsed };
        });
      },

      // ... rest of store ...
    }),
    {
      name: 'claude-chat-v1',
      partialize: (state) => ({
        // ... existing persisted fields ...
        collapsedSectionsArray: Array.from(state.collapsedSections),
      }),
      onRehydrateStorage: () => (state) => {
        if (state && (state as any).collapsedSectionsArray) {
          state.collapsedSections = new Set((state as any).collapsedSectionsArray);
        }
      },
    }
  )
);
```

**Step 4: Run test to verify it passes**

Run: `npm test __tests__/lib/store/collapsed-sections.test.ts`
Expected: PASS ✅

**Step 5: Commit**

```bash
git add src/lib/store/index.ts __tests__/lib/store/collapsed-sections.test.ts
git commit -m "feat(store): add collapsedSections state management

- Add collapsedSections Set to track collapsed session sections
- Add toggleSectionCollapse action
- Persist collapsed state via Zustand middleware
- Section IDs: 'home-{workspaceId}', 'system', 'unassigned'

Co-Authored-By: Claude Sonnet 4.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 1.3: Add metadataColorScheme setting

**Files:**
- Modify: `src/lib/store/index.ts:100-150`
- Test: `__tests__/lib/store/metadata-color-scheme.test.ts` (create)

**Step 1: Write the failing test**

```typescript
// __tests__/lib/store/metadata-color-scheme.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore } from '@/lib/store';

describe('ChatStore metadataColorScheme', () => {
  beforeEach(() => {
    useChatStore.setState({ metadataColorScheme: 'semantic' });
  });

  it('should default to semantic color scheme', () => {
    const { metadataColorScheme } = useChatStore.getState();
    expect(metadataColorScheme).toBe('semantic');
  });

  it('should toggle to gradient scheme', () => {
    const { setMetadataColorScheme } = useChatStore.getState();

    setMetadataColorScheme('gradient');
    expect(useChatStore.getState().metadataColorScheme).toBe('gradient');
  });

  it('should toggle back to semantic scheme', () => {
    const { setMetadataColorScheme } = useChatStore.getState();

    setMetadataColorScheme('gradient');
    setMetadataColorScheme('semantic');
    expect(useChatStore.getState().metadataColorScheme).toBe('semantic');
  });

  it('should persist color scheme preference', () => {
    // This tests that partialize includes metadataColorScheme
    const { metadataColorScheme } = useChatStore.getState();
    expect(metadataColorScheme).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test __tests__/lib/store/metadata-color-scheme.test.ts`
Expected: FAIL - "Property 'metadataColorScheme' does not exist"

**Step 3: Add metadataColorScheme to ChatStore**

```typescript
// src/lib/store/index.ts (add to interface and state)

type MetadataColorScheme = 'semantic' | 'gradient';

interface ChatStore {
  // ... existing fields ...
  metadataColorScheme: MetadataColorScheme;
  setMetadataColorScheme: (scheme: MetadataColorScheme) => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      // ... existing initial state ...
      metadataColorScheme: 'semantic',

      setMetadataColorScheme: (scheme: MetadataColorScheme) => {
        set({ metadataColorScheme: scheme });
      },

      // ... rest of store ...
    }),
    {
      name: 'claude-chat-v1',
      partialize: (state) => ({
        // ... existing persisted fields ...
        metadataColorScheme: state.metadataColorScheme,
      }),
    }
  )
);
```

**Step 4: Run test to verify it passes**

Run: `npm test __tests__/lib/store/metadata-color-scheme.test.ts`
Expected: PASS ✅

**Step 5: Commit**

```bash
git add src/lib/store/index.ts __tests__/lib/store/metadata-color-scheme.test.ts
git commit -m "feat(store): add metadata color scheme preference

- Add metadataColorScheme state ('semantic' | 'gradient')
- Add setMetadataColorScheme action
- Default to 'semantic' scheme
- Persist via Zustand middleware

Co-Authored-By: Claude Sonnet 4.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 1.4: Add formatISOWithRelative utility

**Files:**
- Modify: `src/lib/utils/time.ts:80-120`
- Test: `__tests__/lib/utils/time.test.ts` (modify existing)

**Step 1: Write the failing test**

```typescript
// __tests__/lib/utils/time.test.ts (add to existing file)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatISOWithRelative } from '@/lib/utils/time';

describe('formatISOWithRelative', () => {
  beforeEach(() => {
    // Mock Date.now() to fixed timestamp
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-28T15:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should format timestamp as ISO + relative (just now)', () => {
    const now = Date.now();
    const result = formatISOWithRelative(now);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2} \(just now\)$/);
  });

  it('should format timestamp as ISO + relative (minutes ago)', () => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const result = formatISOWithRelative(fiveMinutesAgo);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2} \(5m ago\)$/);
  });

  it('should format timestamp as ISO + relative (hours ago)', () => {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    const result = formatISOWithRelative(twoHoursAgo);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2} \(2h ago\)$/);
  });

  it('should format timestamp as ISO + relative (days ago)', () => {
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
    const result = formatISOWithRelative(threeDaysAgo);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2} \(3d ago\)$/);
  });

  it('should format timestamp as ISO + relative (weeks ago)', () => {
    const sixWeeksAgo = Date.now() - 6 * 7 * 24 * 60 * 60 * 1000;
    const result = formatISOWithRelative(sixWeeksAgo);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2} \(6w ago\)$/);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test __tests__/lib/utils/time.test.ts`
Expected: FAIL - "formatISOWithRelative is not defined"

**Step 3: Implement formatISOWithRelative**

```typescript
// src/lib/utils/time.ts (add new function)

/**
 * Format timestamp as ISO date + relative time
 * Example: "2026-02-28 14:30 (2h ago)"
 */
export function formatISOWithRelative(timestamp: number): string {
  const date = new Date(timestamp);

  // ISO format: YYYY-MM-DD HH:MM
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  const isoDate = `${year}-${month}-${day} ${hours}:${minutes}`;

  // Relative time
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes_count = Math.floor(seconds / 60);
  const hours_count = Math.floor(minutes_count / 60);
  const days = Math.floor(hours_count / 24);
  const weeks = Math.floor(days / 7);

  let relative: string;
  if (seconds < 60) {
    relative = 'just now';
  } else if (minutes_count < 60) {
    relative = `${minutes_count}m ago`;
  } else if (hours_count < 24) {
    relative = `${hours_count}h ago`;
  } else if (days < 7) {
    relative = `${days}d ago`;
  } else {
    relative = `${weeks}w ago`;
  }

  return `${isoDate} (${relative})`;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test __tests__/lib/utils/time.test.ts`
Expected: PASS ✅

**Step 5: Commit**

```bash
git add src/lib/utils/time.ts __tests__/lib/utils/time.test.ts
git commit -m "feat(utils): add formatISOWithRelative date formatter

- Format timestamps as 'YYYY-MM-DD HH:MM (Xm/h/d/w ago)'
- Supports relative time: just now, minutes, hours, days, weeks
- Comprehensive test coverage for all time ranges

Co-Authored-By: Claude Sonnet 4.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 1.5: Add migration for "🌴 groot" rename

**Files:**
- Modify: `src/lib/store/workspaces.ts:634-674`
- Test: `__tests__/lib/store/workspaces-migration.test.ts` (create)

**Step 1: Write the failing test**

```typescript
// __tests__/lib/store/workspaces-migration.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useWorkspaceStore } from '@/lib/store/workspaces';

describe('Workspace groot migration', () => {
  beforeEach(() => {
    // Reset store
    useWorkspaceStore.setState({
      workspaces: new Map(),
      providers: new Map(),
      activeWorkspaceId: null,
      workspaceOrder: [],
      isInitialized: false,
      hasMigratedSessions: false,
    });
  });

  it('should rename "Current Workspace" to "🌴 groot"', async () => {
    // Create workspace with old name
    const workspaceId = await useWorkspaceStore.getState().addWorkspace(
      { type: 'local', path: '/workspace' },
      { name: 'Current Workspace' }
    );

    // Run migration
    await useWorkspaceStore.getState().migrateGrootWorkspace();

    const workspace = useWorkspaceStore.getState().workspaces.get(workspaceId);
    expect(workspace?.name).toBe('🌴 groot');
    expect(workspace?.isPinned).toBe(true);
  });

  it('should set isPinned to true for /workspace', async () => {
    const workspaceId = await useWorkspaceStore.getState().addWorkspace(
      { type: 'local', path: '/workspace' },
      { name: 'Current Workspace' }
    );

    await useWorkspaceStore.getState().migrateGrootWorkspace();

    const workspace = useWorkspaceStore.getState().workspaces.get(workspaceId);
    expect(workspace?.isPinned).toBe(true);
  });

  it('should be idempotent (safe to run multiple times)', async () => {
    const workspaceId = await useWorkspaceStore.getState().addWorkspace(
      { type: 'local', path: '/workspace' },
      { name: 'Current Workspace' }
    );

    // Run migration twice
    await useWorkspaceStore.getState().migrateGrootWorkspace();
    await useWorkspaceStore.getState().migrateGrootWorkspace();

    const workspaces = useWorkspaceStore.getState().workspaces;
    expect(workspaces.size).toBe(1); // No duplicate workspaces

    const workspace = workspaces.get(workspaceId);
    expect(workspace?.name).toBe('🌴 groot');
  });

  it('should not affect other workspaces', async () => {
    // Create multiple workspaces
    await useWorkspaceStore.getState().addWorkspace(
      { type: 'local', path: '/workspace' },
      { name: 'Current Workspace' }
    );
    await useWorkspaceStore.getState().addWorkspace(
      { type: 'local', path: '/other' },
      { name: 'Other Project' }
    );

    await useWorkspaceStore.getState().migrateGrootWorkspace();

    const workspaces = Array.from(useWorkspaceStore.getState().workspaces.values());
    const otherWorkspace = workspaces.find(w => w.rootPath === '/other');

    expect(otherWorkspace?.name).toBe('Other Project');
    expect(otherWorkspace?.isPinned).toBeUndefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test __tests__/lib/store/workspaces-migration.test.ts`
Expected: FAIL - "migrateGrootWorkspace is not a function"

**Step 3: Add migrateGrootWorkspace method**

```typescript
// src/lib/store/workspaces.ts (add new method)

interface WorkspaceStore {
  // ... existing methods ...
  migrateGrootWorkspace: () => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => ({
      // ... existing state and methods ...

      migrateGrootWorkspace: async () => {
        const state = get();

        // Find /workspace workspace
        const workspaceWorkspace = Array.from(state.workspaces.values())
          .find(ws => ws.rootPath === '/workspace');

        if (!workspaceWorkspace) {
          log.debug('No /workspace found, skipping groot migration');
          return;
        }

        // Check if already migrated
        if (workspaceWorkspace.name === '🌴 groot' && workspaceWorkspace.isPinned) {
          log.debug('Groot already migrated, skipping');
          return;
        }

        log.info('Migrating workspace to 🌴 groot', {
          workspaceId: workspaceWorkspace.id,
          oldName: workspaceWorkspace.name,
        });

        // Update workspace name and pin it
        set((state) => {
          const newWorkspaces = new Map(state.workspaces);
          const ws = newWorkspaces.get(workspaceWorkspace.id);

          if (ws) {
            newWorkspaces.set(workspaceWorkspace.id, {
              ...ws,
              name: '🌴 groot',
              isPinned: true,
            });
          }

          return { workspaces: newWorkspaces };
        });

        log.info('Groot migration complete');
      },

      // ... rest of methods ...
    }),
    // ... persistence config ...
  )
);
```

**Step 4: Call migration in initialize()**

```typescript
// src/lib/store/workspaces.ts (modify initialize method)

initialize: async () => {
  if (get().isInitialized) return;

  // Check for legacy workspace and migrate
  await get().migrateFromLegacy();

  // Migrate to groot
  await get().migrateGrootWorkspace(); // ✅ NEW

  // Migrate existing sessions to default workspace (idempotent)
  get().migrateExistingSessions();

  set({ isInitialized: true });
},
```

**Step 5: Run test to verify it passes**

Run: `npm test __tests__/lib/store/workspaces-migration.test.ts`
Expected: PASS ✅

**Step 6: Commit**

```bash
git add src/lib/store/workspaces.ts __tests__/lib/store/workspaces-migration.test.ts
git commit -m "feat(workspace): add groot migration for Current Workspace

- Add migrateGrootWorkspace method to rename 'Current Workspace' to '🌴 groot'
- Set isPinned=true for /workspace
- Idempotent migration (safe to run multiple times)
- Call migration in initialize() workflow
- Comprehensive test coverage

Co-Authored-By: Claude Sonnet 4.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 1.6: Prevent deletion/archiving of pinned workspaces

**Files:**
- Modify: `src/lib/store/workspaces.ts:260-312` (removeWorkspace)
- Modify: `src/lib/store/workspaces.ts:872-905` (archiveWorkspace)
- Test: `__tests__/lib/store/workspaces-pinned.test.ts` (create)

**Step 1: Write the failing test**

```typescript
// __tests__/lib/store/workspaces-pinned.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useWorkspaceStore } from '@/lib/store/workspaces';
import { showToast } from '@/lib/utils/toast';

vi.mock('@/lib/utils/toast');

describe('Pinned workspace protection', () => {
  let workspaceId: string;

  beforeEach(async () => {
    // Reset store
    useWorkspaceStore.setState({
      workspaces: new Map(),
      providers: new Map(),
      activeWorkspaceId: null,
      workspaceOrder: [],
    });

    // Create pinned workspace
    workspaceId = await useWorkspaceStore.getState().addWorkspace(
      { type: 'local', path: '/workspace' },
      { name: '🌴 groot' }
    );

    // Set as pinned
    useWorkspaceStore.getState().updateWorkspaceState(workspaceId, { isPinned: true });

    vi.clearAllMocks();
  });

  it('should prevent deletion of pinned workspace', async () => {
    await useWorkspaceStore.getState().removeWorkspace(workspaceId);

    // Workspace should still exist
    const workspace = useWorkspaceStore.getState().workspaces.get(workspaceId);
    expect(workspace).toBeDefined();
    expect(workspace?.name).toBe('🌴 groot');

    // Toast should be shown
    expect(showToast).toHaveBeenCalledWith(
      'Cannot delete pinned workspace',
      'error'
    );
  });

  it('should prevent archiving of pinned workspace', () => {
    useWorkspaceStore.getState().archiveWorkspace(workspaceId);

    // Workspace should not be archived
    const workspace = useWorkspaceStore.getState().workspaces.get(workspaceId);
    expect(workspace?.isArchived).toBeFalsy();

    // Toast should be shown
    expect(showToast).toHaveBeenCalledWith(
      'Cannot archive pinned workspace',
      'error'
    );
  });

  it('should allow deletion of non-pinned workspaces', async () => {
    // Create non-pinned workspace
    const otherWorkspaceId = await useWorkspaceStore.getState().addWorkspace(
      { type: 'local', path: '/other' },
      { name: 'Other Project' }
    );

    await useWorkspaceStore.getState().removeWorkspace(otherWorkspaceId);

    // Workspace should be deleted
    const workspace = useWorkspaceStore.getState().workspaces.get(otherWorkspaceId);
    expect(workspace).toBeUndefined();

    // No error toast
    expect(showToast).not.toHaveBeenCalledWith(
      expect.stringContaining('Cannot delete'),
      'error'
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test __tests__/lib/store/workspaces-pinned.test.ts`
Expected: FAIL - Pinned workspace can be deleted/archived

**Step 3: Add protection to removeWorkspace**

```typescript
// src/lib/store/workspaces.ts (modify removeWorkspace)

removeWorkspace: async (id) => {
  const state = get();
  const workspace = state.workspaces.get(id);

  if (!workspace) return;

  // ✅ NEW: Prevent deletion of pinned workspaces
  if (workspace.isPinned) {
    showToast('Cannot delete pinned workspace', 'error');
    log.warn('Attempted to delete pinned workspace', { workspaceId: id, name: workspace.name });
    return;
  }

  // ... existing deletion logic ...
},
```

**Step 4: Add protection to archiveWorkspace**

```typescript
// src/lib/store/workspaces.ts (modify archiveWorkspace)

archiveWorkspace: (id: string) => {
  const state = get();
  const workspace = state.workspaces.get(id);

  if (!workspace) {
    log.warn('Workspace not found for archiving', { id });
    return;
  }

  // ✅ NEW: Prevent archiving of pinned workspaces
  if (workspace.isPinned) {
    showToast('Cannot archive pinned workspace', 'error');
    log.warn('Attempted to archive pinned workspace', { workspaceId: id, name: workspace.name });
    return;
  }

  // ... existing archiving logic ...
},
```

**Step 5: Run test to verify it passes**

Run: `npm test __tests__/lib/store/workspaces-pinned.test.ts`
Expected: PASS ✅

**Step 6: Commit**

```bash
git add src/lib/store/workspaces.ts __tests__/lib/store/workspaces-pinned.test.ts
git commit -m "feat(workspace): prevent deletion/archiving of pinned workspaces

- Add isPinned check in removeWorkspace
- Add isPinned check in archiveWorkspace
- Show error toast when attempting to delete/archive pinned workspace
- Log warnings for debugging
- Comprehensive test coverage

Co-Authored-By: Claude Sonnet 4.5 (1M context) <noreply@anthropic.com>"
```

---

### Phase 1 Complete: Run All Tests & Adversarial Review

**Step 1: Run full test suite**

Run: `npm test`
Expected: All Phase 1 tests pass ✅

**Step 2: Launch adversarial review subagent**

The adversarial subagent should review:
- Store state management (immutability, persistence)
- Migration idempotency
- Edge cases (missing workspaces, invalid state)
- Type safety
- Test coverage completeness

**Step 3: Address critical issues from review**

If adversarial review finds CRITICAL issues, fix them before proceeding to Phase 2.

**Step 4: Document phase completion**

Update CLAUDE.md Memory section with Phase 1 completion status and any learnings.

---

## Phase 2: Section Components (Subagent 2)

**Scope:** Create HomeSessionsSection, SystemSessionsSection, UnassignedSessionsSection
**Subagent Assignment:** Phase 2 Components Agent
**Estimated Time:** 60 minutes

### Task 2.1: Create HomeSessionsSection component

**Files:**
- Create: `src/components/sidebar/HomeSessionsSection.tsx`
- Test: `__tests__/components/sidebar/HomeSessionsSection.test.tsx` (create)

**Step 1: Write the failing test**

```typescript
// __tests__/components/sidebar/HomeSessionsSection.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HomeSessionsSection } from '@/components/sidebar/HomeSessionsSection';
import type { Session } from '@/types/claude';

const mockSessions: Session[] = [
  {
    id: 'session-1',
    name: 'Test Session 1',
    created_at: Date.now() - 1000 * 60 * 60, // 1 hour ago
    updated_at: Date.now(),
    cwd: '/workspace',
    workspaceId: 'workspace-1',
    messageCount: 5,
    gitBranch: 'main',
  },
  {
    id: 'session-2',
    name: 'Test Session 2',
    created_at: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
    updated_at: Date.now() - 1000 * 60 * 30, // 30 min ago
    cwd: '/workspace',
    workspaceId: 'workspace-1',
    messageCount: 3,
    gitBranch: 'feature-branch',
  },
];

describe('HomeSessionsSection', () => {
  it('should render section header with emoji and count', () => {
    render(
      <HomeSessionsSection
        workspaceId="workspace-1"
        sessions={mockSessions}
        isCollapsed={false}
        onToggle={vi.fn()}
      />
    );

    expect(screen.getByText(/🏠/)).toBeInTheDocument();
    expect(screen.getByText(/Home Sessions \(2\)/)).toBeInTheDocument();
  });

  it('should apply green color tint to header', () => {
    const { container } = render(
      <HomeSessionsSection
        workspaceId="workspace-1"
        sessions={mockSessions}
        isCollapsed={false}
        onToggle={vi.fn()}
      />
    );

    const header = container.querySelector('.bg-green-50');
    expect(header).toBeInTheDocument();
  });

  it('should show sessions when not collapsed', () => {
    render(
      <HomeSessionsSection
        workspaceId="workspace-1"
        sessions={mockSessions}
        isCollapsed={false}
        onToggle={vi.fn()}
      />
    );

    expect(screen.getByText('Test Session 1')).toBeInTheDocument();
    expect(screen.getByText('Test Session 2')).toBeInTheDocument();
  });

  it('should hide sessions when collapsed', () => {
    render(
      <HomeSessionsSection
        workspaceId="workspace-1"
        sessions={mockSessions}
        isCollapsed={true}
        onToggle={vi.fn()}
      />
    );

    expect(screen.queryByText('Test Session 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Test Session 2')).not.toBeInTheDocument();
  });

  it('should call onToggle when header clicked', () => {
    const mockToggle = vi.fn();
    render(
      <HomeSessionsSection
        workspaceId="workspace-1"
        sessions={mockSessions}
        isCollapsed={false}
        onToggle={mockToggle}
      />
    );

    const header = screen.getByRole('button', { name: /Home Sessions/ });
    fireEvent.click(header);

    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it('should show empty state when no sessions', () => {
    render(
      <HomeSessionsSection
        workspaceId="workspace-1"
        sessions={[]}
        isCollapsed={false}
        onToggle={vi.fn()}
      />
    );

    expect(screen.getByText(/No home sessions/i)).toBeInTheDocument();
  });

  it('should have accessible ARIA labels', () => {
    render(
      <HomeSessionsSection
        workspaceId="workspace-1"
        sessions={mockSessions}
        isCollapsed={false}
        onToggle={vi.fn()}
      />
    );

    const section = screen.getByRole('region');
    expect(section).toHaveAttribute('aria-label', 'Home sessions for workspace');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test __tests__/components/sidebar/HomeSessionsSection.test.tsx`
Expected: FAIL - "HomeSessionsSection is not defined"

**Step 3: Create HomeSessionsSection component**

```typescript
// src/components/sidebar/HomeSessionsSection.tsx
'use client';

import { ChevronRight } from 'lucide-react';
import { SessionItem } from './SessionItem';
import type { Session } from '@/types/claude';
import { createLogger } from '@/lib/logger';

const log = createLogger('HomeSessionsSection');

interface HomeSessionsSectionProps {
  workspaceId: string;
  sessions: Session[];
  isCollapsed: boolean;
  onToggle: () => void;
}

export function HomeSessionsSection({
  workspaceId,
  sessions,
  isCollapsed,
  onToggle,
}: HomeSessionsSectionProps) {
  log.debug('HomeSessionsSection render', {
    workspaceId,
    sessionCount: sessions.length,
    isCollapsed,
  });

  return (
    <section
      className="mt-2"
      aria-label="Home sessions for workspace"
      role="region"
    >
      {/* Section Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg
                   bg-green-50 dark:bg-green-950/20
                   text-green-900 dark:text-green-100
                   hover:bg-green-100 dark:hover:bg-green-950/30
                   transition-colors"
        aria-expanded={!isCollapsed}
        aria-controls={`home-sessions-${workspaceId}`}
      >
        <div className="flex items-center gap-2">
          <ChevronRight
            className={`w-4 h-4 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
          />
          <span className="text-sm font-medium">
            🏠 Home Sessions ({sessions.length})
          </span>
        </div>
      </button>

      {/* Session List */}
      {!isCollapsed && (
        <div
          id={`home-sessions-${workspaceId}`}
          className="ml-6 mt-1 space-y-1"
        >
          {sessions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              No home sessions
            </div>
          ) : (
            sessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                sectionType="home"
              />
            ))
          )}
        </div>
      )}
    </section>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npm test __tests__/components/sidebar/HomeSessionsSection.test.tsx`
Expected: PASS ✅

**Step 5: Commit**

```bash
git add src/components/sidebar/HomeSessionsSection.tsx __tests__/components/sidebar/HomeSessionsSection.test.tsx
git commit -m "feat(sidebar): add HomeSessionsSection component

- Create collapsible section for workspace-specific sessions
- Green color tint (bg-green-50 / dark:bg-green-950/20)
- 🏠 emoji header with session count
- Empty state handling
- Accessible with ARIA labels
- Comprehensive test coverage

Co-Authored-By: Claude Sonnet 4.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2.2: Create SystemSessionsSection component

**Similar structure to Task 2.1, but with:**
- Blue color tint (`bg-blue-50 dark:bg-blue-950/20`)
- 🛠️ emoji
- "System Sessions" label
- Filters for `session.isSystem === true`

**Files:**
- Create: `src/components/sidebar/SystemSessionsSection.tsx`
- Test: `__tests__/components/sidebar/SystemSessionsSection.test.tsx`

**Implementation:** Follow same TDD steps as Task 2.1 with appropriate color/emoji changes.

**Commit message:** `feat(sidebar): add SystemSessionsSection component`

---

### Task 2.3: Create UnassignedSessionsSection component

**Similar structure to Task 2.1, but with:**
- Orange color tint (`bg-orange-50 dark:bg-orange-950/20`)
- ❓ emoji
- "Unassigned Sessions" label
- Shows sessions that don't match any workspace

**Files:**
- Create: `src/components/sidebar/UnassignedSessionsSection.tsx`
- Test: `__tests__/components/sidebar/UnassignedSessionsSection.test.tsx`

**Implementation:** Follow same TDD steps as Task 2.1 with appropriate color/emoji changes.

**Commit message:** `feat(sidebar): add UnassignedSessionsSection component`

---

### Phase 2 Complete: Run Tests & Adversarial Review

**Run:** `npm test` (all Phase 2 tests)
**Expected:** All tests pass ✅

**Adversarial Review Focus:**
- Color contrast (WCAG AA compliance)
- Accessibility (ARIA, keyboard navigation)
- Empty state UX
- Component prop types
- Test completeness

---

## Phase 3: Enhanced Metadata (Subagent 3)

**Scope:** Update SessionItem with ISO dates, color-coded metadata, emoji icons
**Subagent Assignment:** Phase 3 Metadata Agent
**Estimated Time:** 45 minutes

### Task 3.1: Add sectionType prop to SessionItem

**Files:**
- Modify: `src/components/sidebar/SessionItem.tsx:10-20`
- Test: `__tests__/components/sidebar/SessionItem.test.tsx` (modify existing)

**Step 1: Write the failing test**

```typescript
// __tests__/components/sidebar/SessionItem.test.tsx (add to existing)
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SessionItem } from '@/components/sidebar/SessionItem';

describe('SessionItem with section types', () => {
  const mockSession = {
    id: 'session-1',
    name: 'Test Session',
    created_at: Date.now(),
    updated_at: Date.now(),
    cwd: '/workspace',
    workspaceId: 'workspace-1',
    messageCount: 5,
    gitBranch: 'main',
  };

  it('should apply green border for home section', () => {
    const { container } = render(
      <SessionItem session={mockSession} sectionType="home" />
    );

    const item = container.querySelector('.border-l-green-500');
    expect(item).toBeInTheDocument();
  });

  it('should apply blue border for system section', () => {
    const { container } = render(
      <SessionItem session={mockSession} sectionType="system" />
    );

    const item = container.querySelector('.border-l-blue-500');
    expect(item).toBeInTheDocument();
  });

  it('should apply orange border for unassigned section', () => {
    const { container } = render(
      <SessionItem session={mockSession} sectionType="unassigned" />
    );

    const item = container.querySelector('.border-l-orange-500');
    expect(item).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test __tests__/components/sidebar/SessionItem.test.tsx`
Expected: FAIL - sectionType prop doesn't exist

**Step 3: Add sectionType prop**

```typescript
// src/components/sidebar/SessionItem.tsx (modify interface and styles)

type SectionType = 'home' | 'system' | 'unassigned';

interface SessionItemProps {
  session: CLISession;
  sectionType?: SectionType; // ✅ NEW
}

export function SessionItem({ session, sectionType = 'home' }: SessionItemProps) {
  // ... existing code ...

  // ✅ NEW: Section-specific border colors
  const borderColorClass = {
    home: 'border-l-green-500 dark:border-l-green-400',
    system: 'border-l-blue-500 dark:border-l-blue-400',
    unassigned: 'border-l-orange-500 dark:border-l-orange-400',
  }[sectionType];

  return (
    <div
      onClick={handleClick}
      className={cn(
        'p-2.5 rounded-lg cursor-pointer text-sm',
        'border-l-4',
        isActive ? borderColorClass : 'border-transparent',
        // ... rest of classes ...
      )}
    >
      {/* ... rest of component ... */}
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npm test __tests__/components/sidebar/SessionItem.test.tsx`
Expected: PASS ✅

**Step 5: Commit**

```bash
git add src/components/sidebar/SessionItem.tsx __tests__/components/sidebar/SessionItem.test.tsx
git commit -m "feat(sidebar): add section-specific border colors to SessionItem

- Add sectionType prop ('home' | 'system' | 'unassigned')
- Apply green/blue/orange borders based on section type
- Default to 'home' for backwards compatibility
- Test coverage for all section types

Co-Authored-By: Claude Sonnet 4.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3.2: Replace relative dates with ISO + relative

**Files:**
- Modify: `src/components/sidebar/SessionItem.tsx:80-90`
- Test: `__tests__/components/sidebar/SessionItem.test.tsx` (add tests)

**Step 1: Write the failing test**

```typescript
// __tests__/components/sidebar/SessionItem.test.tsx (add tests)
it('should display ISO + relative date format', () => {
  const mockSession = {
    id: 'session-1',
    name: 'Test Session',
    created_at: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
    updated_at: Date.now() - 1000 * 60 * 30, // 30 min ago
    cwd: '/workspace',
    workspaceId: 'workspace-1',
    messageCount: 5,
  };

  render(<SessionItem session={mockSession} />);

  // Should show ISO format with relative time
  expect(screen.getByText(/\d{4}-\d{2}-\d{2} \d{2}:\d{2} \(\d+m ago\)/)).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm test __tests__/components/sidebar/SessionItem.test.tsx`
Expected: FAIL - Still using old relative format

**Step 3: Update SessionItem to use formatISOWithRelative**

```typescript
// src/components/sidebar/SessionItem.tsx (update metadata display)
import { formatISOWithRelative } from '@/lib/utils/time';

export function SessionItem({ session, sectionType = 'home' }: SessionItemProps) {
  // ... existing code ...

  return (
    <div>
      {/* Line 1: Session name */}
      <div className="truncate font-medium">{session.name}</div>

      {/* Line 2: Git branch (if exists) */}
      {session.gitBranch && (
        <div className="mt-1 ml-6 flex items-center gap-1.5">
          <span className="text-xs">🔀</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {session.gitBranch}
          </span>
        </div>
      )}

      {/* Line 3: Metadata with ISO dates */}
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6 flex flex-wrap gap-2">
        {session.messageCount !== undefined && (
          <span>💬 {session.messageCount} msg{session.messageCount !== 1 ? 's' : ''}</span>
        )}
        {session.createdAt && (
          <span>📅 {formatISOWithRelative(session.createdAt)}</span>
        )}
        <span>🕒 {formatISOWithRelative(session.modifiedAt)}</span>
      </div>
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npm test __tests__/components/sidebar/SessionItem.test.tsx`
Expected: PASS ✅

**Step 5: Commit**

```bash
git add src/components/sidebar/SessionItem.tsx __tests__/components/sidebar/SessionItem.test.tsx
git commit -m "feat(sidebar): replace relative dates with ISO + relative format

- Use formatISOWithRelative for created/modified dates
- Add emoji icons: 🔀 branch, 💬 messages, 📅 created, 🕒 modified
- Display format: '2026-02-28 14:30 (2h ago)'
- Metadata wraps on narrow sidebar

Co-Authored-By: Claude Sonnet 4.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3.3: Add color-coded metadata

**Files:**
- Modify: `src/components/sidebar/SessionItem.tsx:20-100`
- Test: `__tests__/components/sidebar/SessionItem.test.tsx` (add tests)

**Step 1: Write failing test for semantic color scheme**

```typescript
it('should apply semantic color scheme by default', () => {
  const mockSession = {
    id: 'session-1',
    name: 'Test Session',
    created_at: Date.now(),
    updated_at: Date.now(),
    cwd: '/workspace',
    workspaceId: 'workspace-1',
    messageCount: 5,
    gitBranch: 'main',
  };

  // Mock store to return 'semantic' scheme
  vi.mock('@/lib/store', () => ({
    useChatStore: () => ({ metadataColorScheme: 'semantic' }),
  }));

  const { container } = render(<SessionItem session={mockSession} />);

  // Git branch should be purple
  const branchElement = container.querySelector('.text-purple-600');
  expect(branchElement).toBeInTheDocument();

  // Message count should be blue
  const messageElement = container.querySelector('.text-blue-600');
  expect(messageElement).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm test __tests__/components/sidebar/SessionItem.test.tsx`
Expected: FAIL - No color classes applied

**Step 3: Add color scheme logic**

```typescript
// src/components/sidebar/SessionItem.tsx (add color logic)
import { useChatStore } from '@/lib/store';

export function SessionItem({ session, sectionType = 'home' }: SessionItemProps) {
  const metadataColorScheme = useChatStore(state => state.metadataColorScheme);

  // Color classes based on scheme
  const metadataColors = metadataColorScheme === 'semantic'
    ? {
        branch: 'text-purple-600 dark:text-purple-400',
        messageCount: 'text-blue-600 dark:text-blue-400',
        dates: 'text-gray-600 dark:text-gray-400',
      }
    : {
        branch: 'text-cyan-600 dark:text-cyan-400',
        messageCount: 'text-purple-600 dark:text-purple-400',
        createdDate: 'text-amber-600 dark:text-amber-400',
        modifiedDate: 'text-red-600 dark:text-red-400',
      };

  return (
    <div>
      {/* Line 2: Git branch with color */}
      {session.gitBranch && (
        <div className={cn("mt-1 ml-6 flex items-center gap-1.5", metadataColors.branch)}>
          <span className="text-xs">🔀</span>
          <span className="text-xs truncate">{session.gitBranch}</span>
        </div>
      )}

      {/* Line 3: Metadata with colors */}
      <div className="text-xs mt-1 ml-6 flex flex-wrap gap-2">
        {session.messageCount !== undefined && (
          <span className={metadataColors.messageCount}>
            💬 {session.messageCount} msg{session.messageCount !== 1 ? 's' : ''}
          </span>
        )}
        {session.createdAt && (
          <span className={metadataColorScheme === 'semantic' ? metadataColors.dates : metadataColors.createdDate}>
            📅 {formatISOWithRelative(session.createdAt)}
          </span>
        )}
        <span className={metadataColorScheme === 'semantic' ? metadataColors.dates : metadataColors.modifiedDate}>
          🕒 {formatISOWithRelative(session.modifiedAt)}
        </span>
      </div>
    </div>
  );
}
```

**Step 4: Add test for gradient scheme**

```typescript
it('should apply gradient color scheme when selected', () => {
  vi.mock('@/lib/store', () => ({
    useChatStore: () => ({ metadataColorScheme: 'gradient' }),
  }));

  const { container } = render(<SessionItem session={mockSession} />);

  // Git branch should be cyan
  expect(container.querySelector('.text-cyan-600')).toBeInTheDocument();

  // Created date should be amber
  expect(container.querySelector('.text-amber-600')).toBeInTheDocument();

  // Modified date should be red
  expect(container.querySelector('.text-red-600')).toBeInTheDocument();
});
```

**Step 5: Run tests to verify they pass**

Run: `npm test __tests__/components/sidebar/SessionItem.test.tsx`
Expected: PASS ✅

**Step 6: Commit**

```bash
git add src/components/sidebar/SessionItem.tsx __tests__/components/sidebar/SessionItem.test.tsx
git commit -m "feat(sidebar): add color-coded metadata to SessionItem

- Support semantic color scheme (purple branch, blue count, gray dates)
- Support gradient color scheme (cyan, purple, amber, red)
- Read scheme from metadataColorScheme store setting
- Re-renders when scheme toggles
- Test coverage for both schemes

Co-Authored-By: Claude Sonnet 4.5 (1M context) <noreply@anthropic.com>"
```

---

### Phase 3 Complete: Run Tests & Adversarial Review

**Run:** `npm test` (all Phase 3 tests)
**Expected:** All tests pass ✅

**Adversarial Review Focus:**
- Color accessibility (contrast ratios)
- Performance (re-renders on scheme toggle)
- Edge cases (missing dates, long text wrapping)
- Backwards compatibility with existing sessions

---

## Phase 4: Tooltip System (Subagent 4)

**Scope:** Create Tooltip component, add to SessionItem and ProjectList
**Subagent Assignment:** Phase 4 Tooltip Agent
**Estimated Time:** 50 minutes

### Task 4.1: Create Tooltip component

**Files:**
- Create: `src/components/ui/Tooltip.tsx`
- Test: `__tests__/components/ui/Tooltip.test.tsx` (create)

**Implementation:** TDD approach - create tooltip with:
- 500ms hover delay
- Smart positioning (flip on viewport edge)
- `role="tooltip"` and `aria-describedby`
- Keyboard focus support

**Commit:** `feat(ui): add Tooltip component with accessibility`

---

### Task 4.2: Add session tooltips (last message preview)

**Files:**
- Modify: `src/components/sidebar/SessionItem.tsx`
- Test: `__tests__/components/sidebar/SessionItem.test.tsx`

**Implementation:**
- Wrap SessionItem in Tooltip
- Fetch last message on hover (lazy load)
- Cache result in component state
- Show "No messages yet" fallback

**Commit:** `feat(sidebar): add last message preview tooltips to sessions`

---

### Task 4.3: Add workspace tooltips (last active session)

**Files:**
- Modify: `src/components/sidebar/ProjectList.tsx`
- Test: `__tests__/components/sidebar/ProjectList.test.tsx`

**Implementation:**
- Wrap workspace header in Tooltip
- Look up lastActiveSessionId from store
- Show session name or "No sessions" fallback

**Commit:** `feat(sidebar): add last active session tooltips to workspaces`

---

### Phase 4 Complete: Adversarial Review

**Focus:**
- Tooltip positioning edge cases
- Lazy loading performance
- Memory leaks (cached data)
- Keyboard navigation

---

## Phase 5: Collapse/Expand All (Subagent 5)

**Scope:** Create CollapseAllButton, add actions to store
**Subagent Assignment:** Phase 5 Collapse Agent
**Estimated Time:** 30 minutes

### Task 5.1: Add collapseAll/expandAll actions

**Files:**
- Modify: `src/lib/store/index.ts`
- Test: `__tests__/lib/store/collapse-all.test.ts`

**Implementation:**
- Add `collapseAll()`: Populate both collapsedProjects and collapsedSections
- Add `expandAll()`: Clear both Sets
- Add computed `allCollapsed` getter

**Commit:** `feat(store): add collapseAll and expandAll actions`

---

### Task 5.2: Create CollapseAllButton component

**Files:**
- Create: `src/components/sidebar/CollapseAllButton.tsx`
- Test: `__tests__/components/sidebar/CollapseAllButton.test.tsx`

**Implementation:**
- Button at top of SessionPanel
- Smart label ("Expand All" or "Collapse All")
- ChevronDown/ChevronUp icon
- Keyboard accessible

**Commit:** `feat(sidebar): add CollapseAllButton component`

---

### Phase 5 Complete: Adversarial Review

**Focus:**
- State synchronization across stores
- Performance with many sections
- Keyboard shortcuts

---

## Phase 6: Integration & Auto-Switching (Subagent 6)

**Scope:** Wire sections into SessionPanel, add auto-switch logic
**Subagent Assignment:** Phase 6 Integration Agent
**Estimated Time:** 60 minutes

### Task 6.1: Integrate sections in SessionPanel

**Files:**
- Modify: `src/components/sidebar/SessionPanel.tsx`
- Test: `__tests__/components/sidebar/SessionPanel.test.tsx`

**Implementation:**
- Render CollapseAllButton at top
- Render ProjectList (contains HomeSessionsSection)
- Render SystemSessionsSection (global)
- Render UnassignedSessionsSection (global)

**Commit:** `feat(sidebar): integrate all session sections in SessionPanel`

---

### Task 6.2: Embed HomeSessionsSection in ProjectList

**Files:**
- Modify: `src/components/sidebar/ProjectList.tsx`
- Test: `__tests__/components/sidebar/ProjectList.test.tsx`

**Implementation:**
- Filter sessions per workspace
- Render HomeSessionsSection under each workspace header
- Pass correct props (workspaceId, sessions, collapse state)

**Commit:** `feat(sidebar): embed HomeSessionsSection in workspace tabs`

---

### Task 6.3: Add auto-switch on workspace creation

**Files:**
- Modify: Workspace creation handler (location TBD)
- Test: Integration test

**Implementation:**
- Call `setActiveWorkspace(workspaceId)` after creation
- Auto-focus "New Chat" button
- Show empty state

**Commit:** `feat(workspace): add auto-switch to new workspaces on creation`

---

### Phase 6 Complete: Adversarial Review

**Focus:**
- Full integration flow
- Auto-switch edge cases
- Empty states
- Performance with many workspaces/sessions

---

## Phase 7: Settings UI (Subagent 7)

**Scope:** Add metadata color scheme toggle to settings panel
**Subagent Assignment:** Phase 7 Settings Agent
**Estimated Time:** 30 minutes

### Task 7.1: Create or update SettingsPanel

**Files:**
- Create/Modify: `src/components/panels/SettingsPanel.tsx`
- Test: `__tests__/components/panels/SettingsPanel.test.tsx`

**Implementation:**
- Add "Appearance" section
- Add "Metadata Color Scheme" radio buttons
- Add preview examples
- Call `setMetadataColorScheme` on change

**Commit:** `feat(settings): add metadata color scheme toggle`

---

### Task 7.2: Add settings access (if missing)

**Files:**
- Modify: `src/app/page.tsx` (or relevant layout)

**Implementation:**
- Add settings icon/button
- Open SettingsPanel on click

**Commit:** `feat(ui): add settings panel access`

---

### Phase 7 Complete: Adversarial Review

**Focus:**
- Settings persistence
- Immediate re-render on toggle
- Preview accuracy

---

## Final Integration Testing

### Task: Run full test suite

Run: `npm run test`
Expected: All tests pass ✅

### Task: Manual browser testing

**Test scenarios:**
1. Create new workspace → auto-switches ✅
2. Switch workspaces → loads last session ✅
3. Collapse/expand sections → state persists ✅
4. Toggle metadata color scheme → immediate update ✅
5. Hover tooltips → show correct content ✅
6. Try to delete/archive "🌴 groot" → prevented ✅
7. Empty states → show helpful messages ✅
8. Accessibility → keyboard navigation works ✅

### Task: Performance testing

- Test with 100+ sessions
- Rapid workspace switching
- Collapse/expand all with many sections

### Task: Accessibility audit

- Run axe-core or Lighthouse
- Test with screen reader
- Verify WCAG AA contrast

---

## Success Criteria Checklist

- [ ] "🌴 groot" is pinned and cannot be deleted/archived
- [ ] Sessions organized into 🏠 Home, 🛠️ System, ❓ Unassigned sections
- [ ] Color tints (green/blue/orange) applied correctly
- [ ] Metadata shows ISO + relative dates with color coding
- [ ] Tooltips show last message preview and last active session
- [ ] Collapse/expand all button toggles everything
- [ ] Auto-switch to new workspaces on creation
- [ ] Auto-load last session on workspace switch (already working)
- [ ] User can toggle metadata color scheme (semantic/gradient)
- [ ] All accessibility requirements met (WCAG AA)
- [ ] No performance regressions (large session lists)
- [ ] All tests pass (>90% coverage)
- [ ] Build succeeds without errors

---

## Execution Handoff

Plan complete and saved to `docs/plans/2026-02-28-workspace-ui-redesign-implementation.md`.

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration. Use superpowers:subagent-driven-development skill.

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints. Each phase gets adversarial review with max iterations 9, completion promise "michaelangelo".

**Which approach?**
