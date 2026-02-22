# Claude Code Browser UI

> Browser-based interface for Claude Code using CLI subprocess integration

A feature-rich web application that provides a modern chat interface for Claude Code with real-time streaming, tool execution visualization, file management, and session persistence.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set API key
export ANTHROPIC_API_KEY=your_key_here

# 3. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Features

### Core Chat

- **Real-time streaming** - Server-Sent Events (SSE) for instant message delivery
- **Tool execution visualization** - Live display of tool usage (Read, Write, Edit, Bash)
- **Message history** - Full conversation preservation across sessions
- **Session management** - Automatic discovery, search, and switching
- **Keyboard shortcuts** - Cmd/Ctrl+Enter to send, Cmd/Ctrl+K for command palette
- **Markdown support** - GitHub-flavored markdown, syntax-highlighted code blocks, LaTeX math

### Editors & Viewers

- **DiffViewer** - Monaco DiffEditor for Edit tool (side-by-side diff with syntax highlighting)
- **CodeViewer** - Syntax-highlighted code display for Read/Write tools (180+ languages via Prism.js)
- **ReadOnlyTerminal** - xterm.js terminal for Bash tool output with ANSI color support
- **JsonViewer** - Pretty-printed JSON for structured data

### File Management

- **File browser** - Tree view with git status indicators (modified, untracked, staged)
- **File preview** - Click any file to preview with syntax highlighting
- **Context menus** - Right-click for copy path, open in editor, reveal in finder
- **File upload** - Three methods: drag-drop, clipboard paste (Cmd/Ctrl+V), file picker
  - Supports images (PNG, JPG, GIF, WebP, HEIC, AVIF) and documents
  - Preview thumbnails for images
  - Max 5 files per message, 5MB per file

### Export & Commands

- **Export formats** - HTML (Word-ready, default), JSON (structured data), Markdown (plain text)
  - `/export` - HTML export with syntax highlighting and embedded images
  - `/export json` - Machine-readable format with full message history
  - `/export markdown` - GitHub-flavored markdown
- **12 local slash commands** - Instant execution in browser (no network latency)
  - `/help`, `/clear`, `/status`, `/cost`, `/copy`, `/model`, `/theme`, `/export`, `/todos`, `/rename`, `/context`, `/config`
- **Command palette** - Fuzzy search for all commands (Cmd/Ctrl+K)

### Terminal

- **ReadOnlyTerminal** - Display Bash tool output in chat (xterm.js, ANSI colors)
- **InteractiveTerminal** - Full PTY shell at `/terminal` page (WebSocket + node-pty)

### UI & Theming

- **Themes** - Auto (system), Light, Dark (optimized for visibility)
- **Responsive design** - Mobile-friendly, collapsible sidebar
- **Dark mode optimizations** - High contrast, visible hover states, thicker borders
- **Accessibility** - Keyboard navigation, ARIA labels, focus rings

### Debugging & Logging

- **Client logger** - Structured logging in browser console (enable with `enableDebug()`)
- **Server logger** - JSON logs with correlation IDs (`LOG_LEVEL`, `LOG_FORMAT`)
- **Debug mode** - Runtime toggle via browser console
- **Log streaming** - Real-time log viewer at `/logs` (SSE)
- **Error boundaries** - Graceful failure with fallback UI

### Usage Statistics

- **Token tracking** - Input, output, cache read/write tokens per message and session total
- **Cost calculation** - Real-time cost estimates with model-specific pricing (USD)
- **Usage display** - Inline stats after each message, scroll to usage via `/cost`

## Technology Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **UI**: Tailwind CSS v4, shadcn/ui components
- **State**: Zustand with localStorage persistence
- **Editors**: Monaco Editor (DiffViewer), Prism.js (syntax highlighting)
- **Terminal**: xterm.js with xterm-addon-fit
- **Markdown**: react-markdown with remark/rehype plugins
- **Backend**: Next.js API routes, Node.js 20
- **CLI Integration**: Claude CLI subprocess (spawn + stream-json)
- **Database**: PostgreSQL 16, Redis 7 (DevContainer)
- **Package Manager**: npm (primary), pnpm, yarn, uv (Python)

## Project Structure

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
├── components/                    # React components
│   ├── chat/                      # Chat UI (8 files)
│   │   ├── ChatInput.tsx          # Message input with attachments
│   │   ├── MessageList.tsx        # Message display
│   │   ├── MessageContent.tsx     # Markdown rendering
│   │   ├── ToolExecution.tsx      # Tool output routing
│   │   ├── CommandPalette.tsx     # Command search (Cmd/Ctrl+K)
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
├── lib/                           # Shared utilities
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

## Architecture

```
Browser → Next.js Frontend (React 19)
            ↓ SSE Stream
         API Routes (Node.js)
            ↓ spawn('claude', ['--output-format', 'stream-json'])
         Claude CLI (subprocess)
            ↓ Tools (Read, Write, Bash, Edit, etc.)
         Workspace Files
```

