# Workspace UI Fixes - Implementation Plan

**Date:** 2026-02-23
**Status:** Planning

---

## Issues Identified

### Issue 1: Add Workspace Button Hidden Behind Right Panel ⚠️
**Problem:** The "+ Add Workspace" button is not visible when the right panel is open because the panel overlays it.

**Root Cause:**
- WorkspaceTabBar has no z-index (defaults to `z-0`)
- RightPanel has `z-50` (open) and `z-40` (collapsed)
- RightPanel is `position: fixed` and covers the tab bar

**Solution:**
- Add `z-50` to WorkspaceTabBar to keep it above the RightPanel
- Ensure proper layering: TabBar (z-50) > RightPanel (z-40 collapsed, z-30 open)

**Files to modify:**
- `src/components/workspace/WorkspaceTabBar.tsx`

---

### Issue 2: No Directory Browser ⚠️
**Problem:** Users must manually type absolute paths like `/workspace/myproject`, which is error-prone and difficult.

**User needs:**
- Browse filesystem visually
- Navigate parent/child directories
- See available directories
- Validate path exists before adding

**Solution:**
- Create `DirectoryBrowser.tsx` component
- Use `/api/files?path=X` to list directories
- Show breadcrumb navigation
- Show only directories (filter out files)
- Allow parent directory navigation (..)
- Validate path exists before allowing selection

**Files to create:**
- `src/components/workspace/DirectoryBrowser.tsx`

**Files to modify:**
- `src/components/workspace/AddWorkspaceDialog.tsx` - Add "Browse" button

---

### Issue 3: Unclear What Workspace Creation Does ⚠️
**Problem:** Users don't understand:
- What a workspace is
- Why they need multiple workspaces
- What happens when they create one
- How it differs from sessions

**Solution:**
- Add help text in AddWorkspaceDialog explaining workspaces
- Show examples ("Frontend project", "Backend project", "Documentation")
- Add info icon with tooltip
- Add empty state onboarding when no workspaces exist
- Maybe show preview of what workspace will look like

**Files to modify:**
- `src/components/workspace/AddWorkspaceDialog.tsx` - Add explanation section
- `src/components/workspace/WorkspaceTabBar.tsx` - Add empty state with onboarding

**Files to create:**
- `src/components/workspace/WorkspaceEmptyState.tsx` - First-time user onboarding

---

### Issue 4: Keyboard Shortcuts Ctrl+Shift+1-9 Don't Work 🐛
**Problem:** Pressing Ctrl+Shift+1 doesn't switch to workspace 1.

**Root Cause:**
When Shift is held down, number keys produce symbols, not numbers:
- Shift+1 = `!`
- Shift+2 = `@`
- Shift+3 = `#`
- etc.

The code checks `event.key >= '1' && event.key <= '9'`, but `event.key` is `!` not `1`.

**Solution:**
- Use `event.code` instead of `event.key`
- `event.code` returns the physical key pressed (e.g., "Digit1", "Digit2")
- Parse the digit from the code: `event.code === 'Digit1'` → index 0

**Files to modify:**
- `src/hooks/useWorkspaceShortcuts.ts`

---

## Implementation Plan

### Phase 1: Critical Fixes (30 minutes)

#### Task 1.1: Fix Z-Index Layering
**Priority:** High (blocks visibility)
**Effort:** 5 minutes

```tsx
// src/components/workspace/WorkspaceTabBar.tsx
- <div className="flex items-center bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
+ <div className="relative z-40 flex items-center bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
```

Also update RightPanel z-index to be lower:
```tsx
// src/components/sidebar/RightPanel.tsx
// Collapsed state
- className="... z-40"
+ className="... z-30"

// Open state
- className="... z-50"
+ className="... z-30"
```

**Rationale:** TabBar should be above everything since it's the primary navigation.

---

