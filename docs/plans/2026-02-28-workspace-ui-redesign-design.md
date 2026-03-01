# Workspace UI Redesign: Session Organization & Visual Enhancement

**Date**: 2026-02-28
**Status**: Approved
**Implementation Approach**: Component Restructuring (Approach 1)

## Overview

This design reorganizes the workspace sidebar UI with enhanced visual hierarchy, collapsible session sections, improved metadata display, and auto-switching behavior. The redesign introduces "🌴 groot" as a pinned workspace, three-tier session organization (Home/System/Unassigned), color-coded sections, and rich metadata with tooltips.

## Goals

1. Replace "Current Workspace" with permanent "🌴 groot" workspace (cannot be deleted/archived)
2. Organize sessions into collapsible sections: 🏠 Home (per workspace), 🛠️ System (global), ❓ Unassigned (global)
3. Add visual distinction via emojis and color tints (green/blue/orange)
4. Replace relative dates with ISO format + relative time
5. Add color-coded metadata (git branch, message count, dates) with user-selectable color schemes
6. Add tooltips for sessions (last message preview) and workspaces (last active session)
7. Add collapse/expand all button for all sections
8. Auto-switch to new workspaces on creation
9. Auto-load last active session when switching workspaces (already implemented)

## Design Decisions

### 1. Permanent Tab Structure ("🌴 groot")

**Problem**: Users need a stable "home base" workspace that can't be accidentally deleted.

**Solution**:
- Rename "Current Workspace" to "🌴 groot"
- Add `isPinned: boolean` field to `Workspace` interface
- Mark `/workspace` as `isPinned: true` during initialization/migration
- Prevent deletion and archiving of pinned workspaces

**Implementation**:
- `src/lib/store/workspaces.ts`:
  - Add `isPinned?: boolean` to `Workspace` interface
  - Modify `removeWorkspace()`: Check `isPinned`, show toast if attempting to delete
  - Modify `archiveWorkspace()`: Check `isPinned`, show toast if attempting to archive
  - Migration: Rename existing `/workspace` to "🌴 groot" and set `isPinned: true`
- `src/components/sidebar/ProjectList.tsx`:
  - Display "🌴 groot" instead of "Current Workspace"
  - Add 📌 pin icon next to name
  - Grey out delete/archive buttons for pinned workspaces

**Edge Cases**:
- User tries to delete "🌴 groot" → Toast: "Cannot delete pinned workspace"
- User tries to archive "🌴 groot" → Toast: "Cannot archive pinned workspace"
- Migration runs multiple times → Idempotency check prevents duplicates

### 2. Session Sections Organization

**Problem**: All sessions appear in flat list, hard to distinguish workspace sessions from system/orphaned sessions.

**Solution**: Three-tier hierarchy:
- 🏠 Home Sessions: Nested under each workspace (workspace-specific)
- 🛠️ System Sessions: Global section (all system sessions)
- ❓ Unassigned Sessions: Global section (orphaned sessions)

**Visual Hierarchy**:
```
SessionPanel
├─ CollapseAllButton (top)
├─ ProjectList
│  ├─ 🌴 groot [v]
│  │  └─ 🏠 Home Sessions (5) [v] ← green tint
│  │     ├─ Session 1
│  │     └─ Session 2
│  └─ 📁 project-1 [v]
│     └─ 🏠 Home Sessions (2) [v] ← green tint
│        └─ Session 3
├─ 🛠️ System Sessions (3) [v] ← blue tint, global
│  ├─ System Session 1
│  └─ System Session 2
└─ ❓ Unassigned (1) [v] ← orange tint, global
   └─ Orphaned Session
```

**New Components** (`src/components/sidebar/`):

1. **`HomeSessionsSection.tsx`**:
   - Props: `workspaceId`, `sessions`, `isCollapsed`, `onToggle`
   - Renders workspace-specific sessions
   - Nested inside each workspace in `ProjectList`
   - Green color tint

2. **`SystemSessionsSection.tsx`**:
   - Props: `sessions`, `isCollapsed`, `onToggle`
   - Renders all system sessions (from CLI discovery)
   - Global section at bottom of `SessionPanel`
   - Blue color tint

3. **`UnassignedSessionsSection.tsx`**:
   - Props: `sessions`, `isCollapsed`, `onToggle`
   - Renders sessions without workspace match
   - Global section below System Sessions
   - Orange color tint

**State Management** (`src/lib/store/index.ts`):
- Add `collapsedSections: Set<string>` to ChatStore
- Add `toggleSectionCollapse(sectionId: string)` action
- Section IDs: `"home-{workspaceId}"`, `"system"`, `"unassigned"`
- Persist via Zustand middleware