**Key Design Decisions**:
- **CLI subprocess** instead of SDK (permission system, tool safety, session management)
- **Two terminal components** (ReadOnlyTerminal for chat output, InteractiveTerminal for standalone shell)
- **Local slash commands** (12 commands handled in UI for instant execution)
- **Tool output routing** (DiffViewer for Edit, CodeViewer for Read/Write, Terminal for Bash)

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed architecture documentation.

## API Routes

| Route | Method | Purpose | Returns |
|-------|--------|---------|---------|
| `/api/claude` | POST | Main chat endpoint (SSE streaming) | SSE stream |
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
| `/api/logs/stream` | GET | Log streaming (SSE) | SSE stream |
| `/api/debug` | GET/POST | Debug utilities | JSON |

## Slash Commands

### Local Commands (12)

Handled directly in the UI (instant execution, no network round-trip):

| Command | Description |
|---------|-------------|
| `/help` | Show help panel with available commands |
| `/clear` | Clear the current chat history |
| `/status` | Show connection and session status |
| `/cost` | Scroll to usage and cost information |
| `/copy` | Copy last assistant response to clipboard |
| `/model` | Open model selection panel |
| `/theme` | Cycle through available themes (auto, light, dark) |
| `/export` | Export as HTML (Word-ready), or use `/export json` or `/export markdown` |
| `/todos` | Show tasks and todos panel |
| `/rename` | Rename the current session |
| `/context` | Open context panel (future) |
| `/config` | Open configuration panel (future) |

### CLI Passthrough

All other `/commands` (skills, plugins, MCP tools) are sent to Claude CLI.

See [docs/COMMANDS.md](docs/COMMANDS.md) for complete command reference.

## Development

### Prerequisites

- Node.js 20+
- Claude CLI installed ([claude.ai/code](https://claude.ai/code))
- `ANTHROPIC_API_KEY` environment variable

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start terminal WebSocket server (separate terminal)
npm run dev:terminal
```

### DevContainer

Open in VS Code and use "Reopen in Container" to start DevContainer with:
- App container (Node 20 + Python 3.12)
- PostgreSQL 16 on port 5432
- Redis 7 on port 6379

### Ports

| Port | Service |
|------|---------|
| 3000 | Frontend (Next.js) |
| 3001 | Terminal WebSocket Server |
| 5432 | PostgreSQL |
| 6379 | Redis |

### Commands

```bash
# Development
npm run dev              # Start dev server (port 3000)
npm run dev:terminal     # Start terminal server (port 3001)

# Building
npm run build            # Production build
npm run start            # Start production server

# Code Quality
npx eslint .             # Linting
npx prettier --write .   # Formatting
npx tsc --noEmit         # Type checking

# Testing
npm run test:connectivity  # Backend connectivity tests
curl http://localhost:3001/health  # Terminal server health check
```

### Debugging

**Enable debug mode in browser console**:
```javascript
enableDebug()   // Enable verbose logging
disableDebug()  // Disable verbose logging
toggleDebug()   // Toggle current state
```

**View real-time logs**: Navigate to [http://localhost:3000/logs](http://localhost:3000/logs)

**Environment variables**:
```bash
LOG_LEVEL=debug    # debug | info | warn | error
LOG_FORMAT=pretty  # pretty | json
```

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for detailed development guide.

## Troubleshooting

Common issues and solutions:

- **Session ID conflicts**: Atomic session switching (already fixed)
- **Monaco errors**: `[object Object]` expected (Monaco error suppression working)
- **Terminal race condition**: Two-effect pattern (already fixed)
- **React Strict Mode WebSocket**: `hasInitiatedConnectionRef` guard (already fixed)
- **Dark mode visibility**: Use 2+ step jumps in gray scale for hover states

See troubleshooting guides:
- [General Issues](docs/troubleshooting/TROUBLESHOOTING_GUIDE.md)
- [Monaco Editor Errors](docs/troubleshooting/MONACO_ERROR_SUPPRESSION.md)
- [Terminal Debugging](docs/troubleshooting/TERMINAL_DEBUGGING_SESSION.md)
- [Dark Mode Styling](docs/troubleshooting/DARK_MODE_STYLING.md)

## Documentation

- **[Features Guide](docs/FEATURES.md)** - Comprehensive feature documentation
- **[Architecture](docs/ARCHITECTURE.md)** - System design and technical decisions
- **[Development Guide](docs/DEVELOPMENT.md)** - Setup, debugging, and workflows
- **[Commands Reference](docs/COMMANDS.md)** - Slash command documentation
- **[CLAUDE.md](CLAUDE.md)** - Project instructions and ADRs
- **[PLAN.md](PLAN.md)** - Implementation roadmap

## License

MIT