#### Task 1.2: Fix Keyboard Shortcuts
**Priority:** High (feature doesn't work)
**Effort:** 10 minutes

```tsx
// src/hooks/useWorkspaceShortcuts.ts
// Replace this:
if (event.ctrlKey && event.shiftKey && !event.altKey && event.key >= '1' && event.key <= '9') {
  event.preventDefault();
  const index = parseInt(event.key, 10) - 1;
  // ...
}

// With this:
if (event.ctrlKey && event.shiftKey && !event.altKey && event.code.startsWith('Digit')) {
  event.preventDefault();
  const digit = event.code.replace('Digit', '');
  const index = parseInt(digit, 10) - 1;

  if (index >= 0 && index < 9 && index < workspaces.length) {
    onWorkspaceSelect(workspaces[index].id);
  }
  return;
}
```

**Testing:**
- Press Ctrl+Shift+1: should switch to first workspace
- Press Ctrl+Shift+2: should switch to second workspace
- Press Ctrl+Shift+9 with only 3 workspaces: should do nothing

---

#### Task 1.3: Add Workspace Explanation
**Priority:** Medium (UX confusion)
**Effort:** 15 minutes

Add help section to AddWorkspaceDialog:

```tsx
// Before the form fields, add:
<div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-4">
  <div className="flex items-start gap-2">
    <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
    <div className="text-sm text-blue-900 dark:text-blue-100">
      <p className="font-medium mb-1">What is a workspace?</p>
      <p className="text-blue-700 dark:text-blue-300">
        Workspaces let you work on multiple projects simultaneously.
        Each workspace has its own file tree, terminal, and chat sessions.
      </p>
    </div>
  </div>
</div>
```

---

### Phase 2: Directory Browser (45-60 minutes)

#### Task 2.1: Create DirectoryBrowser Component
**Priority:** High (major UX issue)
**Effort:** 45 minutes

**Features:**
- List directories at current path
- Breadcrumb navigation
- Parent directory (..) button
- Only show directories, not files
- Loading state while fetching
- Error handling for permission denied
- Click to select, double-click to navigate

**Component structure:**
```tsx
interface DirectoryBrowserProps {
  initialPath?: string;
  onSelect: (path: string) => void;
  onCancel: () => void;
}

export function DirectoryBrowser({ initialPath = '/', onSelect, onCancel }: DirectoryBrowserProps) {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [directories, setDirectories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  // Fetch directories at current path
  useEffect(() => {
    fetchDirectories(currentPath);
  }, [currentPath]);

  const fetchDirectories = async (path: string) => {
    // Use /api/files?path=X
    // Filter to only show directories (isDirectory: true)
  };

  const navigateTo = (dir: string) => {
    // Navigate to subdirectory
    setCurrentPath(joinPaths(currentPath, dir));
  };

  const goUp = () => {
    // Go to parent directory
    setCurrentPath(dirname(currentPath));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl h-[600px] flex flex-col">
        {/* Breadcrumb */}
        <div className="p-4 border-b">
          <Breadcrumb path={currentPath} onNavigate={setCurrentPath} />
        </div>

        {/* Directory list */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <LoadingSpinner />
          ) : error ? (
            <ErrorMessage error={error} />
          ) : (
            <>
              {/* Parent directory button */}
              {currentPath !== '/' && (
                <DirectoryItem
                  name=".."
                  onClick={goUp}
                />
              )}

              {/* Directories */}
              {directories.map(dir => (
                <DirectoryItem
                  key={dir}
                  name={dir}
                  selected={selectedPath === joinPaths(currentPath, dir)}
                  onClick={() => setSelectedPath(joinPaths(currentPath, dir))}
                  onDoubleClick={() => navigateTo(dir)}
                />
              ))}
            </>
          )}
        </div>

        {/* Footer with current selection */}
        <div className="p-4 border-t flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {selectedPath ? (
              <span>Selected: <code>{selectedPath}</code></span>
            ) : (
              <span>Select a directory to continue</span>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onCancel} className="...">Cancel</button>
            <button
              onClick={() => selectedPath && onSelect(selectedPath)}
              disabled={!selectedPath}
              className="..."
            >
              Select
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

#### Task 2.2: Integrate Browser into AddWorkspaceDialog
**Priority:** High
**Effort:** 15 minutes

```tsx
// Add state
const [isBrowsing, setIsBrowsing] = useState(false);

// Add Browse button next to path input
<div className="flex gap-2">
  <input
    type="text"
    value={path}
    onChange={(e) => setPath(e.target.value)}
    placeholder="/path/to/directory"
    className="flex-1 ..."
  />
  <button
    onClick={() => setIsBrowsing(true)}
    className="px-3 py-2 border rounded-lg ..."
  >
    Browse
  </button>
</div>

// Add browser modal
{isBrowsing && (
  <DirectoryBrowser
    initialPath={path || '/workspace'}
    onSelect={(selectedPath) => {
      setPath(selectedPath);
      setIsBrowsing(false);
    }}
    onCancel={() => setIsBrowsing(false)}
  />
)}
```

---

### Phase 3: Empty State Onboarding (30 minutes)

#### Task 3.1: Create WorkspaceEmptyState
**Priority:** Medium (helps first-time users)
**Effort:** 30 minutes

Show when no workspaces exist:

```tsx
// src/components/workspace/WorkspaceEmptyState.tsx
export function WorkspaceEmptyState({ onAddWorkspace }: { onAddWorkspace: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="mb-6">
        <div className="text-6xl mb-4">📁</div>
        <h2 className="text-2xl font-semibold mb-2">Welcome to Workspaces</h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-md">
          Workspaces let you work on multiple projects at once. Each workspace
          has its own file tree, terminal, and chat history.
        </p>
      </div>

      <button
        onClick={onAddWorkspace}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                   transition-colors font-medium"
      >
        Add Your First Workspace
      </button>

      <div className="mt-8 grid grid-cols-3 gap-4 max-w-2xl text-left">
        <div className="p-4 border rounded-lg">
          <div className="text-2xl mb-2">📁</div>
          <h3 className="font-medium mb-1">Local Projects</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Work on projects stored on your computer
          </p>
        </div>
        <div className="p-4 border rounded-lg opacity-50">
          <div className="text-2xl mb-2">🔀</div>
          <h3 className="font-medium mb-1">Git Repos</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Clone and work on remote repositories (coming soon)
          </p>
        </div>
        <div className="p-4 border rounded-lg opacity-50">
          <div className="text-2xl mb-2">🔐</div>
          <h3 className="font-medium mb-1">SSH Servers</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Connect to remote development servers (coming soon)
          </p>
        </div>
      </div>

      <div className="mt-6 text-xs text-gray-500 dark:text-gray-500">
        Keyboard shortcut: Ctrl+Shift+P to switch between workspaces
      </div>
    </div>
  );
}
```

#### Task 3.2: Show Empty State in Main Layout
**Priority:** Medium
**Effort:** 10 minutes

```tsx
// src/app/page.tsx
// In the main content area, check if workspaces exist
{orderedWorkspaces.length === 0 ? (
  <WorkspaceEmptyState onAddWorkspace={() => setIsAddDialogOpen(true)} />
) : (
  // Normal chat interface
  <div className={`flex-1 flex flex-col ...`}>
    ...
  </div>
)}
```

---

## Summary of Changes

### Files to Create
1. `src/components/workspace/DirectoryBrowser.tsx` - File browser component
2. `src/components/workspace/WorkspaceEmptyState.tsx` - First-time user onboarding

### Files to Modify
1. `src/components/workspace/WorkspaceTabBar.tsx` - Add z-index
2. `src/components/sidebar/RightPanel.tsx` - Lower z-index
3. `src/hooks/useWorkspaceShortcuts.ts` - Fix keyboard shortcuts (use event.code)
4. `src/components/workspace/AddWorkspaceDialog.tsx` - Add help text and browse button
5. `src/app/page.tsx` - Show empty state when no workspaces

---

## Testing Plan

### Test 1: Z-Index Fix
1. Open right panel
2. Verify "+ Add Workspace" button is still visible
3. Click button - should open dialog

### Test 2: Keyboard Shortcuts
1. Create 3 workspaces
2. Press Ctrl+Shift+1 - should switch to first workspace
3. Press Ctrl+Shift+2 - should switch to second
4. Press Ctrl+Shift+3 - should switch to third
5. Press Ctrl+Shift+9 - should do nothing (only 3 workspaces)

### Test 3: Directory Browser
1. Click "+ Add Workspace"
2. Click "Browse" button
3. Browser dialog opens at /workspace
4. Click a directory - should be selected (highlighted)
5. Double-click - should navigate into directory
6. Click ".." - should go to parent
7. Click breadcrumb - should jump to that path
8. Click "Select" - dialog closes, path filled in

### Test 4: Empty State
1. Clear all workspaces (delete from localStorage)
2. Refresh page
3. Should show empty state with onboarding
4. Click "Add Your First Workspace"
5. Dialog opens

### Test 5: Help Text
1. Click "+ Add Workspace"
2. Verify blue info box explaining workspaces
3. Verify clear, understandable explanation

---

## Estimated Timeline

| Phase | Tasks | Effort | Priority |
|-------|-------|--------|----------|
| Phase 1 | Z-index, keyboard shortcuts, help text | 30 min | High |
| Phase 2 | Directory browser | 60 min | High |
| Phase 3 | Empty state onboarding | 40 min | Medium |
| **Total** | **8 tasks** | **~2 hours** | |

---

## Implementation Order

1. **Task 1.1** - Fix z-index (5 min) ✓ Immediate impact
2. **Task 1.2** - Fix keyboard shortcuts (10 min) ✓ Critical bug
3. **Task 1.3** - Add help text (15 min) ✓ Quick UX win
4. **Task 2.1** - Create DirectoryBrowser (45 min) ✓ Major UX improvement
5. **Task 2.2** - Integrate browser (15 min) ✓ Complete feature
6. **Task 3.1** - Create empty state (30 min) ⚪ Nice-to-have
7. **Task 3.2** - Show empty state (10 min) ⚪ Nice-to-have

Should I proceed with implementing these fixes?