**Session Filtering**:
- Home: `session.workspaceId === workspace.id || session.workspaceId === workspace.projectId`
- System: `cliSessions.filter(s => s.isSystem === true)`
- Unassigned: Sessions where no workspace matches their `workspaceId` or `projectId`

**Edge Cases**:
- Empty sections: Show "No home/system/unassigned sessions" with muted text
- Session reassignment: Auto-moves from Unassigned to Home when assigned
- All collapsed: Section headers with counts still visible
- Search: Filters all sections simultaneously, maintains structure

### 3. Visual Design (Emojis, Colors, Tints)

**Problem**: Hard to distinguish between different session types at a glance.

**Solution**: Emoji headers + color tints per section type.

**Emojis**:
- 🏠 Home Sessions (per workspace)
- 🛠️ System Sessions (global)
- ❓ Unassigned Sessions (global)

**Color Tint System**:

| Section | Header BG (light) | Header BG (dark) | Active Border | Hover BG |
|---------|-------------------|------------------|---------------|----------|
| 🏠 Home | `bg-green-50` | `bg-green-950/20` | `border-l-green-500` | `hover:bg-green-50/50` |
| 🛠️ System | `bg-blue-50` | `bg-blue-950/20` | `border-l-blue-500` | `hover:bg-blue-50/50` |
| ❓ Unassigned | `bg-orange-50` | `bg-orange-950/20` | `border-l-orange-500` | `hover:bg-orange-50/50` |

**Workspace Headers**: No color tints (maintains clear hierarchy between workspace and section levels)

**Accessibility**:
- Color tints meet WCAG AA contrast requirements
- Emojis have `aria-label` for screen readers
- Sections use semantic `<section>` tags
- Color + emoji + text provide redundancy (not color-only)

**Edge Cases**:
- High contrast mode: Emojis and borders remain visible
- Color blindness: Green/blue/orange distinguishable for common types
- Custom themes: Tints use CSS variables (overridable)

### 4. Metadata Display

**Problem**: Relative dates ("2h ago") lose context over time. Metadata all uses same color, hard to scan.

**Solution**: Absolute dates + relative time, color-coded metadata with user preference toggle.

**Date Format**: ISO + Relative
- Format: `"2026-02-28 14:30 (2h ago)"`
- Examples: `"just now"`, `"3d ago"`, `"6w ago"`
- Utility: `formatISOWithRelative(timestamp)` in `src/lib/utils/time.ts`

**Metadata Types**:
- Git branch: `🔀 main`
- Message count: `💬 5 msgs`
- Created date: `📅 2026-02-28 14:30 (3d ago)`
- Modified date: `🕒 2026-02-28 15:45 (2h ago)`

**Color Schemes** (user-selectable):

**Semantic Scheme** (default):
- Git branch: `text-purple-600 dark:text-purple-400` (version control)
- Message count: `text-blue-600 dark:text-blue-400` (data/quantity)
- Dates: `text-gray-600 dark:text-gray-400` (neutral info)

**Gradient Spectrum Scheme**:
- Git branch: `text-cyan-600 dark:text-cyan-400`
- Message count: `text-purple-600 dark:text-purple-400`
- Created date: `text-amber-600 dark:text-amber-400`
- Modified date: `text-red-600 dark:text-red-400`

**User Setting** (`src/lib/store/index.ts`):
- Add `metadataColorScheme: 'semantic' | 'gradient'` to ChatStore
- Add `setMetadataColorScheme(scheme)` action
- Persist via Zustand middleware
- UI: Settings panel with radio buttons or dropdown

**Enhanced SessionItem Layout**:
```tsx
// Line 1: Session name
<div className="truncate font-medium">{session.name}</div>

// Line 2: Git branch (if exists)
{session.gitBranch && (
  <div className={cn("text-xs flex items-center gap-1", branchColor)}>
    🔀 {session.gitBranch}
  </div>
)}

// Line 3: Metadata (wraps if needed)
<div className="text-xs flex flex-wrap gap-2">
  <span className={messageCountColor}>💬 {count} msgs</span>
  <span className={createdColor}>📅 {formatISOWithRelative(created)}</span>
  <span className={modifiedColor}>🕒 {formatISOWithRelative(modified)}</span>
</div>
```

**Edge Cases**:
- Missing git branch: Line 2 not rendered
- Missing message count: Show "0 msgs" in muted color
- Very recent: "2026-02-28 15:45 (just now)"
- Old sessions: "2026-01-15 10:30 (6w ago)"
- Narrow sidebar: Metadata wraps to multiple lines
- Color scheme toggle: Re-renders all sessions immediately

