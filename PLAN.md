# Architecture A: Next.js Web App - Implementation Plan

## Implementation Status

**Status:** Partially Implemented (CLI Subprocess Approach)
**Last Updated:** 2026-01-27

### Recent Fixes

- ✅ **ANSI Color Display** (2026-01-27) - Fixed terminal output to properly render ANSI color codes instead of showing escaped sequences like `\033[31m`. Tool results are now captured from Claude CLI `user` messages and displayed in the Terminal component.

### Key Architectural Change

Instead of implementing provider SDKs directly in the Next.js app, the application **spawns the Claude CLI as a subprocess** and streams responses via Server-Sent Events. This provides:

- **All Claude Code tools automatically** (Read, Write, Bash, MCP, Git, etc.)
- **Session management via CLI** (no custom SQLite needed)
- **Automatic provider handling** (Anthropic, Bedrock, Vertex, Azure)
- **Plugin system support** (hooks, commands, agents)
- **Simpler implementation** (offload complexity to CLI)

### What's Implemented

- ✅ Next.js 14+ app with App Router
- ✅ SSE streaming chat interface
- ✅ CLI subprocess integration (`claude -p --output-format stream-json`)
- ✅ Session management UI (SessionList.tsx)
- ✅ Message display with tool execution rendering
  - ✅ Tool result capture from CLI `user` messages
  - ✅ ANSI color rendering in Bash output (Terminal component)
- ✅ Usage tracking (UsageDisplay.tsx with telemetry)
- ✅ Zustand state management with localStorage persistence
- ✅ Troubleshoot-recorder plugin v2.0 (hooks + commands)

### What's NOT Implemented

**By Design (CLI Handles):**
- ❌ Provider abstraction layer (CLI manages providers)
- ❌ Individual provider SDKs (Bedrock, Vertex, Azure)
- ❌ Tool implementations in Node.js (CLI tools used instead)
- ❌ Custom MCP server manager (CLI MCP integration)
- ❌ SQLite session storage (CLI session files used)

**Future Work:**
- ⚠️ Terminal emulator (xterm.js) - Basic terminal rendering implemented, full xterm.js integration pending
- ❌ Code viewer (Monaco Editor)
- ❌ Dark/light theme toggle
- ❌ Provider selector UI
- ❌ shadcn/ui components

---

## Overview

