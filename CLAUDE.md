# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⛔ MANDATORY PROCEDURES - DO NOT SKIP

These procedures are **NON-NEGOTIABLE**. Every violation wastes hours of debugging time.

### Before ANY Code Changes

1. **Verify Build Passes**
   ```bash
   npm run build
   ```
   If this fails, FIX IT before doing anything else. Do not proceed with broken builds.

2. **Trace Component Before Editing**
   ```bash
   ./scripts/trace-component.sh ComponentName
   ```
   Verify the component is actually used in production, not just tests.

3. **Add Verification Log First**
   Before making real changes, add a `console.log('🔥 ComponentName loaded')` and verify it appears in browser. Only then make actual changes.

### After ANY Code Changes

4. **Verify Build Still Passes**
   ```bash
   npm run build
   ```
   If you broke the build, fix it immediately.

5. **Verify in Browser**
   - Check browser console for errors
   - Verify your changes are actually visible/working
   - Remove debug logs before committing

### Type Mismatches to Watch For

⚠️ **UUID vs Encoded Path** - This bug has bitten us multiple times:
- Workspace IDs are UUIDs: `316ab1b9-b102-4a78-8bf6-453d4a69870c`
- CLI project IDs are encoded paths: `-workspace-docs`
- **NEVER compare them directly**
- Use `encodeProjectPath()` or `getProjectIdFromWorkspace()` to convert

### Pre-Commit Verification

The pre-commit hook will block commits that:
- Fail TypeScript compilation
- Fail call-site audits
- Fail related tests

If the hook blocks you, **do not bypass it**. Fix the issues.

### Reliability Self-Check (MANDATORY)

**Before finalizing ANY plan or implementation, ask: "Is this a reliable process?"**

This is a **hard gate** - do not proceed until independent evaluation passes.

#### Why Subagents?

Self-evaluation is fundamentally flawed (grading your own exam). Subagents provide:
- Fresh context without attachment to the code
- Can be given explicit adversarial instructions
- Creates audit trail of evaluation
- Forces articulation of what to evaluate

#### The Process

**Step 1: Classify complexity** (determines evaluation depth)

| Complexity | Lines Changed | Subagents Required |
|------------|---------------|-------------------|
| Trivial | <10 lines, no logic | 0 - Self-check only |
| Small | 10-50 lines | 1 - Quick review |
| Medium | 50-200 lines | 2 - Code + Testing |
| Large | >200 lines | 3+ parallel specialists |

**Step 2: State intended outcome**

Write down (literally, in a comment or doc):
- What should be true when done?
- What are the acceptance criteria?
- How will success be verified?

**Step 3: Spawn evaluation subagent(s)**

For Small+ changes, spawn subagent with this template:

```
You are an INDEPENDENT EVALUATOR. Your job is to find problems, not validate.

Task: Evaluate [description] for reliability gaps.
Files changed: [list files]
Intended outcome: [from step 2]

IMPORTANT: Use devil's advocate perspective. Actively look for:
- What could go wrong?
- What's missing?
- What assumptions are untested?

Evaluate these dimensions (score 1-10, list gaps):
1. Complete - All requirements have implementation?
2. Accurate - Matches intent, not just syntax?
3. Robust - Error cases, edge cases handled?
4. Maintainable - Follows patterns, has logging?
5. Secure - Input validation, no injection, auth checked?
6. Testable - Can be verified? Tests written?
7. **Verified** - Actually tested with evidence? (screenshot, test output, etc.)

Output format:
- Dimension scores with justification
- CRITICAL gaps (must fix)
- MEDIUM gaps (should fix)
- LOW gaps (nice to have)
- Overall confidence (0-100%)
- Recommendation: PASS / NEEDS WORK / FAIL
```

**Step 4: Address CRITICAL gaps**

- CRITICAL gaps block proceeding
- MEDIUM gaps require documented rationale if deferred
- LOW gaps can be tracked in TODO comments

**Step 5: Re-evaluate if needed**

If confidence <70% or NEEDS WORK, fix and re-spawn subagent (fresh context).

#### Avoiding Infinite Loops

| Safeguard | Rule |
|-----------|------|
| Max iterations | 3 evaluation cycles per task |
| Confidence floor | Accept at 70%+ with no CRITICAL gaps |
| Diminishing returns | If score doesn't improve after fix, escalate to user |
| Time-box by complexity | Trivial: 2min, Small: 10min, Medium: 20min, Large: 30min |
| Escalation | After max iterations, present gaps to user for decision |

#### Definition of "Acceptable"

**Minimum bar (must have all):**
- [ ] Confidence ≥70% from independent subagent
- [ ] Zero CRITICAL gaps
- [ ] MEDIUM gaps documented with deferral rationale
- [ ] Build passes
- [ ] "Verified" dimension has concrete evidence (not just "I looked at it")

**"Verified" requires ONE of:**
- Test output showing pass (paste actual output)
- Screenshot of working feature
- curl/API response demonstrating behavior
- Console log showing expected flow

