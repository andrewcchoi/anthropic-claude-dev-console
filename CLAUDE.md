# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a DevContainer-based development environment for building a Next.js 16 web application that replicates Claude Code functionality. The project is in **active development** with core features implemented including SSE streaming chat, CLI subprocess integration, session management, and tool execution visualization. See `PLAN.md` for the complete architecture and implementation roadmap.

## Technology Stack

- **Runtime**: Node.js 20 + Python 3.12
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API routes (sessions managed by Claude CLI)
- **Services**: PostgreSQL 16, Redis 7 (via Docker Compose)
- **Package Managers**: npm (primary), pnpm, yarn, uv (Python)

## Development Environment

### Starting the Environment

Open in VS Code and use "Reopen in Container" to start the DevContainer. This brings up:
- App container (Node 20 + Python 3.12)
- PostgreSQL 16 on port 5432 (user: sandbox_user, db: sandbox_dev, password: devpassword)
- Redis 7 on port 6379

### Ports

| Port | Service |
|------|---------|
| 3000 | Frontend (Next.js) |
| 8000 | Backend API |
| 5432 | PostgreSQL |
| 6379 | Redis |

### Environment Variables

Set in `.env` or inherited from host:
- `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GITHUB_TOKEN` - inherited from host
- `NODE_OPTIONS=--max-old-space-size=4096` - Node.js memory limit

## Commands

```bash
# Once Next.js is initialized:
npm run dev              # Start development server

# Database
psql -h postgres -U sandbox_user -d sandbox_dev
redis-cli -h redis

# Python environment (auto-activated)
python --version         # Python 3.12
uv add <package>         # Add Python package

# Linting/Formatting
npx eslint .            # JavaScript/TypeScript linting
npx prettier --write .  # Format code
black .                 # Python formatting
ruff check .            # Python linting
```

## Architecture (Planned)

```
Browser → Next.js Frontend (React 19)
              ↓
         API Routes (Node.js)
         ├── Provider Layer (Anthropic/Bedrock/Vertex/Azure)
         ├── Tool Layer (File I/O, Bash, Git, MCP)
         └── SQLite (sessions, settings)
```

Key directories (to be created):
- `app/` - Next.js pages and API routes
- `components/` - React components (chat, sidebar, terminal, editor)
- `lib/providers/` - AI provider abstraction
- `lib/tools/` - Tool implementations (read, write, bash, git, etc.)
- `lib/db/` - SQLite database layer

## Security Considerations

From PLAN.md - critical risks to address during implementation:
- Path traversal: canonicalize paths, validate within workspace
- Command injection: command blocklist, timeouts, user isolation
- Credential exposure: encrypt at rest, sanitize logs
- XSS in markdown: DOMPurify sanitization

## Ultrathink Multi-Phase Agent Workflow

A comprehensive framework for complex implementation tasks with parallel agent orchestration, review gates, and recovery paths.

### Overview

The ultrathink workflow system provides three variants for different task types:

1. **Enhanced Hybrid** (default) - Most implementation tasks
2. **Adversarial Mode** - High-stakes, security-critical decisions
3. **Temporal Mode** - Exploratory design, uncertain requirements

### Quick Start

Invoke the appropriate skill:
- `/ultrathink` - Enhanced Hybrid (default)
- `/ultrathink-adversarial` - Adversarial mode
- `/ultrathink-temporal` - Temporal mode

Or use the Skill tool: `Skill(skill: "ultrathink")`

### Documentation

| Resource | Location | Purpose |
|----------|----------|---------|
| **Skills** | `.claude/skills/ultrathink*.md` | Full workflow specifications |
| **README** | `.claude/docs/ultrathink-README.md` | Getting started guide |
| **Examples** | `.claude/docs/ultrathink-examples.md` | Real-world usage examples |
| **Verification** | `.claude/docs/ultrathink-verification.md` | Test cases and validation |

### Quick Reference (Enhanced Hybrid)