**Actual Architecture (CLI Subprocess Approach):**

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (localhost:3000)              │
│  ┌───────────────────────────────────────────────────┐  │
│  │         Next.js 16 App Router (React 19)          │  │
│  │  - Chat UI with SSE streaming                     │  │
│  │  - Session list sidebar                           │  │
│  │  - Usage display (tokens/cost)                    │  │
│  │  - Zustand state management (localStorage)        │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │ HTTP / Server-Sent Events
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Next.js API Routes (Node.js)                │
│  ┌───────────────────────────────────────────────────┐  │
│  │         Claude CLI Subprocess Manager             │  │
│  │  spawn("claude -p --output-format stream-json")   │  │
│  └───────────────────────────────────────────────────┘  │
│                          │                               │
│                          ▼                               │
│  ┌───────────────────────────────────────────────────┐  │
│  │              Claude CLI Process                   │  │
│  │  - All tools (Read, Write, Bash, Git, etc.)      │  │
│  │  - Session management (~/.claude/sessions/)       │  │
│  │  - Provider handling (Anthropic/Bedrock/Vertex)   │  │
│  │  - MCP integration                                │  │
│  │  - Plugin system (hooks, commands, agents)        │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  - Telemetry logging (/workspace/logs/telemetry.jsonl)  │
│  - File system access (inside DevContainer)             │
└─────────────────────────────────────────────────────────┘
```

**Original Plan (Not Implemented):**

```
┌─────────────────────────────────────────────────────────┐
│              Next.js API Routes (Node.js)                │
│  ┌───────────────────────────────────────────────────┐  │
│  │           Provider Abstraction Layer              │  │
│  │  Anthropic │ Bedrock │ Vertex AI │ Azure          │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │              Tool Execution Layer                 │  │
│  │  File I/O │ Bash │ Search │ Git │ MCP             │  │
│  └───────────────────────────────────────────────────┘  │
│  - SQLite for sessions (better-sqlite3)                 │
└─────────────────────────────────────────────────────────┘
```
*(This approach was replaced with CLI subprocess integration)*

## Technology Stack

**Actual Implementation:**

| Layer | Technology | Status |
|-------|------------|--------|
| Framework | Next.js 16 (App Router) | ✅ Implemented |
| Frontend | React 19 + TypeScript + Tailwind CSS v4 | ✅ Implemented |
| State | Zustand with localStorage persistence | ✅ Implemented |
| Server State | React Query (@tanstack/react-query) | ✅ Implemented |
| Claude Integration | CLI subprocess (`child_process.spawn`) | ✅ Implemented |
| Streaming | Server-Sent Events (SSE) | ✅ Implemented |
| Telemetry | JSONL logs (`/workspace/logs/telemetry.jsonl`) | ✅ Implemented |
| Sessions | CLI session files (`~/.claude/sessions/`) | ✅ Via CLI |
| Tools | Claude CLI tools (Read, Write, Bash, Git, MCP) | ✅ Via CLI |

**Original Plan (Not Implemented):**

| Layer | Technology | Reason Not Used |
|-------|------------|-----------------|
| Components | shadcn/ui + Radix primitives | Minimal UI sufficient |
| Terminal | xterm.js | Not needed yet |
| Editor | Monaco Editor | Not needed yet |
| Database | better-sqlite3 | CLI handles sessions |
| Custom Tools | Node.js implementations | CLI provides all tools |
| Provider SDKs | @anthropic-ai/sdk, @aws-sdk/bedrock, etc. | CLI manages providers |

## File Structure

**Actual Implementation:**

```
/workspace/
├── src/                              # ✅ Source code
│   ├── app/
│   │   ├── page.tsx                  # ✅ Main chat interface
│   │   ├── layout.tsx                # ✅ Root layout
│   │   └── api/
│   │       ├── claude/route.ts       # ✅ SSE streaming (CLI subprocess)
│   │       ├── sessions/[id]/messages/route.ts  # ✅ Message history
│   │       └── test-route/route.ts   # ✅ Test endpoint
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatInput.tsx         # ✅ Input with submit
│   │   │   ├── MessageList.tsx       # ✅ Message display
│   │   │   ├── MessageContent.tsx    # ✅ Markdown rendering
│   │   │   └── ToolExecution.tsx     # ✅ Tool result display
│   │   ├── sidebar/
│   │   │   ├── Sidebar.tsx           # ✅ Session list container
│   │   │   └── SessionList.tsx       # ✅ Session management
│   │   └── usage/
│   │       └── UsageDisplay.tsx      # ✅ Token/cost tracking
│   ├── lib/
│   │   ├── store/index.ts            # ✅ Zustand state management
│   │   └── telemetry.ts              # ✅ Telemetry parsing
│   ├── hooks/
│   │   └── useClaudeChat.ts          # ✅ Chat hook with SSE
│   └── types/
│       └── claude.ts                 # ✅ TypeScript types
├── .claude-plugins/
│   └── troubleshoot-recorder/        # ✅ Plugin v2.0
│       ├── plugin.json               # ✅ Manifest
│       ├── hooks.json                # ✅ SessionStart/PostToolUse/SessionEnd
│       ├── commands/
│       │   └── troubleshoot.md       # ✅ /troubleshoot command
│       ├── agents/                   # ✅ Specialized agents
│       │   ├── doc-generator.md
│       │   ├── failure-detector.md
│       │   └── solution-detector.md
│       └── references/
│           └── schema.md             # ✅ Data schema
├── logs/
│   └── telemetry.jsonl               # ✅ CLI telemetry output
├── package.json                      # ✅ Dependencies
├── next.config.ts                    # ✅ Next.js config
├── tailwind.config.ts                # ✅ Tailwind v4
├── CLAUDE.md                         # ✅ Project instructions
└── PLAN.md                           # This file
```

**Original Plan (Not Implemented):**

```
├── lib/
│   ├── providers/                    # ❌ Not needed (CLI handles)
│   │   ├── anthropic.ts
│   │   ├── bedrock.ts
│   │   ├── vertex.ts
│   │   └── azure.ts
│   ├── tools/                        # ❌ Not needed (CLI handles)
│   │   ├── read.ts
│   │   ├── write.ts
│   │   ├── bash.ts
│   │   ├── glob.ts
│   │   └── grep.ts
│   ├── mcp/                          # ❌ Not needed (CLI handles)
│   │   └── manager.ts
│   └── db/                           # ❌ Not needed (CLI handles)
│       ├── schema.ts
│       └── sessions.ts
```

---

## Implementation Phases

### Phase 1: Foundation ✅ COMPLETED

**Tasks (Completed):**
- [x] `npx create-next-app@latest --typescript --tailwind` (Next.js 16, React 19)
- [x] Tailwind CSS v4 with new `@import "tailwindcss"` syntax
- [x] Zustand state management with persistence
- [x] TypeScript types (`src/types/claude.ts`)
- [x] SSE streaming infrastructure

**Gate:** ✅ `npm run dev` shows working chat app at http://localhost:3000

### Phase 2: Claude Integration ✅ COMPLETED (CLI Approach)

**Tasks (Completed):**
- [x] CLI subprocess manager (`src/app/api/claude/route.ts`)
- [x] Stream JSON output parsing
- [x] Telemetry capture (`logs/telemetry.jsonl`)
- [x] Session persistence via CLI session files
- [x] All providers supported via CLI (Anthropic, Bedrock, Vertex, Azure)

**Original Plan (Not Implemented):**
- [ ] ~~Provider abstraction layer~~ (CLI handles this)
- [ ] ~~Individual provider SDKs~~ (CLI handles this)

**Gate:** ✅ Can chat with Claude via CLI subprocess

### Phase 3: UI Components ✅ COMPLETED

**Tasks (Completed):**
- [x] Chat interface (`src/app/page.tsx`)
- [x] Message list with streaming (`src/components/chat/MessageList.tsx`)
- [x] Message content with markdown (`src/components/chat/MessageContent.tsx`)
- [x] Tool execution display (`src/components/chat/ToolExecution.tsx`)
  - [x] Tool result capture from CLI output (`useClaudeChat.ts`)
  - [x] ANSI color rendering in Bash output (Terminal component)
  - [x] Multiple output format support (string, object, array)
- [x] Chat input component (`src/components/chat/ChatInput.tsx`)
- [x] Session list sidebar (`src/components/sidebar/`)
- [x] Usage tracking display (`src/components/usage/UsageDisplay.tsx`)

**Gate:** ✅ Full chat UI with tool result rendering and ANSI color support

### Phase 4: Tools ✅ COMPLETED (Via CLI)

**All tools provided by Claude CLI:**
- [x] Read, Write, Edit tools
- [x] Glob, Grep, LS tools
- [x] Bash tool (with CLI sandboxing)
- [x] Git tool
- [x] WebFetch, WebSearch tools
- [x] MCP integration
- [x] NotebookEdit tool

**Original Plan (Not Implemented):**
- [ ] ~~Custom tool implementations~~ (CLI provides all tools)
- [ ] ~~Security layer~~ (CLI handles sandboxing)

**Gate:** ✅ Full Claude Code tool parity via CLI

### Phase 5: Plugin System ✅ COMPLETED

**Tasks (Completed):**
- [x] Troubleshoot-recorder plugin v2.0
- [x] Hook system (SessionStart, PostToolUse, SessionEnd)
- [x] Command system (`/troubleshoot`)
- [x] Agent system (doc-generator, failure-detector, solution-detector)
- [x] JSONL storage (events, problems, sessions)
- [x] Documentation generation

**Gate:** ✅ Working plugin with automatic problem tracking

### Phase 6: Future Enhancements ⏳ IN PROGRESS

**Tasks (Parallel):**
- [x] Terminal emulator (xterm.js integration) - Implemented: ReadOnlyTerminal for chat output, InteractiveTerminal for standalone shell
- [ ] Code viewer (Monaco Editor)
- [ ] Dark/light theme toggle
- [ ] Provider selector UI
- [ ] Keyboard shortcuts
- [ ] shadcn/ui component migration

**Gate:** Production-ready UX with advanced features

---

## Architectural Decisions

### Why CLI Subprocess Instead of Direct SDK Integration?

The original plan called for implementing provider SDKs directly in Node.js:
- `@anthropic-ai/sdk` for Anthropic
- `@aws-sdk/client-bedrock-runtime` for Bedrock
- `@anthropic-ai/vertex-sdk` for Vertex AI
- `@anthropic-ai/foundry-sdk` for Azure

**Decision:** Use Claude CLI as a subprocess instead.

**Rationale:**

1. **Automatic Tool Support** - CLI provides all tools out-of-the-box (Read, Write, Bash, Git, MCP, etc.) without reimplementing them
2. **Session Management** - CLI already handles session persistence in `~/.claude/sessions/`
3. **Provider Handling** - CLI manages all 4 providers (Anthropic, Bedrock, Vertex, Azure) with proper authentication
4. **MCP Integration** - CLI has built-in MCP server support
5. **Plugin System** - CLI supports hooks, commands, and agents
6. **Reduced Complexity** - Offload 90% of implementation work to the CLI
7. **Maintenance** - CLI updates automatically bring new features
8. **Consistency** - Web UI behavior matches CLI exactly

**Trade-offs:**

- **Dependency on CLI** - Requires `claude` CLI to be installed
- **Subprocess overhead** - Small latency from process spawning (~50-100ms)
- **Limited customization** - Can't easily modify tool behavior

**Implementation:**

```typescript
// src/app/api/claude/route.ts
const claudeProcess = spawn('claude', [
  '-p', // Print mode
  '--verbose',
  '--output-format', 'stream-json',
  '--include-partial-messages',
  '--session-id', sessionId,
  message
]);
```

---

## Troubleshoot-Recorder Plugin

A Claude Code plugin that automatically tracks errors and solutions across sessions.

**Architecture:**
- **Hooks**: Capture tool errors via PostToolUse hook
- **Commands**: `/troubleshoot record|solve|status` for manual control
- **Agents**: Specialized agents for failure detection, solution detection, and doc generation
- **Storage**: JSONL files in `.claude/troubleshoot/` (events, problems, sessions)

**Key Features:**
- Error signature normalization (path/UUID/timestamp replacement)
- Fuzzy error matching (80%+ similarity using SequenceMatcher)
- Cross-session state tracking
- Automatic documentation generation

**Files:**
- `.claude-plugins/troubleshoot-recorder/plugin.json` - Manifest
- `.claude-plugins/troubleshoot-recorder/hooks.json` - Hook definitions
- `.claude-plugins/troubleshoot-recorder/commands/troubleshoot.md` - Command definition
- `.claude-plugins/troubleshoot-recorder/agents/` - Specialized agents

See `.claude-plugins/troubleshoot-recorder/README.md` for details.

---

## Security Considerations

### CLI Handles Most Security

Since we're using the Claude CLI subprocess, most security concerns are handled by the CLI:
- ✅ **Path traversal** - CLI validates paths
- ✅ **Command injection** - CLI has command blocklist
- ✅ **Sandboxing** - CLI manages bash execution
- ✅ **Credential management** - CLI handles provider auth

### Remaining Web UI Risks

| Risk | Severity | Mitigation | Implementation |
|------|----------|------------|----------------|
| XSS in Markdown | MEDIUM | Sanitize markdown before rendering | TODO: Add DOMPurify |
| Process Spawning | LOW | Validate inputs before spawning CLI | ✅ Input validation in route.ts |
| Telemetry Logging | LOW | Don't log sensitive data to telemetry.jsonl | ✅ CLI sanitizes output |
| Session Hijacking | LOW | Use secure session IDs | ✅ CLI generates UUIDs |

### Original Plan Risks (No Longer Applicable)

These risks were in the original plan but are now handled by the CLI:

| Risk | Original Severity | Why Not Applicable |
|------|-------------------|---------------------|
| Path Traversal | CRITICAL | CLI validates all paths |
| Command Injection | CRITICAL | CLI has built-in command blocklist |
| Credential Exposure | HIGH | CLI manages credentials |
| SSRF via WebFetch | MEDIUM | CLI handles WebFetch tool |
| Rate Limiting | MEDIUM | CLI manages provider rate limits |
| Token Expiry | MEDIUM | CLI handles token refresh |
| SQLite Concurrency | MEDIUM | Not using SQLite (CLI sessions) |
| MCP Server Crashes | MEDIUM | CLI manages MCP servers |

---

## Provider Interface (Original Plan - Not Implemented)

**Original Plan:**
```typescript
interface IClaudeProvider {
  type: 'anthropic' | 'bedrock' | 'vertex' | 'azure';
  createMessage(request: CreateMessageRequest): Promise<MessageResponse>;
  createMessageStream(request: CreateMessageRequest): AsyncIterable<StreamEvent>;
  countTokens(request: TokenCountRequest): Promise<number>;
  healthCheck(): Promise<HealthCheckResult>;
}
```

**Planned NPM Packages (Not Used):**
- `@anthropic-ai/sdk` - Anthropic direct
- `@aws-sdk/client-bedrock-runtime` - Amazon Bedrock
- `@anthropic-ai/vertex-sdk` - Google Vertex AI
- `@anthropic-ai/foundry-sdk` - Azure AI Foundry

**Actual Implementation:**
All provider handling is delegated to the Claude CLI subprocess.

---

## Tool Set

**Actual Implementation:** ✅ All tools provided by Claude CLI

The CLI subprocess provides all Claude Code tools automatically:
- ✅ Read, Write, Edit, LS
- ✅ Glob, Grep
- ✅ Bash (with sandboxing)
- ✅ Git (status, diff, commit, push, etc.)
- ✅ WebFetch, WebSearch
- ✅ TodoWrite, TaskCreate, TaskUpdate
- ✅ MCP (Model Context Protocol servers)
- ✅ NotebookEdit (Jupyter notebooks)
- ✅ EnterPlanMode, ExitPlanMode
- ✅ AskUserQuestion
- ✅ Skill execution

**Original Plan (Not Implemented):**
Custom tool implementations in Node.js were planned but not needed.

---

## Key Gotchas (Actual Implementation)

| Issue | Solution |
|-------|----------|
| CLI output parsing | Use `--output-format stream-json` for structured output |
| Telemetry on stdout | Use bracket depth tracking to capture complete objects |
| Session persistence | CLI manages sessions in `~/.claude/sessions/` |
| Process cleanup | Always kill subprocess on disconnect or error |
| Partial messages | Use `--include-partial-messages` for streaming UX |
| Verbose mode needed | Use `--verbose` to get telemetry and tool results |
| Tool results not captured | Handle `user` message type with `tool_result` blocks in SSE stream |
| ANSI colors not rendering | Use Terminal component for Bash output, handle multiple formats (string, object, array) |

**Original Plan Gotchas (No Longer Applicable):**
- ~~Model names differ per provider~~ (CLI handles this)
- ~~Bedrock tool format differs~~ (CLI handles this)
- ~~Streaming formats differ~~ (CLI normalizes this)
- ~~Extended thinking timeout~~ (CLI handles this)
- ~~Path traversal attacks~~ (CLI validates this)
- ~~Credential expiry~~ (CLI refreshes tokens)

---

## Verification Commands

**Actual Testing:**

```bash
# Start development server
npm run dev
# Visit http://localhost:3000

