# Architecture

This document describes the technical architecture of the Claude Code Browser UI.

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Next.js Frontend (React 19)                │   │
│  │  ┌────────────┬──────────────┬──────────────────┐   │   │
│  │  │ Chat UI    │ File Browser │ Terminal (/term) │   │   │
│  │  └────────────┴──────────────┴──────────────────┘   │   │
│  │  ┌────────────────────────────────────────────────┐ │   │
│  │  │         Zustand Store (Client State)           │ │   │
│  │  └────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
          SSE Stream                    WebSocket (PTY)
               │                              │
┌──────────────┴──────────────────────────────┴───────────────┐
│                   Next.js API Routes                        │
│  ┌──────────────────┐  ┌──────────────────────────────┐    │
│  │ /api/claude      │  │ /api/terminal (WebSocket)    │    │
│  │ (SSE streaming)  │  │ (node-pty)                   │    │
│  └────────┬─────────┘  └──────────────────────────────┘    │
│           │                                                 │
│  ┌────────┴─────────────────────────────────────────────┐  │
│  │  CLI Subprocess Integration (spawn + stream-json)    │  │
│  └────────┬─────────────────────────────────────────────┘  │
└───────────┼─────────────────────────────────────────────────┘
            │
    ┌───────┴────────┐
    │  Claude CLI    │
    │  (subprocess)  │
    │  ┌──────────┐  │
    │  │ Tools:   │  │
    │  │ Read     │  │
    │  │ Write    │  │
    │  │ Bash     │  │
    │  │ Edit     │  │
    │  │ ...      │  │
    │  └──────────┘  │
    └────────────────┘