```
┌─────────────────────────────────────────────────────────────────┐
│ ULTRATHINK: ENHANCED HYBRID                          ~450 tok  │
├─────────────────────────────────────────────────────────────────┤
│ || parallel  -> seq  [!] gate  ⊗/✓ fail/pass  @cp checkpoint   │
│ ?? conditional  INV invariant  DA devil's advocate             │
├─────────────────────────────────────────────────────────────────┤
│ INV-1: No 🔴 unresolved   INV-3: Unit || / Integ ->            │
│ INV-2: Fresh agents       INV-4: DA must oppose                 │
├─────────────────────────────────────────────────────────────────┤
│ A: @cp || Arch|Req|Conv|Risk|Dep|Wild || DA → [!] ⊗retry(2)    │
│ B??(c>3): @cp ×2 || Crit|Alt|Feas → [!] → Refine               │
│ C: @cp -> Finalize(groups,gates) → [!] ⊗->B                    │
│ D??(tests): @cp D1||write D2×4||crit D3:run D4:✓→E             │
│ E: per groups || indep → [!] → -> dep                          │
├─────────────────────────────────────────────────────────────────┤
│ ERROR: ABORT | @restore("post-plan")                           │
└─────────────────────────────────────────────────────────────────┘
```

### When to Use

```
Routine feature............... Enhanced Hybrid (/ultrathink)
High-stakes/irreversible...... Adversarial (/ultrathink-adversarial)
Security-critical............. Adversarial (/ultrathink-adversarial)
Exploratory/prototype......... Temporal (/ultrathink-temporal)
Novel problem................. Adversarial (/ultrathink-adversarial)
Iterative refinement.......... Temporal (/ultrathink-temporal)
Time-constrained.............. Enhanced Hybrid (/ultrathink)
Unknown complexity............ Enhanced Hybrid (/ultrathink)
```

### Context Management

**Stage Transitions:**
- **Before starting new stage**: Update Memory section with key learnings
- **Clear context**: Use `/clear` between stages
- **Read memory first**: Read CLAUDE.md to restore context

**At Barriers [!]:**
- Wait for all parallel agents to complete
- Update Memory section with agent outputs and findings
- Record parallel_groups structure (from stage C)

**Test Execution (Stage D):**
- **After each test run**: Clear context
- **Before clearing**: Record test results in Memory section
- **Keep tests isolated**: Fresh context per cycle
- **Log test gate results**: Document pass/fail

**Memory Updates:**
- Keep entries concise and actionable
- Include: stage completed, key decisions, blockers, files modified, test results
- Remove outdated entries

**Artifacts:**
- Store temporary work in `.claude/ultrathink-temp/{session}/`
- Auto-delete temp directory after successful completion

### Key Invariants

Must be enforced at every `[!]` gate:

- **INV-1**: No 🔴 CRITICAL unresolved (blocks gate)
- **INV-2**: Fresh agents each critique (NEW per iteration)
- **INV-3**: Unit || always, integration -> always (test order)
- **INV-4**: DA must oppose majority (cannot agree)

See `.claude/docs/ultrathink-README.md` for complete documentation.

## Pre-installed Tools

**Node.js**: typescript, ts-node, eslint, prettier, nodemon, mermaid-cli
**Python**: pytest, black, flake8, mypy, ipython, ruff, poetry
**CLI**: gh (GitHub CLI), git-delta, fzf, pgcli

## Architecture Decision Records (ADRs)

### Why CLI Subprocess Instead of SDK

The original plan was to use Anthropic's SDK directly. After extensive testing, we switched to CLI subprocess for these reasons:

1. **Permission system**: SDK has no built-in permission UI; CLI handles this
2. **Tool safety**: CLI implements command blocklists and security layers
3. **Stream format**: CLI outputs structured JSON via `--output-format stream-json`
4. **Session management**: CLI handles session persistence natively
5. **MCP support**: CLI integrates MCP servers automatically
6. **Reduced complexity**: No need to reimplement security features

**Trade-offs accepted:**
- Dependency on Claude CLI being installed
- Slightly higher latency (subprocess spawn)
- Less fine-grained control over API calls

### Why Two Terminal Components

Two terminal components exist for different purposes:
- **ReadOnlyTerminal**: Displays Bash tool output in chat - static, no WebSocket
- **InteractiveTerminal**: Full PTY shell at `/terminal` - WebSocket + xterm.js

This separation prevents complexity from mixing read-only display with interactive I/O.

### Slash Command Routing

Commands are routed in `ChatInput.tsx` via `src/lib/commands/router.ts`:

| Command Type | Handling | Examples |
|--------------|----------|----------|
| **Local** | Handled in UI | `/help`, `/clear`, `/status`, `/cost` |
| **Passthrough** | Sent to CLI | `/commit`, `/brainstorm`, skills, plugins |

**Why local commands?**
- Instant response (no network round-trip)
- Works even if CLI connection fails
- Better UX for UI-specific features

### Tool Output Visualization

Different tools are routed to appropriate viewers in `ToolExecution.tsx`:

| Tool | Viewer | Condition |
|------|--------|-----------|
| **Edit** | DiffViewer | Has old_string & new_string (shows side-by-side diff) |
| **Edit** | CodeViewer | String output only (shows final result) |
| **Read, Write** | CodeViewer | String output (syntax highlighted code) |
| **Bash** | ReadOnlyTerminal | String output (terminal with ANSI colors) |
| **Other** | JsonViewer | Fallback for structured data |

**DiffViewer Features:**
- Monaco DiffEditor for side-by-side comparison
- Automatic language detection from file path
- Theme support (auto, light, dark)
- "Copy New" button to copy new content
- Responsive: Monaco automatically switches between side-by-side and inline views based on container width
- Read-only (no editing in MVP)

**Pattern Reuse:**
- Dynamic import from CodeViewer (code splitting)
- Theme integration from MonacoViewer
- Language detection from fileUtils

**Implementation Note:**
The DiffViewer uses Monaco's built-in responsive behavior. On narrow screens, Monaco automatically switches from side-by-side to inline diff view. This is intentional Monaco behavior, not a bug. The component maintains `renderSideBySide: true` as a preference, but Monaco overrides this based on available width.

**Files:**
- `src/components/editor/DiffViewer.tsx` - Monaco DiffEditor wrapper
- `src/components/editor/MonacoViewer.tsx` - Single-file code viewer
- `src/components/editor/CodeViewer.tsx` - Dynamic import wrapper
- `src/components/chat/ToolExecution.tsx` - Tool routing logic

## Debugging Infrastructure

### Logging System (5 Components)

| Component | Location | Purpose |
|-----------|----------|---------|
| Client Logger | `src/lib/logger/index.ts` | Browser-side structured logging |
| Server Logger | `src/lib/logger/server.ts` | Server-side JSON logs with correlation IDs |
| Debug Mode | `src/lib/debug/index.ts` | Runtime debug toggle via console |
| Error Boundaries | `src/components/error/` | React error catching with fallback UI |
| Log Streaming | `src/app/api/logs/stream/` | SSE real-time log viewer |

**Quick Usage:**
```typescript
// Browser
import { createLogger } from '@/lib/logger';
const log = createLogger('MyComponent');
log.debug('message', { data });

// Server
import { createServerLogger } from '@/lib/logger/server';
const log = createServerLogger('MyModule', correlationId);

// Enable debug mode in browser console
enableDebug()   // or disableDebug(), toggleDebug()
```

**Environment Variables:**
- `LOG_LEVEL=debug|info|warn|error` - Filter log output
- `LOG_FORMAT=pretty|json` - Output format (pretty for dev, json for prod)

## Known Quirks & Gotchas

### Terminal Race Condition (Fixed)
**Problem:** ReadOnlyTerminal could show blank output if content arrived before xterm.js initialized.
**Solution:** Two-effect pattern in ReadOnlyTerminal.tsx - Effect 1 initializes and writes synchronously after `xterm.open()`, Effect 2 handles incremental updates.
**Files:** `src/components/terminal/ReadOnlyTerminal.tsx` (L39-137)

### React Strict Mode WebSocket (Fixed)
**Problem:** Strict Mode double-mounting caused WebSocket race conditions in InteractiveTerminal, leading to duplicate connections and duplicate initial command execution.
**Root Cause:** React Strict Mode mounts → unmounts → remounts components. Both the first mount and remount would schedule connection attempts via `setTimeout(0)`, causing duplicates.
**Solution:** Added persistent `hasInitiatedConnectionRef` useRef to track connection initiation across mount cycles. Once set to true on first connection attempt, prevents any subsequent attempts even after unmount/remount.
**Known Limitation:** Ref never resets, blocking reconnection after intentional disconnect and remount. Acceptable for current use case (dedicated /terminal page).
**Files:** `src/components/terminal/InteractiveTerminal.tsx` (hasInitiatedConnectionRef guard), `src/hooks/useTerminal.ts` (isMountedRef cleanup)