**Gap Severity:**
- **CRITICAL**: Blocks release - security, data loss, crashes, broken core functionality
- **MEDIUM**: Should fix - performance issues, missing edge cases, poor UX
- **LOW**: Nice to have - style, optimization, future-proofing

#### Specialized Subagents by Area

Use existing specialized agents when available:

| Area | Subagent Type | When to Use |
|------|---------------|-------------|
| Code quality | `pr-review-toolkit:code-reviewer` | Any code changes |
| Type design | `pr-review-toolkit:type-design-analyzer` | New types/interfaces |
| Silent failures | `pr-review-toolkit:silent-failure-hunter` | Error handling changes |
| Test coverage | `pr-review-toolkit:pr-test-analyzer` | After writing tests |
| Security | Custom prompt with security focus | Auth, input handling, API |

### Logging Requirements

**All new components, hooks, and utilities MUST include logging.** The pre-commit hook (Gate 6) will warn about missing logging.

```typescript
// Required pattern for ALL new files:
import { createLogger } from '@/lib/logger';
const log = createLogger('ModuleName');

// Use throughout the code:
log.debug('Descriptive message', { relevantData });  // Development debugging
log.info('Important event', { details });             // Normal operation
log.warn('Potential issue', { context });             // Warnings
log.error('Error occurred', { error, context });      // Errors
```

**What to log:**
- Component renders with key props
- State changes and transitions
- API calls (request, success, failure)
- User actions
- Error conditions with full context

**Templates available:**
```bash
./scripts/create-component.sh MyComponent          # New component
./scripts/create-component.sh MyComponent sidebar  # In subdirectory
./scripts/create-hook.sh useMyHook                 # New hook
```

**Exporting logs for debugging:**
1. Reproduce the issue (info/warn/error logs are always saved)
2. For verbose debug logs: `enableDebug()` in browser console first
3. Export logs: `downloadLogs()` (recommended) or `exportLogs()` (clipboard)
4. Share the JSONL file for analysis

**Note**: `exportLogs()` may fail from dev console due to focus requirements. Use `downloadLogs()` instead.

### Skills and Processes

Skills like ultrathink, brainstorming, TDD are **not optional decorations**. They exist because skipping them causes exactly the bugs we've experienced. When a skill applies, USE IT.

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
| 3001 | Terminal WebSocket Server |
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

## Architecture

```
Browser → Next.js Frontend (React 19)
              ↓
         API Routes (Node.js)
         ├── Claude CLI Subprocess (spawn + stream-json)
         ├── Tool Execution (Read, Write, Bash, Edit, etc.)
         └── Session Management (persisted by CLI)
```

Key directories:
- `app/` - Next.js pages and API routes (chat, terminal, logs)
- `components/` - React components (chat, sidebar, terminal, editor, files)
- `hooks/` - React hooks (useClaudeChat, useTerminal, useFileUpload)
- `lib/` - Utilities (logger, store, commands, terminal, utils)
- `types/` - TypeScript type definitions

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed architecture documentation.

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

### Middleware to Proxy Migration

**Decision**: Migrated from Next.js middleware to standalone proxy server for terminal WebSocket.

**Context**: Initial design used Next.js middleware to proxy WebSocket connections from frontend to terminal PTY server. This approach had several issues:
1. Next.js middleware cannot handle WebSocket upgrade requests (HTTP → WebSocket)
2. Middleware runs on every request (performance overhead)
3. Limited control over WebSocket lifecycle management

**Solution**: Standalone Express server on port 3001 with `http-proxy-middleware`

**Implementation**:
- `src/proxy.ts` - Express server with WebSocket proxy
- Proxies `/terminal` WebSocket connections to PTY manager
- Full control over connection lifecycle, error handling, and cleanup
- Runs independently of Next.js server

**Trade-offs Accepted**:
- Additional server process (port 3001)
- Slightly more complex deployment (two servers)

**Benefits**:
- WebSocket upgrade support
- No middleware overhead on regular HTTP requests
- Better error handling and logging
- Clear separation of concerns

**Reference**: `docs/plans/2026-02-21-middleware-to-proxy-design.md`

## Debugging Infrastructure

### Logging System (6 Components)