# Test chat functionality (via browser UI)
# Type in chat: "Hello, can you read the package.json file?"
# Expected: Claude reads and summarizes package.json

# Test tool execution (via browser UI)
# Type in chat: "Run npm --version"
# Expected: Tool execution shown with bash output

# Test ANSI color rendering (via browser UI)
# Type in chat: "Run echo -e \"\033[31mRed\033[0m \033[32mGreen\033[0m\""
# Expected: Tool execution shows colored output in terminal (not escaped codes)

# Test colored commands (via browser UI)
# Type in chat: "Run ls --color"
# Type in chat: "Run git status"
# Expected: Bash output shows actual colors in terminal emulator

# Test session management
# Create new session via sidebar
# Switch between sessions
# Expected: Message history persists per session

# Test telemetry
tail -f /workspace/logs/telemetry.jsonl
# Expected: Cost and token usage logged per request

# Test troubleshoot-recorder plugin
claude /troubleshoot status
# Expected: Plugin status and recorded problems
```

**Original Plan Testing (Not Applicable):**

```bash
# These commands were planned but not needed:

# curl -X POST http://localhost:3000/api/chat \
#   -H "Content-Type: application/json" \
#   -d '{"provider":"anthropic","message":"Hello"}'
# (Replaced with CLI subprocess approach)
```

---

## DevContainer Support

This architecture runs perfectly in a DevContainer:

```json
{
  "name": "Claude UI",
  "image": "mcr.microsoft.com/devcontainers/typescript-node:20",
  "forwardPorts": [3000],
  "postCreateCommand": "npm install",
  "postStartCommand": "npm run dev"
}
```

**Benefits:**
- Access all files inside the container (your workspace)
- Run bash commands in the container environment
- Git operations on container's repos
- Isolated from host (better security)
- Port forwarding makes it accessible at localhost:3000

---

## Pros & Cons

**Actual Implementation (CLI Subprocess Approach):**

| Pros | Cons |
|------|------|
| ✅ Fast development (Next.js hot reload) | ❌ Requires browser open |
| ✅ Easy debugging (browser DevTools) | ❌ Not "native" desktop feel |
| ✅ All Claude Code tools automatically | ❌ Depends on CLI being installed |
| ✅ Session management via CLI | ❌ Subprocess spawning overhead (~50-100ms) |
| ✅ MCP integration built-in | ❌ Port conflicts possible (3000) |
| ✅ Plugin system support | ❌ Can't easily customize tool behavior |
| ✅ Standard React ecosystem | ❌ Need to start server manually |
| ✅ Minimal code to maintain | |
| ✅ Can deploy to cloud later | |
| ✅ Can wrap in Electron later | |

**Original Plan Pros (Would Have Applied):**

| Original Pro | Actual Status |
|--------------|---------------|
| All Node.js APIs available | ✅ Still true |
| Standard React ecosystem | ✅ Still true |
| Easy debugging | ✅ Still true |

**Original Plan Cons (No Longer Apply):**

| Original Con | Why Not Applicable |
|--------------|---------------------|
| Need to implement all tools | ❌ CLI provides all tools |
| Need to implement providers | ❌ CLI handles providers |
| Complex security layer | ❌ CLI handles security |
| SQLite concurrency issues | ❌ Not using SQLite |