### 5. Interactions (Tooltips, Collapse/Expand All)

**Problem**: No context about session content or workspace state. No quick way to collapse all sections.

**Solution**: Tooltips on hover + global collapse/expand button.

**Tooltips**:

**Session Tooltips** (hover over session item):
- Content: Last message preview (first 100 chars)
- Fallback: "No messages yet"
- Position: Right side (avoids covering other sessions)
- Delay: 500ms hover (prevents spam)

**Workspace Tab Tooltips** (hover over workspace name):
- Content: Last active session name (e.g., "Last session: Fix authentication bug")
- Fallback: "No sessions in this workspace"
- Position: Right side
- Delay: 500ms

**Implementation** (`src/components/ui/Tooltip.tsx`):
- Wrapper component with `content`, `children`, `delay` props
- CSS `position: absolute` with smart positioning (detect viewport edges)
- Accessible: `role="tooltip"`, `aria-describedby`, keyboard focus support

**Data Fetching**:
- UI sessions: Use existing `messages` array from ChatStore
- CLI sessions: Lazy load on hover (`/api/sessions/[id]/messages?limit=1`)
- Cache results in component state (no refetch on subsequent hovers)

**Collapse/Expand All Button**:

**Location**: Top of SessionPanel, above workspace list

**Visual**:
```tsx
<button className="w-full px-3 py-2 text-sm font-medium flex items-center justify-between
                   hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
  <span>{allCollapsed ? 'Expand All' : 'Collapse All'}</span>
  <svg>{allCollapsed ? <ChevronDown /> : <ChevronUp />}</svg>
</button>
```

**Behavior**:
- Toggles ALL items: workspaces + sections (🏠🛠️❓)
- Smart label: "Expand All" if ANY collapsed, "Collapse All" if all expanded
- Keyboard: `Enter`/`Space` to activate

**State Management** (`src/lib/store/index.ts`):
- Add `collapseAll()`: Adds all IDs to `collapsedProjects` and `collapsedSections`
- Add `expandAll()`: Clears both Sets
- Add computed `allCollapsed: boolean`

**Edge Cases**:
- Tooltip on narrow sidebar: Flip to left if overflows viewport
- Long previews: Truncate to 100 chars with "..."
- Rapid hover: Only one tooltip visible (new hover cancels previous)
- Collapse all with no items: Button disabled with muted styling
- Tooltip fetch failure: "Unable to load preview" fallback

### 6. Auto-Switching Behavior

**Problem**: Manual workspace/session selection after creation is tedious.

**Solution**: Auto-switch to new workspaces, auto-load last session on workspace switch.

**Auto-Switch on Workspace Creation**:

**Flow**:
1. User clicks "New Workspace" button
2. Workspace creation dialog/form appears
3. User submits details
4. API creates workspace → returns `workspaceId`
5. ✅ Call `setActiveWorkspace(workspaceId)` immediately
6. UI shows new workspace expanded
7. Show empty state: "No home sessions - Create a new chat to get started"
8. Auto-focus "New Chat" button

**Code** (workspace creation handler):
```tsx
const handleCreateWorkspace = async (config: ProviderConfig) => {
  const workspaceId = await addWorkspace(config);
  setActiveWorkspace(workspaceId); // ✅ Auto-switch

  setTimeout(() => {
    document.getElementById('new-chat-button')?.focus();
  }, 100);
};
```

**Auto-Switch to Last Session** (already implemented!):

**Flow** (reuses `ProjectList.tsx` `handleWorkspaceClick`):
1. User clicks workspace header
2. Call `setActiveWorkspace(workspaceId)`
3. Look up `workspace.lastActiveSessionId`
4. Validate session exists and belongs to workspace
5. If valid → `switchSession(sessionId, projectId)`
6. If invalid → fall back to most recent session
7. If no sessions → empty state + focus "New Chat"
8. Toast: "Switched to {workspace}, {session} active"

**Edge Cases**:

**New workspace (no sessions)**:
- Empty state under 🏠 Home Sessions
- Message: "No home sessions - Create a new chat to get started"
- Auto-focus "New Chat" button
- No toast (empty state is self-explanatory)

**Deleted last session**:
- Validation fails
- Fall back to most recent by `updated_at`
- Toast: "Restored most recent session"
- Log warning for debugging

**Active streaming**:
- Cleanup stream first (`cleanupStream()`)
- Toast: "Stopped active conversation"
- Then switch workspace/session
- Prevents orphaned streams

**Rapid switching**:
- React 18 automatic batching handles state
- Latest switch wins
- No race conditions (server-authoritative loading)