| Component | Location | Purpose |
|-----------|----------|---------|
| Client Logger | `src/lib/logger/index.ts` | Browser-side structured logging |
| Server Logger | `src/lib/logger/server.ts` | Server-side JSON logs with correlation IDs |
| Debug Mode | `src/lib/debug/index.ts` | Runtime debug toggle + global error capture |
| File Logger | `src/lib/logger/file-logger.ts` | IndexedDB storage for log export |
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
├── app/                           # Next.js App Router pages
│   ├── api/                       # API routes
│   │   ├── claude/                # Chat endpoints
│   │   │   ├── route.ts           # SSE streaming (main chat)
│   │   │   └── init/route.ts      # CLI prewarm (skills/commands)
│   │   ├── sessions/              # Session management
│   │   │   ├── discover/route.ts  # List all sessions
│   │   │   └── [id]/messages/route.ts  # Load session messages
│   │   ├── files/                 # File operations
│   │   │   ├── route.ts           # List workspace files
│   │   │   ├── git-status/route.ts  # Git status
│   │   │   └── [...path]/route.ts  # Read file content
│   │   ├── upload/route.ts        # File upload
│   │   ├── uploads/               # Upload serving
│   │   │   ├── serve/route.ts     # Serve uploaded files
│   │   │   └── cleanup/route.ts   # Delete old uploads
│   │   ├── settings/route.ts      # Settings storage
│   │   ├── logs/stream/route.ts   # Log streaming (SSE)
│   │   └── debug/route.ts         # Debug utilities
│   ├── terminal/page.tsx          # Interactive terminal
│   ├── logs/page.tsx              # Log viewer
│   ├── preview/page.tsx           # File preview
│   ├── page.tsx                   # Main chat interface
│   ├── layout.tsx                 # Root layout
│   ├── error.tsx                  # Error page
│   └── globals.css                # Global styles
├── components/                    # React components (59 files)
│   ├── chat/                      # Chat UI (8 files)
│   │   ├── ChatInput.tsx          # Message input with attachments
│   │   ├── MessageList.tsx        # Message display
│   │   ├── MessageContent.tsx     # Markdown rendering
│   │   ├── ToolExecution.tsx      # Tool output routing
│   │   ├── CommandPalette.tsx     # Command search
│   │   ├── AttachmentPreview.tsx  # File attachment preview
│   │   ├── ImageThumbnail.tsx     # Image thumbnails
│   │   └── SystemMessage.tsx      # System messages
│   ├── editor/                    # Code viewers (6 files)
│   │   ├── DiffViewer.tsx         # Monaco DiffEditor (Edit tool)
│   │   ├── MonacoViewer.tsx       # Monaco single-file viewer
│   │   ├── CodeViewer.tsx         # Syntax-highlighted code (Read/Write)
│   │   ├── EditorSkeleton.tsx     # Loading skeleton
│   │   ├── DiffViewerSkeleton.tsx # Diff loading skeleton
│   │   └── EditorErrorBoundary.tsx # Editor error boundary
│   ├── files/                     # File browser (6 files)
│   │   ├── FileTree.tsx           # Tree view
│   │   ├── FileTreeItem.tsx       # Tree item
│   │   ├── FileTreeToolbar.tsx    # Toolbar (refresh, search)
│   │   ├── FilePreviewPane.tsx    # File preview
│   │   ├── FileContextMenu.tsx    # Right-click menu
│   │   └── types.ts               # File types
│   ├── panels/                    # UI panels (6 files)
│   │   ├── HelpPanel.tsx          # Help panel (/help)
│   │   ├── StatusPanel.tsx        # Status panel (/status)
│   │   ├── ModelPanel.tsx         # Model selection (/model)
│   │   ├── TodosPanel.tsx         # Todos panel (/todos)
│   │   ├── RenameDialog.tsx       # Rename dialog (/rename)
│   │   └── index.ts               # Barrel export
│   ├── sidebar/                   # Session sidebar (9 files)
│   │   ├── Sidebar.tsx            # Main sidebar
│   │   ├── SessionList.tsx        # Session list
│   │   ├── SessionItem.tsx        # Session item
│   │   ├── UISessionItem.tsx      # UI session item
│   │   ├── SessionPanel.tsx       # Session panel
│   │   ├── SessionSearch.tsx      # Session search
│   │   ├── ProjectList.tsx        # Project grouping
│   │   ├── RefreshButton.tsx      # Refresh button
│   │   └── RightPanel.tsx         # Right panel (file browser)
│   ├── terminal/                  # Terminal components (5 files)
│   │   ├── ReadOnlyTerminal.tsx   # Bash tool output (chat)
│   │   ├── InteractiveTerminal.tsx # Full PTY shell (/terminal)
│   │   ├── Terminal.tsx           # Base terminal
│   │   ├── TerminalTheme.ts       # xterm.js themes
│   │   └── index.ts               # Barrel export
│   ├── ui/                        # Reusable UI (9 files)
│   │   ├── button.tsx             # Button component
│   │   ├── JsonViewer.tsx         # JSON display
│   │   ├── ThemeToggle.tsx        # Theme switcher
│   │   ├── ToastContainer.tsx     # Toast notifications
│   │   ├── ModelSelector.tsx      # Model selector
│   │   ├── ProviderSelector.tsx   # Provider selector
│   │   ├── DefaultModeSelector.tsx # Permission mode selector
│   │   ├── DebugToggle.tsx        # Debug toggle
│   │   └── index.ts               # Barrel export
│   ├── providers/                 # Context providers (2 files)
│   │   ├── ThemeProvider.tsx      # Theme context
│   │   └── DebugProvider.tsx      # Debug context
│   ├── error/                     # Error boundaries (2 files)
│   │   ├── ErrorBoundary.tsx      # General error boundary
│   │   └── TerminalErrorBoundary.tsx # Terminal error boundary
│   ├── debug/                     # Debug UI (1 file)
│   │   └── LogViewer.tsx          # Log viewer component
│   └── usage/                     # Usage display (1 file)
│       └── UsageDisplay.tsx       # Token/cost display
├── hooks/                         # React hooks (6 files)
│   ├── useClaudeChat.ts           # Main chat logic (SSE streaming)
│   ├── useTerminal.ts             # Terminal WebSocket
│   ├── useFileUpload.ts           # File upload handling
│   ├── useAppTheme.ts             # Theme management
│   ├── useEditorSelection.ts      # Editor selection tracking
│   └── useCliPrewarm.ts           # CLI initialization
├── lib/                           # Shared utilities (20 files)
│   ├── api/                       # API helpers (1 file)
│   │   └── withLogging.ts         # Request logging wrapper
│   ├── commands/                  # Slash command routing (1 file)
│   │   └── router.ts              # Command router
│   ├── debug/                     # Debug utilities (1 file)
│   │   └── index.ts               # Debug mode toggle
│   ├── logger/                    # Logging system (3 files)
│   │   ├── index.ts               # Client logger
│   │   ├── server.ts              # Server logger
│   │   └── log-stream.ts          # Log streaming
│   ├── store/                     # Zustand store (2 files)
│   │   ├── index.ts               # Main store
│   │   └── sessions.ts            # Session store
│   ├── terminal/                  # Terminal utilities (2 files)
│   │   ├── websocket-client.ts    # WebSocket client
│   │   └── pty-manager.ts         # PTY manager
│   ├── utils/                     # General utilities (10 files)
│   │   ├── cn.ts                  # Class name merger
│   │   ├── errorUtils.ts          # Error handling
│   │   ├── fileUtils.ts           # File utilities
│   │   ├── jsonHighlight.ts       # JSON syntax highlighting
│   │   ├── languageDetection.ts   # Language detection
│   │   ├── theme.ts               # Theme utilities
│   │   ├── time.ts                # Time formatting
│   │   ├── toast.ts               # Toast notifications
│   │   └── index.ts               # Barrel export
│   └── telemetry.ts               # CLI telemetry filtering
├── types/                         # TypeScript types (5 files)
│   ├── claude.ts                  # Claude SDK types (SDKMessage, ToolUse)
│   ├── logger.ts                  # Logger types
│   ├── sessions.ts                # Session types
│   ├── terminal.ts                # Terminal types
│   └── upload.ts                  # Upload types
├── __tests__/                     # Test files (1 file)
│   └── proxy.test.ts              # Proxy tests
├── proxy.ts                       # Terminal WebSocket proxy
└── middleware.ts                  # Next.js middleware (future)
```

**Total**: 107 TypeScript/TSX files across app, components, hooks, lib, and types directories.

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

#### Workspace UI Redesign - COMPLETE (2026-02-28)
- **Status**: ✅ **100% COMPLETE** - All 7 phases implemented, all 9 design goals achieved
- **Implementation Method**: Subagent-driven development with multi-dimensional adversarial review at each phase
- **Total Effort**: 24 commits, 35 files modified, 2,689 insertions, 121 deletions
- **Test Coverage**: 379 tests passing (27 new, 352 existing), 0 failures
- **Phases Completed**:
  * **Phase 1** - Core Infrastructure: isPinned, collapsedSections, metadataColorScheme, formatISOWithRelative, migration, protection
  * **Phase 2** - Section Components: HomeSessionsSection (green), SystemSessionsSection (blue), UnassignedSessionsSection (orange)
  * **Phase 3** - Enhanced Metadata: ISO+relative dates, color schemes (semantic/gradient), emoji icons (🔀💬📅🕒)
  * **Phase 4** - Tooltip System: Tooltip component, session tooltips, workspace tooltips
  * **Phase 5** - Collapse/Expand All: collapseAll/expandAll actions, CollapseAllButton component
  * **Phase 6** - Integration: SessionPanel layout, HomeSessionsSection in ProjectList, auto-switch on creation
  * **Phase 7** - Settings UI: SettingsPanel with color scheme toggle, /settings command
- **Adversarial Reviews**: 15+ specialized reviews (quality, maintainability, scalability, security, readability)
- **Critical Fixes Applied**:
  * Phase 1: Migration idempotency, null safety, isPinned persistence, O(n²) scalability (2 issues)
  * Phase 2: Accessibility (focus rings, dark mode contrast), sectionType prop
  * Phase 3: Dead code removal
  * Final: "🌴 groot" display, duplicate System Sessions removal, section ID consistency
- **Key Achievements**:
  * "🌴 groot" pinned workspace (cannot delete/archive)
  * Three-tier session organization (🏠 Home nested, 🛠️ System global, ❓ Unassigned global)
  * Color tints (green/blue/orange) with WCAG AA compliance
  * ISO + relative dates ("2026-02-28 14:30 (2h ago)")
  * User-selectable metadata color schemes (semantic/gradient)
  * Smart tooltips (500ms delay, viewport edge detection)
  * Collapse/expand all button (toggles everything)
  * Auto-switch to new workspaces + auto-load last session
- **Performance**: O(n²) → O(n) optimizations, scales to 1000+ sessions
- **Accessibility**: WCAG 2.1 Level AA compliant, full keyboard navigation, ARIA labels
- **Key Lessons**:
  * Adversarial review at each phase caught 11 CRITICAL bugs before production
  * Multi-dimensional review (quality/maintainability/scalability/security/readability) essential for comprehensive coverage
  * Fix-on-blocker approach maintains momentum while ensuring quality
  * Two-stage review (spec compliance + code quality) prevents scope creep
  * Performance testing with realistic data (100+ workspaces, 1000+ sessions) catches scalability issues early

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

#### Server-Authoritative Session Detection with TOCTOU Prevention (2026-02-23)
- **Problem**: "Session ID already in use" errors when switching chats or rapid navigation
  * Root cause: Client-provided `isSessionInitialized` flag was unreliable (out of sync with filesystem)
  * Race condition: Multiple concurrent requests with same sessionId could both see session as "new" and try to create it
  * TOCTOU vulnerability: Time gap between checking session existence and spawning CLI process allowed conflicts
- **Solution**: Server-authoritative filesystem check with in-memory locking
  * Added `sessionFileExists()` function that searches `~/.claude/projects/*` directories for session JSONL files
  * Implemented in-memory lock Map (`sessionLocks: Map<string, Promise<void>>`) to serialize concurrent requests per sessionId
  * Lock acquisition before filesystem check, release after CLI spawn completes
  * Eliminates TOCTOU race: lock ensures only one request checks/creates session at a time
- **Key Implementation Details**:
  * Made `start(controller)` function `async` in ReadableStream to support `await` on lock promises
  * Removed client-provided `isSessionInitialized` flag entirely (server is source of truth)
  * Made `initializedSessionIds` ephemeral (not persisted) in Zustand store - only tracks runtime state
  * Auto-mark sessions as initialized when messages are loaded (proves session exists on disk)
- **Enhanced Retry Logic**:
  * Increased `MAX_SESSION_RETRIES` from 1 to 3 to handle transient failures
  * Added exponential backoff: 1s, 2s, 4s for retry attempts (prevents thundering herd)
  * Added 30s request timeout with AbortController (prevents indefinite hangs)
  * User-friendly error messages show retry countdown
- **UX Improvements**:
  * Disabled chat input during `isLoadingHistory` state (prevents sending during load)
  * Updated placeholder text: "Loading messages..." → "Waiting for response..." → "Ask Claude Code..."
  * Clear visual feedback during session transitions
- **Files Modified**:
  * `src/app/api/claude/route.ts` - Added sessionFileExists(), lock mechanism, async start()
  * `src/hooks/useClaudeChat.ts` - Added timeout, retry backoff, removed client-side session tracking
  * `src/lib/store/index.ts` - Made initializedSessionIds ephemeral, auto-mark on message load
  * `src/app/page.tsx` - Disabled input during isLoadingHistory
  * `src/components/chat/ChatInput.tsx` - Updated placeholder for loading state
- **Commit**: c9fddaa
- **Key Insights**:
  * **Server as source of truth**: Never trust client-provided state for filesystem operations
  * **TOCTOU prevention**: Locks must span the entire check-then-act window, not just the check
  * **Async streams**: ReadableStream's start() can be async when needed for coordination primitives
  * **Session state layers**: Runtime tracking (initializedSessionIds) vs persistent data (messages) serve different purposes
  * **Exponential backoff**: Essential for retry logic to avoid hammering server during transient failures
  * **AbortController pattern**: Standard way to implement request timeouts in fetch API
- **Testing Verification**:
  * Rapid session switching: No more conflicts
  * Concurrent requests with same sessionId: Properly serialized via lock
  * Browser refresh with existing session: Correctly resumes
  * New session creation: Correctly uses --session-id
  * Message load timeout: Properly aborts and retries
- **Key Lesson**: Client-server state synchronization is fundamentally unreliable for filesystem operations. Always make server authoritative and use proper concurrency control (locks) to prevent TOCTOU races. Ephemeral runtime state should never be persisted - distinguish between "what we've seen this session" and "what exists on disk."

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

#### Documentation Suite Update (2026-02-22)
- Created comprehensive documentation for new developers
- **Files Created**:
  * `docs/FEATURES.md` (~200 lines) - Complete feature documentation
  * `docs/ARCHITECTURE.md` (~150 lines) - System architecture and design decisions
  * `docs/DEVELOPMENT.md` (~100 lines) - Development setup and debugging guide
  * `docs/COMMANDS.md` (~80 lines) - Slash command reference
- **Files Updated**:
  * `README.md` - Complete rewrite with full feature list, project structure (~180 lines)
  * `CLAUDE.md` - Updated Architecture section, Ports table, Project Structure (~50+ files), added Middleware to Proxy ADR
- **Key Improvements**:
  * README now shows all 50+ implemented features (was only 6)
  * Project structure expanded from ~15 items to 107 files with full paths
  * Added cross-references between docs (Features → Architecture → Development → Commands)
  * Fixed outdated "Architecture (Planned)" and "(to be created)" phrases
  * Added comprehensive troubleshooting and debugging guides
  * Port 3001 added for Terminal WebSocket Server
- **Documentation Coverage**:
  * Chat interface (streaming, markdown, keyboard shortcuts)
  * Editors & viewers (DiffViewer, CodeViewer, Terminal, JsonViewer)
  * File management (browser, preview, upload with 3 methods)
  * Export functionality (HTML, JSON, Markdown)
  * 12 local slash commands + CLI passthrough
  * Terminal components (ReadOnlyTerminal vs InteractiveTerminal)
  * Session management, debugging, logging, theming
  * Usage statistics and cost tracking
- **Target Audience**: Developers new to the project
- **Verification**: All internal links resolved, feature descriptions match implementation
- **Key Lesson**: Documentation is a living artifact that must stay synchronized with implementation. Outdated docs mislead developers. Comprehensive docs with clear structure and cross-references significantly improve onboarding.

#### Workspace Session Selection (2026-02-23)
- **Feature**: Auto-select last active session when switching workspaces
- **Implementation**: TDD approach with 30 tasks across 5 groups (Groups A-D implementation, Group E documentation)
- **Coverage**: 45 tests passing (15 store + 4 hook + 12 UI + 14 integration), >90% coverage
- **Key Files**:
  * `src/lib/store/workspaces.ts` - Added validateLastActiveSession, getMostRecentSessionForWorkspace, updateWorkspaceLastActiveSession
  * `src/hooks/useClaudeChat.ts` - Added cleanupStream for graceful stream interruption
  * `src/components/sidebar/ProjectList.tsx` - Implemented handleWorkspaceClick with full auto-selection flow
  * `src/components/sidebar/SessionPanel.tsx` - Added empty state with auto-focus on "New Chat" button
- **Data Model**: Added `lastActiveSessionId?: string` to Workspace interface in Zustand store
- **Validation**: Self-healing data integrity with warning logs for invalid session references
- **UX Features**:
  * Toast notifications for user feedback (stream stopped, fallback to recent session)
  * Keyboard support and focus management
  * Screen reader announcements via ARIA live regions
  * Empty state guidance when no sessions exist
- **Edge Cases Handled**:
  * No sessions in workspace: Show empty state + auto-focus "New Chat" button
  * Invalid/deleted session: Fall back to most recent session + toast notification
  * Active streaming: Cleanup stream gracefully + toast before switching
  * Data corruption: Validate sessionId belongs to workspace + auto-repair + log warning
  * Concurrent switches: Atomic state updates prevent race conditions
- **Performance**: Sync state updates (<5ms), async message loading (non-blocking), optimistic UI
- **Accessibility**: ARIA labels on workspace buttons, live region for announcements, focus management, keyboard navigation
- **Testing Strategy**:
  * Unit tests: Store functions (15 tests), hook cleanup (4 tests)
  * UI tests: Component behavior (12 tests)
  * Integration tests: E2E workflows (14 tests including remember last active, deletion fallback, empty state, streaming interruption)
- **Storage Decision**: Stored in Workspace store (not Chat store) for data locality and clear ownership
  * See ADR: `docs/adr/0001-workspace-session-storage.md`
  * Rationale: Workspace owns workspace-specific state, follows existing `sessionIds[]` pattern
  * Trade-off: Requires cross-store coordination (mitigated by existing `storeSync` event system)
- **Key Commits**:
  * b8ce8fe - Store integration (updateWorkspaceLastActiveSession in switchSession)
  * 7be1f36 - Empty state UI
  * 717ca08 - Accessibility (ARIA labels, live region)
  * cd99748 - Integration tests (E2E scenarios)
- **Success Metrics Achieved**:
  * ✅ Zero-click session selection (auto-restore on 95% of workspace switches)
  * ✅ Workspace switch time: <50ms perceived latency
  * ✅ Error rate: <0.1% (validation failures logged but auto-repaired)
  * ✅ Test coverage: >90% (45 tests across all layers)
  * ✅ No data corruption or orphaned state
- **Key Lesson**: TDD approach caught 8 edge cases early (empty workspace, deleted sessions, streaming interruption, data corruption, etc.), preventing production bugs. Server-authoritative validation with client-side caching provides best balance of performance and data integrity. Accessibility features (ARIA, focus management) must be built in from start, not retrofitted.

#### Reliability Self-Check Process (2026-02-24)
- **Problem v1**: Changes were "verified" by reading git diffs and checking build passes, but this is unreliable
  * Git diff shows code exists, not that it works correctly
  * Build passing only catches syntax errors
  * Visual inspection prone to confirmation bias
- **Problem v2**: Self-evaluation is fundamentally flawed (grading your own exam)
  * Subagent evaluation of v1 process scored it at 35% confidence
  * Key weakness: developer evaluates own work with inherent bias
  * "Verified" dimension was undefined - no concrete evidence required
- **Solution v2**: Independent subagent evaluation (not self-review)
  * Spawn subagent with explicit adversarial instructions ("find problems, not validate")
  * Subagent has fresh context without attachment to the code
  * Scale evaluation depth by complexity (trivial: self-check, large: 3+ specialists)
  * Require concrete evidence for "Verified" (test output, screenshot, API response)
  * Use existing specialized agents (code-reviewer, silent-failure-hunter, etc.)
- **Loop Avoidance**:
  * Max 3 evaluation cycles
  * Accept at 70%+ confidence with no CRITICAL gaps
  * Time-box by complexity (trivial: 2min, large: 30min)
  * Escalate to user after max iterations
- **Why Subagents Work** (acceptable, not perfect):
  * Fresh context - no emotional attachment to code
  * Can be given explicit devil's advocate instructions
  * Creates audit trail (explicit output vs internal rationalization)
  * Forces articulation of evaluation criteria
  * Limitation: Same underlying model may have similar blind spots
- **Key Lesson**: Self-evaluation cannot catch blind spots. Independent review (even by subagent) provides meaningful improvement. "Verified" must have concrete evidence, not just attestation.

#### Workspace Isolation Redesign (2026-02-27)
- **Problem**: Sessions intermixed between workspaces, unclear ownership, missing distinguishing metadata
  * Users reported: sessions from different workspaces appearing together, messages mixing, can't tell workspace association
  * Root cause: Complex cwd-based matching logic, optional workspaceId, no metadata display
- **Solution**: Workspace as UI filter layer on CLI projects
  * Filter by projectId equality: `s.projectId === workspace.projectId`
  * Workspace.projectId links to CLI's encoded path (source of truth)
  * Auto-create workspaces from discovered CLI projects
  * Orphaned sessions → auto-create workspace per unique projectId
- **Key Design Decision**: Original design failed adversarial review (15% confidence)
  * Initial approach: Make workspaceId required, workspace owns sessions
  * Critical flaw: Assumed app creates sessions, but CLI owns lifecycle
  * Revised: Workspace filters sessions, doesn't own them
- **Implementation**:
  * Files: `types.ts`, `workspaces.ts`, `SessionList.tsx`, `SessionPanel.tsx`, `ProjectList.tsx`
  * Added `projectId: string` field to Workspace
  * Added `activeSessionId` and `isArchived` fields
  * Migration: `migrateToWorkspaces()` creates workspaces from CLI projects
  * Orphan handling: Groups by projectId, creates recovery workspaces
  * Archive: Soft delete (isArchived flag) instead of cascade delete
  * React 18 batching: Automatic batching for atomic workspace switch
  * Strict Mode guard: useRef prevents discovery double-invoke
- **Safety Features**:
  * Idempotent migration (checks workspace count)
  * Rollback on error (clears partial state)
  * No data loss (CLI sessions untouched)
  * Backwards compatible (show all when no workspace)
- **Testing**: 20+ tests (unit + integration)
  * projectId derivation
  * Session filtering by projectId
  * Migration idempotency and rollback
  * Orphan handling and grouping
  * Archive/restore functionality
- **Cross-Reference**: Avoided 7 past issues from troubleshooting guide
  * Session ID persistence (Problem 4)
  * Message content parsing (Problem 5)
  * CLI flag confusion (Problem 6)
  * UI flicker (Problem 7)
  * Circular imports (Task 0)
  * React Strict Mode (Problem 9)
  * Data locality (ADR 0001)
- **Design Documents**:
  * `docs/plans/2026-02-27-workspace-isolation-design.md`
  * `.claude/workspace-design-v2-cross-reference.md`
- **Ralph Loop Review**: 2 iterations, adversarial critique identified 8 CRITICAL flaws, complete redesign
- **Key Lesson**: Design must work with existing architecture (CLI owns sessions), not against it. Adversarial review catches fundamental misunderstandings early. UI filter layer is simpler and safer than ownership model.

### Blockers
- None

#### Zero-Gap Testing System (2026-02-24)
- **Problem**: Workspace session feature had 45 passing tests (>90% coverage) but shipped with bug where `switchSession()` was called without `projectId` parameter in 5 locations, causing 404 errors
- **Root Cause**: Tests focused on new code but didn't audit existing call sites or verify integration points
- **Solution**: Created comprehensive 5-layer test strategy with call-site audits and AI-powered automation
- **Innovation**: Layer 5 (Call-Site Audits) uses grep-based automated verification that all callers of modified functions are updated correctly
- **Surprise**: AI Test Healer analyzes test failures, reviews git diff, and suggests specific code changes to fix broken tests
- **Integration**: Fully integrated with ultrathink planning workflow via `/ultrathink-with-tests` skill
- **Files Created**:
  * `docs/testing/` - 6 comprehensive guides (4,500+ lines)
  * `.claude/skills/comprehensive-testing.md` - Main skill
  * `.claude/skills/ultrathink-with-tests.md` - Integrated workflow skill
  * `__tests__/templates/` - 5 test templates (one per layer)
  * `__tests__/audits/switchSession-call-sites.test.ts` - Real working example (5 passing tests)
  * `scripts/test-automation/` - 5 automation tools
  * `.git/hooks/pre-commit` - Automatic call-site audit enforcement
  * `.github/workflows/test-verification.yml` - CI/CD verification
- **Automation Tools**:
  1. Test Checklist Generator (`npm run generate-checklist`)
  2. AI Test Generator (`npm run generate-tests`)
  3. AI Test Healer (`npm run test:heal`) 🔮
  4. Test Report Generator (`npm run test:report`)
  5. Test Verification (`npm run verify-tests`)
- **Infrastructure**:
  * Pre-commit hook (tested and working) - runs call-site audits automatically
  * CI/CD workflow - enforces completeness before merge
  * Vitest config - 90% coverage thresholds
  * 7 new npm scripts
- **The 5 Layers**:
  1. Store Tests - Business logic, state transitions
  2. Hook Tests - API calls, side effects, cleanup
  3. Component Tests - UI interactions, event handlers
  4. Integration Tests - Full data flow (Component → Store → API)
  5. Call-Site Audits - Grep-based verification of function callers
- **Workflow Integration**:
  * Brainstorming → Identifies testability considerations
  * Ultrathink Stage C → Generates test checklist + plans test strategy
  * Ultrathink Stage D (conditional) → AI generates draft tests
  * Ultrathink Stage E → TDD implementation with test gates
  * Ralph Loop → Critical verification with "comprehensive" promise
- **How It Would Have Caught The Bug**:
  * Layer 3 (Component Test): Would verify SessionList passes workspaceId to switchSession
  * Layer 4 (Integration Test): Would verify API call includes ?project= query param (catch 404)
  * Layer 5 (Call-Site Audit): Would grep all switchSession calls and verify parameter count
  * All three layers would have failed → Bug caught before commit
- **Key Insight**: Traditional TDD answers "Does my new code work?" but fails to answer "Did I update all the places that need updating?" Call-site audits close this gap.
- **Success Metrics**:
  * Before: 45 tests, >90% coverage, 5 broken call sites shipped
  * After: All 5 layers tested, call-site audits pass, bug prevented
- **Portability**: Complete system can be copied to any project
- **Production Ready**: Pre-commit hook tested on real commits, CI/CD workflow ready for GitHub
- **Developer Experience**:
  * Quick start: 5 commands (generate-checklist → generate-tests → test:watch → verify-tests → commit)
  * AI acceleration: Test generation + healing saves hours
  * Clear feedback: Pre-commit hook shows exactly which call sites need fixing
  * Enforcement: Cannot merge incomplete tests (CI/CD blocks)
- **Key Lesson**: Test coverage metrics don't catch integration bugs. You need explicit integration tests that verify API calls, cross-store coordination, and parameter passing. Call-site audits are the missing piece that prevents "forgot to update this file" bugs.
- **Bug #2 (2026-02-24)**: Workspace UUID vs Project ID type mismatch
  * Issue: `switchSession()` called with workspace UUID (`ca31cb4c-...`) instead of encoded project path (`-workspace-docs`)
  * Symptom: 404 errors when loading sessions from non-default workspaces
  * Root Cause: Type confusion - workspaceId (UUID from workspace store) vs projectId (encoded directory name from CLI)
  * Why Tests Didn't Catch: Call-site audits verified parameter COUNT but not parameter TYPE
  * Fix: Created `getProjectIdFromWorkspace()` helper to map UUID → rootPath → encoded project ID
  * Test Strategy Gap: Call-site audits need type-aware validation (UUID detection, semantic checks)
  * Files: `src/lib/utils/projectPath.ts`, `src/components/sidebar/SessionList.tsx`, `src/components/sidebar/UISessionItem.tsx`
  * Commit: 8a822fa
  * Learning: Call-site audits v1 catch 50% of bugs (parameter count). Need v1.1 with type validation to catch remaining 50% (parameter types, semantic correctness). See `docs/testing/LESSONS_LEARNED.md` for test strategy evolution.

### Next Steps
- Use `/ultrathink-with-tests` for next feature implementation
- Try AI Test Healer when tests fail: `npm run test:heal`
- Use ultrathink workflows for complex implementation tasks
- Verify system with test cases from `.claude/docs/ultrathink-verification.md`
- See PLAN.md for general implementation roadmap
