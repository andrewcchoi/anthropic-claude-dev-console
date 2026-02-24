# Development Guide

This guide covers development setup, debugging, testing, and common workflows for the Claude Code Browser UI.

## Prerequisites

- **Node.js**: 20+ (LTS recommended)
- **Claude CLI**: Install from [claude.ai/code](https://claude.ai/code)
- **API Key**: `ANTHROPIC_API_KEY` environment variable (or Foundry config)
- **Git**: Version control
- **VS Code**: Recommended (DevContainer support)

## Development Setup

### Option 1: DevContainer (Recommended)

1. Install Docker Desktop
2. Install VS Code + Remote Containers extension
3. Open project in VS Code
4. Click "Reopen in Container" when prompted

This starts:
- App container (Node 20 + Python 3.12)
- PostgreSQL 16 on port 5432
- Redis 7 on port 6379

### Option 2: Local Setup

```bash
# Clone repository
git clone <repository-url>
cd claude-code-browser-ui

# Install dependencies
npm install

# Set environment variables
export ANTHROPIC_API_KEY=your_key_here

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

### Required

```bash
ANTHROPIC_API_KEY=sk-ant-...  # Anthropic API key
```

### Optional

```bash
# Logging
LOG_LEVEL=debug               # debug | info | warn | error (default: info)
LOG_FORMAT=pretty             # pretty | json (default: json in prod, pretty in dev)

# Node.js
NODE_OPTIONS=--max-old-space-size=4096  # Memory limit (default: 4GB)

# Inherited from host
GITHUB_TOKEN=ghp_...          # GitHub token (for gh CLI)
OPENAI_API_KEY=sk-...         # OpenAI key (future multi-provider)
```

### DevContainer Only

```bash
# PostgreSQL
POSTGRES_USER=sandbox_user
POSTGRES_PASSWORD=devpassword
POSTGRES_DB=sandbox_dev

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
```

## Development Commands

```bash
# Development
npm run dev              # Start dev server (port 3000)
npm run dev:terminal     # Start terminal WebSocket server (port 3001)

# Building
npm run build            # Production build
npm run start            # Start production server

# Code Quality
npx eslint .             # JavaScript/TypeScript linting
npx prettier --write .   # Format code
npx tsc --noEmit         # Type checking

# Python (DevContainer only)
black .                  # Python formatting
ruff check .             # Python linting

# Database (DevContainer only)
psql -h postgres -U sandbox_user -d sandbox_dev  # PostgreSQL CLI
redis-cli -h redis                                # Redis CLI

# Testing
npm run test:connectivity  # Backend connectivity tests
curl http://localhost:3001/health  # Terminal server health check
```

## Debugging Infrastructure

### 1. Client Logger

**Location**: `src/lib/logger/index.ts`

**Usage**:
```typescript
import { createLogger } from '@/lib/logger';

const log = createLogger('MyComponent');

log.debug('Rendering with props', { props });
log.info('User action', { action: 'click' });
log.warn('Deprecated API used');
log.error('Failed to load data', { error });
```

**Features**:
- Component-specific namespaces
- Structured logging (key-value pairs)
- Automatic timestamp and context
- Browser console output with colors

**Enable Debug Mode** (browser console):
```javascript
enableDebug()   // Enable verbose logging
disableDebug()  // Disable verbose logging
toggleDebug()   // Toggle current state
```

### 2. Server Logger

**Location**: `src/lib/logger/server.ts`

**Usage**:
```typescript
import { createServerLogger } from '@/lib/logger/server';

const log = createServerLogger('MyModule', correlationId);

log.debug('Processing request', { method, path });
log.info('Database query', { query, duration });
log.warn('Slow operation', { duration });
log.error('Request failed', { error, stack });
```

**Features**:
- JSON-formatted logs (for log aggregation)
- Correlation IDs (track requests across services)
- Environment-based log levels
- Pretty printing in development

**Environment Configuration**:
```bash
LOG_LEVEL=debug    # Show all logs
LOG_FORMAT=pretty  # Human-readable format (dev only)
```

### 3. Debug Mode

**Location**: `src/lib/debug/index.ts`

**Log Saving Behavior**:
| Level | When Saved |
|-------|------------|
| `debug` | Only when debug mode is enabled |
| `info`, `warn`, `error` | **Always saved** (important operational logs) |

**Global Error Capture** (always active):
- `console.error()` and `console.warn()` calls
- Uncaught JavaScript exceptions
- Unhandled promise rejections

**Browser Console Commands**:
```javascript
// Enable debug mode (shows all client logs + saves debug level)
enableDebug()

// Disable debug mode
disableDebug()

// Toggle debug mode
toggleDebug()

// Export logs
downloadLogs()   // Downloads .jsonl file (recommended)
exportLogs()     // Copies to clipboard (may fail from dev console)

// Manage logs
clearLogs()      // Clear all saved logs
getLogStats()    // Show log statistics
```

**Note**: `exportLogs()` may fail with "Document is not focused" when run from developer console. Use `downloadLogs()` instead.

**React DevTools**: Install React DevTools browser extension for component inspection.

### 4. Error Boundaries

**Location**: `src/components/error/`

**Components**:
- `ErrorBoundary.tsx` - General React error boundary
- `TerminalErrorBoundary.tsx` - Terminal-specific error handling
- `EditorErrorBoundary.tsx` - Editor-specific error handling

**Usage**:
```tsx
<ErrorBoundary fallback={<ErrorMessage />}>
  <MyComponent />
</ErrorBoundary>
```

**Features**:
- Graceful failure (shows fallback UI)
- Error logging (console + server)
- Error details displayed to user
- Reset button to retry

### 5. Log Streaming

**URL**: [http://localhost:3000/logs](http://localhost:3000/logs)

**Features**:
- Real-time log viewer (SSE)
- Auto-scroll to latest entries
- Filter by log level
- Copy logs to clipboard
- Color-coded by severity

**Use Case**: Monitor server logs in real-time during development.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/                # API routes
│   │   ├── claude/         # Chat endpoints (SSE)
│   │   ├── sessions/       # Session management
│   │   ├── files/          # File operations
│   │   ├── upload/         # File upload
│   │   ├── uploads/        # Upload serving
│   │   ├── settings/       # Settings storage
│   │   ├── logs/           # Log streaming
│   │   └── debug/          # Debug utilities
│   ├── terminal/page.tsx   # Interactive terminal
│   ├── logs/page.tsx       # Log viewer
│   ├── preview/page.tsx    # File preview
│   ├── page.tsx            # Main chat interface
│   ├── layout.tsx          # Root layout
│   └── error.tsx           # Error page
├── components/             # React components
│   ├── chat/               # Chat UI (8 files)
│   ├── editor/             # Code viewers (6 files)
│   ├── files/              # File browser (6 files)
│   ├── panels/             # UI panels (6 files)
│   ├── sidebar/            # Session sidebar (9 files)
│   ├── terminal/           # Terminal components (5 files)
│   ├── ui/                 # Reusable UI (9 files)
│   ├── providers/          # Context providers (2 files)
│   ├── error/              # Error boundaries (2 files)
│   ├── debug/              # Debug UI (1 file)
│   └── usage/              # Usage display (1 file)
├── hooks/                  # React hooks
│   ├── useClaudeChat.ts    # Main chat logic (SSE)
│   ├── useTerminal.ts      # Terminal WebSocket
│   ├── useFileUpload.ts    # File upload handling
│   ├── useAppTheme.ts      # Theme management
│   ├── useEditorSelection.ts  # Editor selection
│   └── useCliPrewarm.ts    # CLI initialization
├── lib/                    # Shared utilities
│   ├── api/                # API helpers
│   ├── commands/           # Slash command routing
│   ├── debug/              # Debug utilities
│   ├── logger/             # Logging system (3 files)
│   ├── store/              # Zustand store (2 files)
│   ├── terminal/           # Terminal utilities (2 files)
│   └── utils/              # General utilities (10 files)
├── types/                  # TypeScript types
│   ├── claude.ts           # Claude SDK types
│   ├── logger.ts           # Logger types
│   ├── sessions.ts         # Session types
│   ├── terminal.ts         # Terminal types
│   └── upload.ts           # Upload types
├── __tests__/              # Test files
│   └── proxy.test.ts       # Proxy tests
├── proxy.ts                # Terminal WebSocket proxy
└── middleware.ts           # Next.js middleware (future)
```

## Known Quirks & Solutions

### Terminal Race Condition (Fixed)

**Problem**: ReadOnlyTerminal could show blank output if content arrived before xterm.js initialized.

**Solution**: Two-effect pattern - Effect 1 initializes and writes synchronously after `xterm.open()`, Effect 2 handles incremental updates.

**Files**: `src/components/terminal/ReadOnlyTerminal.tsx` (L39-137)

### React Strict Mode WebSocket (Fixed)

**Problem**: Strict Mode double-mounting caused duplicate WebSocket connections in InteractiveTerminal.

**Root Cause**: React Strict Mode mounts → unmounts → remounts components. Both mount cycles scheduled connections via `setTimeout(0)`.

**Solution**: Added `hasInitiatedConnectionRef` useRef to track connection initiation across mount cycles. Once set to true, prevents duplicate attempts.

**Known Limitation**: Ref never resets, blocking reconnection after intentional disconnect and remount (acceptable for current use case).

**Files**: `src/components/terminal/InteractiveTerminal.tsx`, `src/hooks/useTerminal.ts`

### Monaco Error Suppression

**Problem**: Monaco Editor throws objects (not Error instances), causing `[object Object]` in console.

**Solution**: Inline `<head>` script with capture phase listener in `src/app/layout.tsx`.

**Docs**: `docs/troubleshooting/MONACO_ERROR_SUPPRESSION.md`

**Expected Behavior**: `[object Object]` errors are suppressed (Monaco working correctly).

### CLI Telemetry Noise

**Problem**: Claude CLI outputs telemetry data mixed with message stream.

**Solution**: Filter telemetry by detecting `---\ncli: ` prefix pattern.

**Files**: `src/hooks/useClaudeChat.ts`

**Impact**: Telemetry silently discarded, doesn't affect chat functionality.

### Session ID Conflicts

**Problem**: "Session ID already in use" when switching chats rapidly.

**Solution**:
- Don't persist transient IDs
- Atomic session switching in Zustand store
- Clear messages before loading new session

**Docs**: `docs/troubleshooting/TROUBLESHOOTING_GUIDE.md` (Problems 4, 6, 7)

### Dark Mode Visibility

**Problem**: Interactive elements (hover states, borders) have insufficient contrast in dark mode.

**Solution**:
- Use 2+ step jumps in Tailwind gray scale for hover states
- Thicker borders (border-2) for better visibility
- Subtle glow effects on containers
- Focus rings for accessibility

**Pattern**: For dark backgrounds (gray-800/900), use gray-600 for hovers, gray-500 for borders.

**Docs**: `docs/troubleshooting/DARK_MODE_STYLING.md`

## Common Development Workflows

### Adding a New Slash Command

1. **Add to router** (`src/lib/commands/router.ts`):
   ```typescript
   const LOCAL_COMMANDS = {
     '/mycommand': 'handleMyCommand'
   };

   export const LOCAL_COMMAND_INFO: CommandInfo[] = [
     { command: '/mycommand', handler: 'handleMyCommand', description: 'My command description' }
   ];
   ```

2. **Add handler** (`src/components/chat/ChatInput.tsx`):
   ```typescript
   const handleMyCommand = () => {
     // Implementation
   };
   ```

3. **Update CommandPalette**: Automatically picks up new commands from LOCAL_COMMAND_INFO.

### Adding a New Tool Viewer

1. **Create viewer component** (`src/components/editor/MyViewer.tsx`):
   ```tsx
   export function MyViewer({ toolUse, result }: ToolViewerProps) {
     return <div>{/* Render tool output */}</div>;
   }
   ```

2. **Add routing** (`src/components/chat/ToolExecution.tsx`):
   ```typescript
   if (toolName === 'MyTool') {
     return <MyViewer toolUse={toolUse} result={result} />;
   }
   ```

3. **Add types** (`src/types/claude.ts`):
   ```typescript
   export interface MyToolResult {
     // Tool result shape
   }
   ```

### Adding a New API Route

1. **Create route file** (`src/app/api/myroute/route.ts`):
   ```typescript
   import { NextRequest, NextResponse } from 'next/server';

   export async function GET(req: NextRequest) {
     return NextResponse.json({ data: '...' });
   }
   ```

2. **Add client hook** (`src/hooks/useMyRoute.ts`):
   ```typescript
   export function useMyRoute() {
     const [data, setData] = useState(null);

     const fetchData = async () => {
       const res = await fetch('/api/myroute');
       const json = await res.json();
       setData(json.data);
     };

     return { data, fetchData };
   }
   ```

3. **Use in component**:
   ```tsx
   const { data, fetchData } = useMyRoute();
   useEffect(() => { fetchData(); }, []);
   ```

### Testing File Upload

1. **Drag and drop**: Drag files into chat input area
2. **Clipboard paste**: Copy image/file → Cmd/Ctrl+V in chat input
3. **File picker**: Click attachment icon → select files

**Verify**:
- Thumbnails appear for images
- File metadata shown (name, size)
- Remove button works
- Files uploaded on send

**Debug**:
- Check Network tab for `/api/upload` requests
- Check browser console for upload errors
- Check `/tmp/uploads/` directory for uploaded files

### Verifying SSE Streaming

1. **Enable debug mode**: `enableDebug()` in browser console
2. **Send message**: Type message and send
3. **Check Network tab**: Look for `/api/claude` request (EventStream type)
4. **Check console**: Should see SSE events logged
5. **Verify UI**: Message should stream incrementally

**Expected Events**:
- `message_start`
- `content_block_delta` (multiple)
- `tool_use` (if tools used)
- `tool_result`
- `message_stop`

### Debugging WebSocket Terminal

1. **Start terminal server**: `npm run dev:terminal`
2. **Navigate to `/terminal`**
3. **Check browser console**: Look for WebSocket connection logs
4. **Check Network tab**: Look for WebSocket upgrade request
5. **Verify connection**: Type command, should see output

**Common Issues**:
- WebSocket not connecting → Check terminal server running
- Duplicate connections → React Strict Mode (hasInitiatedConnectionRef guard)
- No output → Check node-pty process spawned correctly

## Testing & Verification

### Type Checking

```bash
npx tsc --noEmit  # Check TypeScript types
```

**Fix errors before committing**.

### Build Verification

```bash
npm run build  # Production build
```

**Should complete without errors**.

### Terminal Server Health

```bash
curl http://localhost:3001/health
# Expected: {"status":"ok"}
```

### Backend Connectivity

```bash
npm run test:connectivity  # Run connectivity tests
```

**Expected**: All tests pass.

### Manual Testing Checklist

- [ ] Chat message sends and receives response
- [ ] Tool execution displays correctly (DiffViewer, CodeViewer, Terminal)
- [ ] File upload works (drag-drop, paste, picker)
- [ ] Session switching works (no "Session ID in use" errors)
- [ ] Slash commands work (/help, /clear, /status, etc.)
- [ ] Terminal page works (WebSocket connects, commands execute)
- [ ] Log viewer works (/logs page)
- [ ] Export works (HTML, JSON, Markdown)
- [ ] Dark mode toggles correctly
- [ ] Theme persists across refresh

## Troubleshooting Links

- [General Issues](../docs/troubleshooting/TROUBLESHOOTING_GUIDE.md)
- [Monaco Editor Errors](../docs/troubleshooting/MONACO_ERROR_SUPPRESSION.md)
- [Terminal Debugging](../docs/troubleshooting/TERMINAL_DEBUGGING_SESSION.md)
- [Dark Mode Styling](../docs/troubleshooting/DARK_MODE_STYLING.md)

## Common Errors

### "Session ID already in use"

**Cause**: Rapid session switching or duplicate CLI processes

**Fix**: Clear messages before loading new session (already implemented in useClaudeChat)

### "[object Object]" in Next.js overlay

**Cause**: Monaco Editor throwing objects instead of Errors

**Fix**: Expected behavior - Monaco error suppression working correctly

### WebSocket fails to connect

**Cause**: Terminal server not running

**Fix**: Run `npm run dev:terminal` in separate terminal

### File upload fails

**Cause**: File too large or invalid type

**Fix**: Check file size (<5MB) and type (see `src/types/upload.ts`)

### Dark mode elements invisible

**Cause**: Insufficient contrast in hover states

**Fix**: Use 2+ step jumps in gray scale (see Dark Mode Styling guide)

## Performance Tips

- **Use production build for testing**: `npm run build && npm start`
- **Monitor bundle size**: `npm run build` shows size breakdown
- **Profile with React DevTools**: Identify slow components
- **Use Chrome DevTools Performance tab**: Record interactions, analyze bottlenecks

## Next Steps

- Read [FEATURES.md](FEATURES.md) for full feature list
- Read [ARCHITECTURE.md](ARCHITECTURE.md) for system design
- Read [COMMANDS.md](COMMANDS.md) for slash command reference
- Read [CLAUDE.md](../CLAUDE.md) for project instructions and ADRs