**User Feedback**:
- Active workspace: Bold + subtle highlight
- Switching state: Brief spinner on workspace header
- Active session: Colored left border (green/blue/orange)
- Toast notifications for important transitions
- ARIA live regions for screen readers (already implemented)

**Performance**:
- Workspace switch: Synchronous (instant UI update)
- Session loading: Asynchronous (non-blocking)
- Message history: Background loading
- Chat input: Disabled until loading completes

## Implementation Strategy

### Phase 1: Core Infrastructure (Subagent 1)
**Scope**: Store updates, type definitions, utility functions

**Files**:
- `src/lib/store/workspaces.ts`: Add `isPinned`, migration logic
- `src/lib/store/index.ts`: Add `collapsedSections`, `metadataColorScheme`, actions
- `src/lib/utils/time.ts`: Add `formatISOWithRelative()`
- `src/types/sessions.ts`: Update interfaces if needed

**Deliverables**:
- ✅ `isPinned` field added to Workspace
- ✅ `collapsedSections` Set in ChatStore
- ✅ `metadataColorScheme` setting in ChatStore
- ✅ Migration function for "🌴 groot" rename
- ✅ Date formatting utility

**Testing**:
- Unit tests for store actions
- Migration idempotency tests
- Date format tests (various timestamps)

---

### Phase 2: Section Components (Subagent 2)
**Scope**: Create three section components with color tints

**Files** (new):
- `src/components/sidebar/HomeSessionsSection.tsx`
- `src/components/sidebar/SystemSessionsSection.tsx`
- `src/components/sidebar/UnassignedSessionsSection.tsx`

**Each component**:
- Props: `sessions`, `isCollapsed`, `onToggle`
- Emoji header + count
- Color tint (green/blue/orange)
- Empty state handling
- Session filtering logic

**Deliverables**:
- ✅ Three section components created
- ✅ Color tints applied (light/dark mode)
- ✅ Empty states with helpful messages
- ✅ Collapse/expand functionality

**Testing**:
- Component tests (rendering, props)
- Color contrast checks (WCAG AA)
- Empty state scenarios

---

### Phase 3: Enhanced Metadata (Subagent 3)
**Scope**: Update SessionItem with new metadata display

**Files**:
- `src/components/sidebar/SessionItem.tsx`
- `src/components/sidebar/UISessionItem.tsx` (if separate)

**Changes**:
- Replace relative dates with ISO + relative
- Add color-coded metadata (semantic/gradient schemes)
- Add emoji icons (🔀💬📅🕒)
- Layout: 3-line structure with wrapping
- Apply color scheme from store setting

**Deliverables**:
- ✅ Date format updated
- ✅ Metadata color schemes implemented
- ✅ Responsive layout (wraps on narrow sidebar)
- ✅ Icons added for visual anchors

**Testing**:
- Visual regression tests
- Color scheme toggle tests
- Layout tests (narrow/wide sidebar)

---

### Phase 4: Tooltip System (Subagent 4)
**Scope**: Create tooltip component and integrate

**Files** (new):
- `src/components/ui/Tooltip.tsx`

**Files** (modified):
- `src/components/sidebar/SessionItem.tsx`: Add session tooltips
- `src/components/sidebar/ProjectList.tsx`: Add workspace tooltips

**Tooltip features**:
- 500ms hover delay
- Smart positioning (viewport edge detection)
- Lazy loading for CLI session messages
- Caching to prevent refetch
- Keyboard accessible

**Deliverables**:
- ✅ Tooltip component created
- ✅ Session tooltips (last message preview)
- ✅ Workspace tooltips (last active session)
- ✅ Accessibility (ARIA, keyboard)

**Testing**:
- Tooltip positioning tests
- Lazy loading tests
- Cache behavior tests
- Keyboard navigation tests

---

### Phase 5: Collapse/Expand All (Subagent 5)
**Scope**: Add global button to collapse/expand everything

**Files**:
- `src/components/sidebar/CollapseAllButton.tsx` (new)
- `src/components/sidebar/SessionPanel.tsx`: Integrate button

**Button features**:
- Top of SessionPanel
- Smart label (Expand/Collapse based on state)
- Toggle ALL workspaces + ALL sections
- Keyboard accessible

**Deliverables**:
- ✅ CollapseAllButton component
- ✅ Integrated at top of SessionPanel
- ✅ collapseAll/expandAll actions work
- ✅ Smart labeling based on collapsed state

**Testing**:
- Button behavior tests
- State synchronization tests
- Keyboard interaction tests

---

