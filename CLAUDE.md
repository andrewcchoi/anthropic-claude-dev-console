# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a DevContainer-based development environment for building a Next.js 14 web application that replicates Claude Code functionality. The project is in **active development** with core features implemented including SSE streaming chat, CLI subprocess integration, session management, and tool execution visualization. See `PLAN.md` for the complete architecture and implementation roadmap.

## Technology Stack

- **Runtime**: Node.js 20 + Python 3.12
- **Planned Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui
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
Browser → Next.js Frontend (React 18)
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

## Ultrathink Brainstorm Workflow

For complex, multi-phase implementation tasks requiring deep planning and validation:

```
LEGEND: || = parallel  -> = sequential  [!] = barrier (wait for all)

─── A: INITIAL PLAN ──────────────────────────────────────────────
|| 3-7 agents: Arch|Req|Conv|Risk|Test|Dep
  - Arch: map structure, deps    - Risk: edge cases, failures
  - Req: atomic steps, order     - Test: coverage strategy
  - Conv: existing patterns      - Dep: parallelizable components
[!]

─── B: CRITIQUE (x2 iterations) ──────────────────────────────────
Per iteration:
 || 2-3 NEW agents: Critical|AltExplorer|Feasibility
 [!]
 -> Refinement agent: address findings

─── C: FINALIZE ──────────────────────────────────────────────────
-> Finalization agent:
  1. Group phases: deps → activity type (setup→logic→integration→polish)
  2. Output parallel_groups: [[p1,p2],[p3],[p4,p5]]
  3. Define test gates per phase

─── D: TEST CYCLE (per phase) ────────────────────────────────────
D1: || Unit|Integration|EdgeCase writers → [!]
D2: Critique loop (max 4x):
   || Gap|FalsePos|Assertion agents → [!] → -> Update agent
   Exit early if clean
D3: Run tests:
   || unit (no shared state)
   -> integration (shared state)
   || mutation testing
D4: Gate: pass → E, fail → D2

─── E: IMPLEMENT ─────────────────────────────────────────────────
Execute per parallel_groups from C:
 || independent phases → [!] → -> dependent phases

─── RULES ────────────────────────────────────────────────────────
✓ Max parallelization: single msg, multiple calls
✓ Barriers: all parallel work must complete first
✓ Cumulative tests: each phase runs all prior tests
✓ Phase gates: tests must pass to proceed
✓ Fresh agents: NEW agents for each critique cycle
✓ Unit || always, integration -> always
✓ Temp: .claude/ultrathink-temp/{session}
✓ Cleanup: auto-delete temp after success
```

### Context Management

**Stage Transitions:**
- **Before starting new stage** (A→B, B→C, C→D, D→E): Update Memory section with key learnings, decisions, and context from current stage
- **Clear context**: Start each stage with fresh context (use `/clear`)
- **Read memory first**: At start of each stage, read CLAUDE.md to restore persistent context

**At Barriers [!]:**
- Wait for all parallel agents to complete
- Update Memory section with agent outputs and findings
- Record parallel_groups structure (from stage C) for implementation tracking

**Test Execution (Stage D):**
- **After each test run**: Clear context to start fresh
- **Before clearing**: Record test results and important findings in Memory section
- **Keep tests isolated**: Each test cycle should not carry forward conversation history
- **Log test gate results**: Document pass/fail status before proceeding to next phase

**Memory Updates:**
- Keep entries concise and actionable
- Include: stage completed, key decisions made, blockers encountered, files modified, test results
- Remove outdated entries that are no longer relevant

**Artifacts:**
- Store temporary work in `.claude/ultrathink-temp/{session}/`
- Auto-delete temp directory after successful completion

## Pre-installed Tools

**Node.js**: typescript, ts-node, eslint, prettier, nodemon, mermaid-cli
**Python**: pytest, black, flake8, mypy, ipython, ruff, poetry
**CLI**: gh (GitHub CLI), git-delta, fzf, pgcli

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

### Blockers
- None

### Next Steps
- See PLAN.md for implementation roadmap