### Monaco Error Suppression
**Problem:** Monaco Editor throws objects (not Error instances), causing `[object Object]` in console.
**Solution:** Inline `<head>` script with capture phase listener in `src/app/layout.tsx`.
**Docs:** `docs/troubleshooting/MONACO_ERROR_SUPPRESSION.md`

### CLI Telemetry Noise
**Problem:** Claude CLI outputs telemetry data mixed with message stream.
**Solution:** Filter telemetry by detecting `---\ncli: ` prefix pattern.
**Files:** `src/hooks/useClaudeChat.ts`

### Session ID Conflicts
**Problem:** "Session ID already in use" when switching chats rapidly.
**Solution:** Don't persist transient IDs; use atomic session switching in Zustand store.
**Docs:** `docs/troubleshooting/TROUBLESHOOTING_GUIDE.md` (Problem 4, 6, 7)

### Workspace Auto-Expand (Fixed)
**Problem:** Clicking to collapse "Current Workspace" in sidebar caused it to immediately re-expand, making it impossible to keep collapsed.
**Root Cause:** A `useEffect` in `ProjectList.tsx` auto-expanded workspace whenever `expandedProjects` changed. User click → remove from set → effect detects change → re-adds to set → bounces back.
**Solution:** Moved collapse state from local component state to Zustand store (`collapsedProjects: Set<string>`). Removed auto-expand `useEffect`. Inverted logic to track collapsed projects instead of expanded projects.
**Why Zustand:** Persists across sidebar unmount/remount and page refreshes via localStorage. Follows existing `hiddenSessionIds` pattern in codebase.
**Key Decision:** User explicitly requested persistence across sidebar lifecycle (not just within mount), ruling out `useRef` solution.
**Files:** `src/lib/store/index.ts` (collapsedProjects state + toggleProjectCollapse action), `src/components/sidebar/ProjectList.tsx` (removed local state + useEffect)
**Commit:** c88f727

### Dark Mode Visibility
**Problem:** Interactive elements (hover states, borders) have insufficient contrast in dark mode.
**Solution:** Use 2+ step jumps in Tailwind gray scale for hover states (gray-600 on gray-800, not gray-700). Add thicker borders (border-2) and subtle glow effects for containers. Include focus rings for accessibility.
**Pattern:** For dark backgrounds (gray-800/900), use gray-600 for hovers, gray-500 for borders.
**Docs:** `docs/troubleshooting/DARK_MODE_STYLING.md`

## Testing & Verification

```bash
# Type checking
npx tsc --noEmit

# Build verification
npm run build

# Terminal server health
curl http://localhost:3001/health

# Backend connectivity tests
npm run test:connectivity

# View real-time logs
# 1. In browser console: enableDebug()
# 2. Navigate to http://localhost:3000/logs
```

## Actual Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/claude/         # SSE streaming endpoint
│   ├── api/sessions/       # Session discovery and message retrieval
│   ├── api/logs/stream/    # Log streaming SSE
│   ├── terminal/           # Interactive terminal page
│   └── logs/               # Log viewer page
├── components/
│   ├── chat/               # ChatInput, MessageList, ToolExecution
│   ├── terminal/           # ReadOnlyTerminal, InteractiveTerminal
│   ├── editor/             # DiffViewer, MonacoViewer, CodeViewer
│   ├── sidebar/            # Sidebar, SessionList
│   ├── panels/             # HelpPanel, StatusPanel
│   └── error/              # ErrorBoundary, TerminalErrorBoundary
├── hooks/
│   ├── useClaudeChat.ts    # Main chat hook (SSE, CLI subprocess)
│   └── useTerminal.ts      # Interactive terminal hook
├── lib/
│   ├── commands/router.ts  # Slash command routing
│   ├── logger/             # Structured logging
│   ├── debug/              # Debug mode utilities
│   ├── store/              # Zustand state management
│   └── terminal/           # WebSocket client, PTY manager
└── types/
    └── claude.ts           # SDKMessage, ToolUse interfaces