### Phase 6: Integration & Auto-Switching (Subagent 6)
**Scope**: Wire up sections in SessionPanel, add auto-switch on workspace creation

**Files**:
- `src/components/sidebar/SessionPanel.tsx`: Integrate all sections
- `src/components/sidebar/ProjectList.tsx`: Embed HomeSessionsSection, add workspace creation handler
- Workspace creation flow: Add auto-switch logic

**Integration**:
- Render CollapseAllButton at top
- Render ProjectList with nested HomeSessionsSection
- Render SystemSessionsSection (global)
- Render UnassignedSessionsSection (global)
- Add auto-switch to workspace creation handler

**Deliverables**:
- ✅ All sections integrated
- ✅ Auto-switch on workspace creation
- ✅ Auto-load last session (already works)
- ✅ Visual hierarchy correct

**Testing**:
- Integration tests (full flow)
- Auto-switch tests (creation)
- Auto-load tests (existing behavior)
- Empty state tests

---

### Phase 7: Settings UI (Subagent 7)
**Scope**: Add metadata color scheme toggle to settings

**Files**:
- `src/components/panels/SettingsPanel.tsx` (or create if doesn't exist)
- `src/app/page.tsx`: Settings icon/button (if not present)

**Settings**:
- Section: "Appearance" or "Display"
- Label: "Metadata Color Scheme"
- Options: Radio buttons (Semantic / Gradient Spectrum)
- Preview: Example session showing both schemes

**Deliverables**:
- ✅ Settings panel with color scheme toggle
- ✅ Preview examples for both schemes
- ✅ Persists via Zustand
- ✅ Immediate re-render on change

**Testing**:
- Settings UI tests
- Persistence tests
- Re-render behavior tests

---

## Testing Strategy

### Unit Tests
- Store actions (isPinned, collapsedSections, metadataColorScheme)
- Date formatting utility
- Section components (rendering, props)
- Tooltip component (positioning, caching)
- CollapseAllButton behavior

### Integration Tests
- Full session organization flow
- Auto-switch on workspace creation
- Auto-load on workspace switch
- Collapse/expand all functionality
- Metadata color scheme toggle
- Tooltip lazy loading

### Visual Regression Tests
- Color tints (light/dark mode)
- Metadata colors (both schemes)
- Empty states
- Tooltip positioning
- Collapsed vs expanded states

### Accessibility Tests
- WCAG AA contrast ratios
- Keyboard navigation
- Screen reader announcements
- ARIA labels and roles
- Focus management

### Performance Tests
- Large session lists (100+ sessions)
- Rapid workspace switching
- Tooltip lazy loading
- Collapse/expand performance

## Success Criteria

- ✅ "🌴 groot" is pinned and cannot be deleted/archived
- ✅ Sessions organized into 🏠 Home, 🛠️ System, ❓ Unassigned sections
- ✅ Color tints (green/blue/orange) applied correctly
- ✅ Metadata shows ISO + relative dates with color coding
- ✅ Tooltips show last message preview and last active session
- ✅ Collapse/expand all button toggles everything
- ✅ Auto-switch to new workspaces on creation
- ✅ Auto-load last session on workspace switch (already working)
- ✅ User can toggle metadata color scheme (semantic/gradient)
- ✅ All accessibility requirements met (WCAG AA)
- ✅ No performance regressions (large session lists)

## Risks & Mitigations

**Risk**: Existing workspace switching logic breaks
- Mitigation: Preserve existing `handleWorkspaceClick` logic, add tests

**Risk**: Color tints fail accessibility standards
- Mitigation: Use WCAG AA contrast checker, test with screen readers

**Risk**: Tooltip lazy loading causes UI lag
- Mitigation: Implement caching, show loading state, timeout after 5s

**Risk**: Collapse/expand all with many sections is slow
- Mitigation: Batch state updates, use React 18 automatic batching

**Risk**: Migration fails for existing users
- Mitigation: Idempotency checks, rollback on error, log warnings

## Future Enhancements

- Drag-and-drop to reorder workspaces
- Custom emojis per workspace
- Section filtering (show only Home, hide System)
- Favorites section (⭐)
- Recent sessions section (🕒)
- Session tagging system
- Bulk session operations (move multiple sessions to workspace)

## References

- Existing workspace isolation implementation: `docs/plans/2026-02-27-workspace-isolation-design.md`
- Session discovery store: `src/lib/store/sessions.ts`
- Workspace store: `src/lib/store/workspaces.ts`
- Current ProjectList: `src/components/sidebar/ProjectList.tsx`
- Current SessionItem: `src/components/sidebar/SessionItem.tsx`
