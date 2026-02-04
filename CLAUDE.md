# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a DevContainer-based development environment for building a Next.js 16 web application that replicates Claude Code functionality. The project is in **active development** with core features implemented including SSE streaming chat, CLI subprocess integration, session management, and tool execution visualization. See `PLAN.md` for the complete architecture and implementation roadmap.

## Technology Stack

- **Runtime**: Node.js 20 + Python 3.12
- **Planned Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Planned Backend**: Next.js API routes with SQLite (better-sqlite3)
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
- `ENABLE_FIREWALL=false` - firewall is disabled by default (YOLO mode)
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
| **Reference** | `.claude/docs/ultrathink-reference.md` | Quick reference cards |
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

### React Strict Mode WebSocket
**Problem:** Strict Mode double-mounting caused WebSocket race conditions in InteractiveTerminal.
**Solution:** Debounced connect with `isCancelled` flag and cleanup in useEffect return.
**Files:** `src/components/terminal/InteractiveTerminal.tsx`, `src/hooks/useTerminal.ts`

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
│   ├── api/sessions/       # Session CRUD
│   ├── api/logs/stream/    # Log streaming SSE
│   ├── terminal/           # Interactive terminal page
│   └── logs/               # Log viewer page
├── components/
│   ├── chat/               # ChatInput, MessageList, ToolExecution
│   ├── terminal/           # ReadOnlyTerminal, InteractiveTerminal
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
- Core functionality implemented: chat interface, SSE streaming, CLI subprocess integration, session management, tool execution visualization
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

#### Ultrathink Workflow System (2026-02-03)
- Implemented comprehensive multi-phase agent workflow framework
- Three variants: Enhanced Hybrid (default), Adversarial (high-stakes), Temporal (exploratory)
- Files created:
  * `.claude/skills/ultrathink.md` - Enhanced Hybrid workflow (~450 tokens)
  * `.claude/skills/ultrathink-adversarial.md` - Adversarial mode (~400 tokens)
  * `.claude/skills/ultrathink-temporal.md` - Temporal mode (~450 tokens)
  * `.claude/docs/ultrathink-README.md` - Getting started guide
  * `.claude/docs/ultrathink-reference.md` - Quick reference cards
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