```

## Core Components

### Frontend (Browser)

**Technology**: Next.js 16 App Router, React 19, TypeScript

**Key Libraries**:
- **UI**: Tailwind CSS v4, shadcn/ui components
- **State**: Zustand with localStorage persistence
- **Editors**: Monaco Editor (DiffViewer, CodeViewer)
- **Terminal**: xterm.js with xterm-addon-fit
- **Markdown**: react-markdown with remark/rehype plugins
- **Syntax Highlighting**: Prism.js (code blocks)

**State Management**:
- Zustand store for client-side state (messages, sessions, UI state)
- localStorage persistence for theme, hidden sessions, collapsed projects
- SSE streaming for real-time message updates
- No global Redux/MobX (intentionally lightweight)

### Backend (Next.js API Routes)

**Runtime**: Node.js 20

**Key Routes**:
- `/api/claude/route.ts` - SSE streaming endpoint (main chat)
- `/api/claude/init/route.ts` - CLI prewarm (skills/commands)
- `/api/sessions/discover/route.ts` - Session discovery
- `/api/sessions/[id]/messages/route.ts` - Load session messages
- `/api/files/*` - File operations (read, list, git-status)
- `/api/upload/route.ts` - File upload handling
- `/api/logs/stream/route.ts` - Log streaming (SSE)
- `/api/terminal/*` - WebSocket terminal server

**Terminal Server**: Standalone WebSocket server on port 3001 (node-pty)

## CLI Subprocess Integration

### Why CLI Instead of SDK?

**Decision**: Use Claude CLI as subprocess instead of Anthropic SDK directly.

**Rationale**:
1. **Permission system**: SDK has no built-in permission UI; CLI handles this
2. **Tool safety**: CLI implements command blocklists and security layers
3. **Stream format**: CLI outputs structured JSON via `--output-format stream-json`
4. **Session management**: CLI handles session persistence natively
5. **MCP support**: CLI integrates MCP servers automatically
6. **Reduced complexity**: No need to reimplement security features

**Trade-offs Accepted**:
- Dependency on Claude CLI being installed
- Slightly higher latency (subprocess spawn)
- Less fine-grained control over API calls

**Implementation**:
```typescript
spawn('claude', [
  '-p',                              // Project mode
  '--verbose',                        // Verbose output
  '--output-format', 'stream-json',   // Structured JSON stream
  '--session-id', sessionId,          // Session tracking
  '--resume',                         // Resume existing session
  '--auto-permission', 'true'         // Auto-approve permissions
]);
```

**Reference**: See ADR in CLAUDE.md

## SSE Streaming

**Protocol**: Server-Sent Events (SSE) for unidirectional server → client streaming

**Flow**:
1. Client sends POST to `/api/claude` with user message
2. Server spawns CLI subprocess
3. CLI outputs JSON stream (one JSON object per line)
4. Server parses and forwards as SSE events
5. Client (useClaudeChat hook) processes events and updates UI

**Event Types**:
- `message_start` - New message begins
- `content_block_delta` - Incremental text content
- `tool_use` - Tool execution started
- `tool_result` - Tool execution completed
- `message_stop` - Message complete
- `error` - Error occurred

**Error Handling**:
- Network errors → reconnect with exponential backoff
- CLI errors → display in chat as system message
- Timeout → abort after 5 minutes

## State Management (Zustand)

**Store**: `src/lib/store/index.ts`

**State Shape**:
```typescript
{
  // Messages
  messages: Message[]
  addMessage: (message: Message) => void
  clearMessages: () => void

  // Sessions
  sessionId: string | null
  setSessionId: (id: string) => void
  hiddenSessionIds: Set<string>

  // UI State
  collapsedProjects: Set<string>
  selectedFiles: Set<string>
  theme: 'auto' | 'light' | 'dark'

  // Streaming
  isStreaming: boolean
  setIsStreaming: (streaming: boolean) => void
}
```

**Persistence**: localStorage via Zustand persist middleware
- Theme preferences
- Hidden session IDs
- Collapsed project state

**Why Zustand?**
- Lightweight (no boilerplate)
- TypeScript-first
- Built-in persistence
- No React Context (better performance)
- Simple API for global state

## Component Architecture

### Two Terminal Components

**Design Decision**: Separate components for different use cases

| Component | Purpose | Location | Type |
|-----------|---------|----------|------|
| **ReadOnlyTerminal** | Display Bash tool output | Inline in chat | Static, read-only |
| **InteractiveTerminal** | Full interactive shell | `/terminal` page | WebSocket PTY |

**Why Two Components?**
- Mixing read-only display with interactive I/O adds complexity
- Different WebSocket lifecycle management
- ReadOnlyTerminal: content prop (SSE), no WebSocket
- InteractiveTerminal: WebSocket-connected PTY, bidirectional

**Files**:
- `src/components/terminal/ReadOnlyTerminal.tsx` (chat output)
- `src/components/terminal/InteractiveTerminal.tsx` (standalone shell)

### Slash Command Routing

**Router**: `src/lib/commands/router.ts`

**Logic**:
```typescript
function routeCommand(input: string): CommandRoute {
  // 1. Check if local command (e.g., /help, /clear)
  if (LOCAL_COMMANDS[input]) {
    return { type: 'local', handler: LOCAL_COMMANDS[input] };
  }

  // 2. Pass through to CLI (skills, plugins)
  if (input.startsWith('/')) {
    return { type: 'passthrough' };
  }

  // 3. Regular message (passthrough)
  return { type: 'passthrough' };
}
```

**Local Commands** (12): `/help`, `/clear`, `/status`, `/cost`, `/copy`, `/model`, `/theme`, `/export`, `/todos`, `/rename`, `/context`, `/config`

**Passthrough Commands**: All skills, plugins, and unrecognized slash commands

**Why Local Commands?**
- Instant response (no network round-trip)
- Works even if CLI connection fails
- Better UX for UI-specific features

**Execution**:
- Local: `ChatInput.tsx` calls handler directly
- Passthrough: Sent to CLI via SSE stream

### Tool Output Visualization

**Router**: `src/components/chat/ToolExecution.tsx`

**Routing Logic**:
```typescript
function getViewer(toolName: string, result: any) {
  if (toolName === 'Edit' && result.old_string && result.new_string) {
    return 'DiffViewer';  // Side-by-side diff
  }

  if (toolName === 'Edit' && typeof result.output === 'string') {
    return 'CodeViewer';  // Final result only
  }

  if (['Read', 'Write'].includes(toolName) && typeof result.output === 'string') {
    return 'CodeViewer';  // Syntax-highlighted code
  }

  if (toolName === 'Bash' && typeof result.output === 'string') {
    return 'ReadOnlyTerminal';  // Terminal with ANSI colors
  }

  return 'JsonViewer';  // Fallback for structured data
}
```

**Viewers**:
- **DiffViewer**: Monaco DiffEditor for Edit tool (side-by-side)
- **CodeViewer**: Syntax-highlighted code for Read/Write/Edit
- **ReadOnlyTerminal**: xterm.js for Bash output (ANSI colors)
- **JsonViewer**: Fallback for all other tools

**Dynamic Imports**: Code splitting for heavy libraries (Monaco, xterm)

## API Routes Overview

| Route | Method | Purpose | Returns |
|-------|--------|---------|---------|
| `/api/claude` | POST | Main chat endpoint | SSE stream |
| `/api/claude/init` | POST | CLI prewarm (skills/commands) | JSON |
| `/api/sessions/discover` | GET | List all sessions | JSON array |
| `/api/sessions/[id]/messages` | GET | Load session messages | JSON array |
| `/api/files` | GET | List workspace files | JSON tree |
| `/api/files/git-status` | GET | Git status for files | JSON |
| `/api/files/[...path]` | GET | Read file content | Text/JSON |
| `/api/upload` | POST | Upload files | JSON (file IDs) |
| `/api/uploads/serve` | GET | Serve uploaded files | File stream |
| `/api/uploads/cleanup` | DELETE | Delete old uploads | JSON |
| `/api/settings` | GET/PUT | User settings | JSON |
| `/api/logs/stream` | GET | Log streaming | SSE stream |
| `/api/debug` | GET/POST | Debug utilities | JSON |

## Key Design Decisions

### Middleware to Proxy Migration

**Decision**: Migrated from Next.js middleware to standalone proxy server for terminal WebSocket.

**Rationale**:
- Next.js middleware cannot handle WebSocket upgrade requests
- Middleware runs on every request (performance overhead)
- Proxy server gives full control over WebSocket lifecycle

**Implementation**: Standalone Express server on port 3001 with `http-proxy-middleware`

**Reference**: `docs/plans/2026-02-21-middleware-to-proxy-design.md`

### Session ID Management

**Problem**: "Session ID already in use" errors when switching chats rapidly

**Solution**:
- Don't persist transient session IDs
- Atomic session switching in Zustand store
- Clear messages before loading new session
- Validate session exists before switching

### File Upload Architecture

**Design**: Three upload methods (drag-drop, paste, picker) with unified backend

**Storage**: Temporary files in `/tmp/uploads/{sessionId}/` with auto-cleanup

**Security**:
- File type validation (MIME + extension)
- Size limits (5MB per file, 5 files per message)
- SVG blocked (XSS prevention)
- Path canonicalization

### Dark Mode Optimization

**Problem**: Insufficient contrast for interactive elements in dark mode

**Solution**:
- 2+ step jumps in gray scale for hover states (gray-800 → gray-600)
- Thicker borders (border-2) for visibility
- Subtle glow effects on containers
- Focus rings for accessibility

**Reference**: `docs/troubleshooting/DARK_MODE_STYLING.md`

## Performance Considerations

### Code Splitting
- Monaco Editor: ~2MB (lazy loaded)
- xterm.js: ~500KB (lazy loaded)
- Prism.js: ~100KB (per language, on-demand)

### Bundle Size
- Initial load: ~300KB (gzipped)
- With Monaco: ~2.3MB
- With xterm: ~800KB

### Caching Strategy
- Browser cache: static assets (fonts, images)
- localStorage: user preferences, session state
- No server-side caching (real-time data)

### Streaming Optimizations
- Incremental rendering (React Suspense)
- Virtual scrolling for long message lists (future)
- Debounced file tree updates

## Security Architecture

### Path Validation
```typescript
function validatePath(path: string): boolean {
  const canonical = path.resolve(path);
  return canonical.startsWith(workspaceRoot);
}
```

### Command Safety
- CLI command blocklists (rm -rf, dd, mkfs, etc.)
- Timeout protection (5 minutes max)
- User isolation (no sudo/root)

### Credential Protection
- Environment variable masking in logs
- No credential storage in browser
- Server-side only API key handling

### XSS Prevention
- DOMPurify sanitization for markdown
- Content Security Policy headers
- Safe HTML rendering (dangerouslySetInnerHTML avoided)

## Debugging Infrastructure

### Logging System (5 Components)

| Component | Location | Purpose |
|-----------|----------|---------|
| Client Logger | `src/lib/logger/index.ts` | Browser-side structured logging |
| Server Logger | `src/lib/logger/server.ts` | Server-side JSON logs |
| Debug Mode | `src/lib/debug/index.ts` | Runtime debug toggle |
| Error Boundaries | `src/components/error/` | React error catching |
| Log Streaming | `src/app/api/logs/stream/` | Real-time log viewer |

### Correlation IDs
- Every request gets a unique correlation ID
- Tracked across frontend, backend, and CLI subprocess
- Visible in logs for end-to-end tracing

## Technology Choices

### Why Next.js?
- Server-side rendering for better SEO (future)
- API routes for backend logic
- File-based routing
- Built-in TypeScript support
- Zero-config setup

### Why Tailwind CSS?
- Utility-first (rapid prototyping)
- No CSS file management
- Consistent design system
- Tree-shaking (small bundle)
- v4 native CSS variables

### Why Monaco Editor?
- Powers VS Code (familiar UX)
- Built-in diff viewer
- 180+ language support
- TypeScript types included
- Extensive API

### Why xterm.js?
- Industry standard (used by VS Code, Hyper)
- Full ANSI support
- WebGL renderer (performance)
- Add-ons for fit, search, etc.

### Why Zustand?
- Lightweight (3KB)
- No boilerplate
- TypeScript-first
- Built-in persistence
- Better than Redux for small apps

## Future Architectural Improvements

### Short-term
- [ ] Virtual scrolling for message list (performance)
- [ ] Service worker for offline support
- [ ] WebSocket fallback for SSE (firewall compatibility)

### Medium-term
- [ ] Multi-provider support (OpenAI, Gemini, etc.)
- [ ] Database migration (SQLite for sessions)
- [ ] Task visualization (dependency graph)

### Long-term
- [ ] Real-time collaboration (multiple users)
- [ ] Server-side rendering for chat history
- [ ] Electron desktop app (better terminal integration)

## References

- [Features Guide](FEATURES.md)
- [Development Guide](DEVELOPMENT.md)
- [Commands Reference](COMMANDS.md)
- [CLAUDE.md](../CLAUDE.md) - Project instructions and ADRs
- [PLAN.md](../PLAN.md) - Implementation roadmap