```

## Memory

<!-- This section is updated during multi-agent execution to persist context across clears -->

### Current State
- Project phase: **Active Development**
- Core functionality implemented: chat interface, SSE streaming, CLI subprocess integration, session management, tool execution visualization (DiffViewer for Edit, CodeViewer for Read/Write, ReadOnlyTerminal for Bash), file attachment system with clipboard paste
- Recent additions: Clipboard paste support for images/files, Monaco DiffEditor for Edit tool changes, Write tool syntax highlighting, Terminal Strict Mode fix, Middleware to Proxy migration
- See PLAN.md for detailed implementation status

### Key Decisions
- Uses Tailwind CSS v4 with `@import "tailwindcss"` syntax
- Zustand for client-side state management
- CLI integration spawns `claude -p --verbose --output-format stream-json`

#### Terminal Components
Two distinct terminal components serve different purposes:

| Component | Purpose | Reference As | Location |
|-----------|---------|--------------|----------|
| **ReadOnlyTerminal** | Display Bash tool output in chat messages | "Chat Output Terminal" or "ReadOnlyTerminal" | `src/components/terminal/ReadOnlyTerminal.tsx` |
| **InteractiveTerminal** | Full interactive shell at `/terminal` page | "Standalone Terminal" or "InteractiveTerminal" | `src/components/terminal/InteractiveTerminal.tsx` |

**Key Differences:**
- ReadOnlyTerminal: Static content prop, no WebSocket, used in chat UI
- InteractiveTerminal: WebSocket-connected PTY, bidirectional I/O, standalone page

**When debugging:**
- "Chat output not showing" → ReadOnlyTerminal issue
- "/terminal page blank" or "WebSocket issues" → InteractiveTerminal issue
- Always specify which component when reporting terminal bugs

### Learnings
<!-- Updated during multi-agent execution -->

#### CommandPalette Deduplication & CLI Initialization Fix (2026-02-22)
- **Problem 1**: ~130 React duplicate key warnings when opening CommandPalette
  * Root cause: CLI returns commands in both `skills` and `slash_commands` arrays (all skills are also valid slash commands)
  * CommandPalette combined three sources without deduplication: LOCAL_COMMAND_INFO, availableSkills, availableCommands
  * Both skills and commands get `/` prefix added, creating duplicate keys like `/commit`, `/debug`, etc.
- **Problem 2**: CommandPalette showed only 12 local commands, missing all skills/CLI commands
  * Root cause: `availableSkills` and `availableCommands` were empty arrays
  * CLI prewarm only ran when creating NEW chat (SessionPanel.tsx:48), not when loading existing sessions
  * When switching to existing session, only messages/tool executions loaded - skills/commands never restored
  * Skills and commands are **global to CLI** (not session-specific), should be loaded once on app startup
- **Solution 1 - Deduplication**: Added filter to remove duplicate commands with priority order
  * Priority: Local commands (highest) → Skills (middle) → CLI commands (lowest)
  * Filter keeps first occurrence: `uniqueCommands.filter((cmd, index, self) => index === self.findIndex(c => c.command === cmd.command))`
  * Added debug logging to track deduplication (shows counts, duplicates removed, samples)
- **Solution 2 - App-Level Initialization**: Added CLI prewarm on app mount
  * Added useEffect in `src/app/page.tsx` that runs once on mount
  * Uses existing sessionId if available, otherwise generates temporary session with valid UUID (`uuidv4()`)
  * Checks if skills/commands already loaded to avoid duplicate initialization
  * Uses hasInitialized ref to ensure one-time execution
  * **Important**: CLI requires pure UUID format - prefixes like `init-${uuid}` are rejected
- **Files Modified**:
  * `src/components/chat/CommandPalette.tsx` - Added deduplication logic, debug logging with createLogger
  * `src/app/page.tsx` - Added app-level CLI initialization on mount
- **Key Insights**:
  * Skills appearing in both arrays is expected behavior (all skills are slash commands)
  * Global CLI metadata (skills, commands, tools) should load on app startup, not per-session
  * Session switching should only load session-specific data (messages, tool executions, usage)
  * When debugging React warnings, enable debug mode first to see actual data flow
- **Verification Steps**:
  1. Refresh browser with existing session loaded
  2. Enable debug mode: `enableDebug()` in console
  3. Type `/` to open CommandPalette
  4. Check logs: should show skills/commands loaded, duplicates removed, no React warnings
  5. Verify command count matches expected total (local + skills + commands - duplicates)
- **Key Lesson**: Distinguish between **session-specific state** (messages, executions) and **global CLI state** (skills, commands, tools). Global state should initialize once on app load, not per-session. Deduplication is necessary when CLI returns overlapping data structures.

#### Dark Mode Visibility Improvements (2026-02-05)
- Implemented CSS-only improvements for dark mode UI visibility
- **Terminal borders**: Changed from `border dark:border-gray-600` to `border-2 dark:border-gray-500` with subtle glow effect `dark:shadow-[0_0_0_1px_rgba(107,114,128,0.3)]` for better visibility against dark terminal background (#1f2937)
- **Interactive hover states**: Updated all dark mode hover states from `dark:hover:bg-gray-700` to `dark:hover:bg-gray-600` for more visible contrast (minimum 2-step jump in Tailwind gray scale recommended)
- **Selector enhancements**: Added border highlights on hover, focus rings for accessibility, and active state indicators with left border accents
- **Pattern established**: For dark mode UI elements on gray-800/900 backgrounds, use gray-600 for hover states and gray-500/gray-400 for borders to ensure sufficient contrast
- **Permission Mode Selector Fix (Round 2)**: Improved active/selected item visibility in dropdown
  * Container: `dark:bg-gray-800` → `dark:bg-gray-900`, `dark:border-gray-700` → `dark:border-gray-600` (darker container for better item contrast)
  * Active state light: `bg-blue-50` → `bg-blue-100` (stronger highlight)
  * Active state dark: `dark:bg-blue-900/30` → `dark:bg-blue-600/40` (brighter blue, more opacity)
  * Hover state dark: `dark:hover:bg-gray-600` → `dark:hover:bg-gray-700` (adjusted for darker container)
  * **Key insight**: Active states need strong contrast - pale blues (`bg-blue-50`, `dark:bg-blue-900/30`) are too subtle; use `bg-blue-100` and `dark:bg-blue-600/40` for clear visibility
- **Terminal Background Transparency Fix**: Resolved terminal appearing invisible in dark mode
  * Issue: Terminal background (gray-800) matched ToolExecution container (gray-800), causing them to blend
  * Solution: Darkened container to gray-900, kept terminal at gray-800 to match input box
  * Added explicit `backgroundColor` to both outer and inner terminal divs
  * Result: Terminal now has clear visual separation while maintaining consistency with input box styling
  * Color hierarchy: Container (gray-900) → Terminal (gray-800) → Content (gray-200 text)
- Files modified:
  * `src/components/terminal/ReadOnlyTerminal.tsx` - Terminal border visibility, explicit background colors
  * `src/components/terminal/TerminalTheme.ts` - Terminal background colors to match input box
  * `src/components/chat/ToolExecution.tsx` - Container background darkened to gray-900
  * `src/components/ui/DefaultModeSelector.tsx` - Permission selector hover states
  * `src/components/chat/ChatInput.tsx` - Mode button, dropdown hover states, and active item highlights
  * `docs/troubleshooting/DARK_MODE_STYLING.md` - Updated Issue 3 with improved patterns, added Issue 2b for terminal transparency
- **Accessibility**: All interactive elements now have focus rings (`focus:ring-2 focus:ring-blue-500/50`) and proper border transitions
- **Lesson**: When implementing dark mode, test with actual background colors - gray-700 on gray-800 provides insufficient contrast for interactive feedback. Active/selected states need even stronger contrast than hover states - don't be afraid to use bright colors with higher opacity.

#### Workspace Auto-Expand Fix (2026-02-21)
- **Problem**: Clicking to collapse "Current Workspace" in sidebar caused immediate re-expand, making collapse impossible
- **Root Cause**: `useEffect` in `ProjectList.tsx` (L54-61) auto-expanded workspace whenever `expandedProjects` state changed
  * User click → `toggleProject()` removes workspace from `expandedProjects`
  * State change triggers `useEffect`
  * Condition `!expandedProjects.has(workspaceId)` now true
  * Effect re-adds workspace → appears to "bounce back"
- **Solution**: Moved state from local component to Zustand store with localStorage persistence
  * Added `collapsedProjects: Set<string>` to ChatStore (inverted logic: track collapsed instead of expanded)
  * Added `toggleProjectCollapse(projectId)` action
  * Removed problematic `useEffect` entirely
  * Removed local `useState` and `expandedProjects` state
- **Why Zustand over useRef**: User explicitly requested persistence across sidebar unmount/remount and page refreshes
- **Implementation Pattern**: Follows existing `hiddenSessionIds` pattern
  * Store Set as Array in `partialize` for JSON serialization
  * Convert Array back to Set in `onRehydrateStorage`
  * State persists in localStorage via Zustand persist middleware
- **Alternatives Considered**:
  1. useRef - simpler but resets on unmount (rejected)
  2. **Zustand store (selected)** - persists across lifecycle and refreshes
  3. localStorage directly - duplicates existing pattern (rejected)
  4. Remove from deps - requires lint suppression (rejected)
- **Edge Cases Handled**:
  * Normal collapse/expand: ✅ Works, state in Zustand
  * Page refresh: ✅ State persists via localStorage
  * Sidebar unmount/remount: ✅ State persists in Zustand
  * Sessions appear after load: ✅ No auto-expand (user controls state)
  * Clear browser storage: Resets to default (expanded) - acceptable
- **Files Modified**:
  * `src/lib/store/index.ts` - Added collapsedProjects state, toggleProjectCollapse action, persistence
  * `src/components/sidebar/ProjectList.tsx` - Removed local state/useEffect, use store state/action
- **Commit**: c88f727
- **Key Lesson**: When state needs to fight against reactive effects, the effect is usually wrong. Move state to proper layer (global store) instead of trying to fix effect dependencies. Auto-expand behaviors should respect user actions, not override them.

#### DiffViewer Implementation (2026-02-21)
- **Feature**: Monaco DiffEditor for Edit tool changes, showing old_string vs new_string side-by-side
- **Implementation Approach**: Reused existing patterns to minimize development time
  * Dynamic import pattern from CodeViewer (code splitting)
  * Theme integration from MonacoViewer (claude-dark/claude-light)
  * Language detection from fileUtils
  * Monaco DiffEditor handles lifecycle internally (no manual dimension checks needed)
- **Key Decisions**:
  * MVP scope: Read-only, side-by-side only, no navigation controls, no error boundary (can add later)
  * Routing in ToolExecution.tsx: Edit tool with old_string/new_string → DiffViewer, Edit with only output → CodeViewer (final result)
  * Also added Write tool to CodeViewer routing (was previously only Read and Edit)
- **Challenges & Solutions**:
  1. **Height calculation**: Initial implementation used h-full class which collapsed to 0 when parent had no explicit height
     * Solution: Use explicit pixel height style + min-h-0 for proper flex child shrinking
  2. **Monaco disposal error**: "TextModel got disposed before DiffEditorWidget model got reset" during React Strict Mode
     * Solution: Added isMountedRef guard and cleanup effect with safe disposal handling
  3. **Width overflow**: Tool bubbles overflowed viewport when developer panel open
     * Solution: Added min-w-0 throughout flex chain from root to Monaco editors to allow proper shrinking
- **Responsive Behavior**: Monaco automatically switches between side-by-side and inline diff views based on container width (built-in feature, not a bug)
- **Files Created**:
  * `src/components/editor/DiffViewer.tsx` - Monaco DiffEditor wrapper (204 lines)
  * `src/components/editor/DiffViewerSkeleton.tsx` - Loading skeleton (16 lines)
- **Files Modified**:
  * `src/components/chat/ToolExecution.tsx` - Tool routing logic
  * `src/app/page.tsx` - Added min-w-0 to layout flex containers
  * `src/components/files/FilePreviewPane.tsx`, `src/components/chat/MessageList.tsx` - Added min-w-0 for flex chain
- **PRs**: #8 (Write tool to CodeViewer), #5 (DiffViewer), #34 (Responsive layout fixes)
- **Key Lesson**: Monaco DiffEditor is much simpler than xterm.js - just pass props and it renders. Pattern reuse accelerated implementation (estimated 5-7 hours, actual ~2 hours). Flexbox children need min-w-0 to prevent overflow (default min-width: auto prevents shrinking below content size).

#### Clipboard Paste Support (2026-02-22)
- **Feature**: Full clipboard paste support for images and files in chat textarea
- **Implementation**: Multi-iteration refinement through Ralph Loop critical review process
  * Iteration 1-2: Fixed browser compatibility, file filtering, disabled state, extension fallbacks, error messaging
  * Iteration 3: Fixed image counting for extension fallback, excluded SVG for security, added modern formats (HEIC/AVIF)
  * Iteration 4: Updated IMAGE_EXTENSIONS constant, fixed preview generation for empty MIME types, avoided duplicate code
- **Key Decisions**:
  * Check both `clipboardData.items` (Chrome/Firefox) and `clipboardData.files` (Safari) for cross-browser support
  * Exclude `image/svg+xml` to prevent XSS from embedded scripts
  * Extension fallback: check file extension when MIME type is empty (some browsers)
  * Reuse existing `IMAGE_EXTENSIONS` constant from `src/types/upload.ts` instead of duplicating
  * Unified error handling: use toast notifications instead of alerts
- **Files Modified**:
  * `src/types/upload.ts` - Added HEIC and AVIF to IMAGE_EXTENSIONS
  * `src/hooks/useFileUpload.ts` - Fixed generatePreview() to check both MIME type and extension
  * `src/components/chat/ChatInput.tsx` - Added handlePaste(), updated error handling to use toast
- **Security**: SVG files blocked (can contain `<script>` tags), MIME type validation, file size/count limits enforced
- **UX Features**:
  * Toast notifications show image count or file count
  * Rejection count displayed when some files are skipped
  * Paste disabled during streaming (respects disabled prop)
  * Text paste continues to work normally (only prevents default for file paste)
- **Cross-browser**: Tested pattern handles Chrome, Firefox, Safari differences in ClipboardEvent API
- **Modern formats**: Added HEIC (iPhone photos) and AVIF (modern web format) support
- **Pattern Consistency**: Image detection logic matches useFileUpload hook's isImageFile() implementation
- **Key Lesson**: Browser clipboard APIs vary significantly - always check both DataTransferItemList and FileList. Empty MIME types are common, so extension fallback is critical. Security first: always validate and sanitize file types, especially for formats like SVG that can execute code.

#### Ultrathink Workflow System (2026-02-03)
- Implemented comprehensive multi-phase agent workflow framework
- Three variants: Enhanced Hybrid (default), Adversarial (high-stakes), Temporal (exploratory)
- Files created:
  * `.claude/skills/ultrathink.md` - Enhanced Hybrid workflow (~450 tokens)
  * `.claude/skills/ultrathink-adversarial.md` - Adversarial mode (~400 tokens)
  * `.claude/skills/ultrathink-temporal.md` - Temporal mode (~450 tokens)
  * `.claude/docs/ultrathink-README.md` - Getting started guide
  * `.claude/docs/ultrathink-examples.md` - Real-world usage examples
  * `.claude/docs/ultrathink-verification.md` - Test cases and validation
- Key features:
  * Parallel agent orchestration (single message, multiple Task calls)
  * Review gates at every barrier (Parse→Structure→Refs→Logic→Consist→Clarity)
  * Recovery paths (retry, restore checkpoints, abort with diagnostic)
  * Invariant enforcement (INV-1: no critical unresolved, INV-2: fresh agents, INV-3: test order, INV-4: DA oppose)
  * Devil's Advocate agent (forced opposition to prevent groupthink)
  * Conditional stages (skip based on complexity/need)
- Adversarial mode adds: CRED betting, debate structure (THESIS/ANTITHESIS/SYNTHESIS), veto system
- Temporal mode adds: Checkpoints, retroactive edits, speculative execution, prophecy (peek ahead)
- Token costs: Enhanced Hybrid ~450-600, Adversarial ~700-1000, Temporal ~900-9000 (variable)
- Integration: Skills invocable via `/ultrathink`, `/ultrathink-adversarial`, `/ultrathink-temporal`

### Blockers
- None

### Next Steps
- Use ultrathink workflows for complex implementation tasks
- Verify system with test cases from `.claude/docs/ultrathink-verification.md`
- See PLAN.md for general implementation roadmap
