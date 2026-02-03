# Claude Code Browser UI

A browser-based interface for interacting with Claude Code using the Claude CLI as a subprocess.

## Features

- Real-time streaming chat interface
- Tool execution visualization
- Session management
- Clean, responsive UI with Tailwind CSS
- Full access to Claude Code's local tools

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Prerequisites

- Node.js 18+
- Claude Code CLI installed locally
- `ANTHROPIC_API_KEY` environment variable set (or Foundry config)

## Architecture

```
Browser → Next.js (localhost:3000)
    ↓ SSE Stream
Next.js API Route (/api/claude)
    ↓ spawn('claude', ['-p', '--output-format', 'stream-json'])
Claude Code CLI (local subprocess)
```

## Project Structure

```
src/
├── app/
│   ├── api/claude/route.ts    # Claude SDK integration
│   ├── page.tsx               # Main chat interface
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── chat/
│   │   ├── ChatInput.tsx      # Message input
│   │   ├── MessageList.tsx    # Message display
│   │   ├── MessageContent.tsx # Content rendering
│   │   └── ToolExecution.tsx  # Tool visualization
│   └── sidebar/
│       └── Sidebar.tsx        # Session management
├── hooks/
│   └── useClaudeChat.ts       # SSE streaming logic
├── lib/
│   └── store/
│       └── index.ts           # Zustand state management
└── types/
    └── claude.ts              # TypeScript definitions
```

## Usage

1. Start the dev server: `npm run dev`
2. Open http://localhost:3000
3. Type a message (e.g., "list files in current directory")
4. Press Cmd/Ctrl+Enter or click Send
5. Watch Claude Code execute tools in real-time

## Technology Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19 + Tailwind CSS v4
- **State**: Zustand with localStorage persistence
- **Claude**: CLI subprocess integration
- **TypeScript**: Full type safety

## Development

```bash
# Development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Features Implemented

- ✅ Real-time message streaming
- ✅ Tool execution visualization
- ✅ Session persistence (session ID tracking)
- ✅ Error handling
- ✅ Loading states
- ✅ Keyboard shortcuts (Cmd/Ctrl+Enter)
- ✅ Responsive sidebar
- ✅ Auto-scroll to latest message

## Troubleshooting

If you encounter issues during development:

- **General Issues**: See [docs/troubleshooting/TROUBLESHOOTING_GUIDE.md](docs/troubleshooting/TROUBLESHOOTING_GUIDE.md)
- **Monaco Editor Errors**: See [docs/troubleshooting/MONACO_ERROR_SUPPRESSION.md](docs/troubleshooting/MONACO_ERROR_SUPPRESSION.md)
- **Terminal Issues**: See [docs/troubleshooting/TERMINAL_DEBUGGING_SESSION.md](docs/troubleshooting/TERMINAL_DEBUGGING_SESSION.md)

Common issues:
- "[object Object]" in Next.js overlay → Monaco error suppression working as intended
- Session conflicts → Check CLI flags (--resume vs --session-id)
- WebSocket errors → React Strict Mode double-invocation (setTimeout fix applied)

## Future Enhancements

- [ ] Session history and search
- [ ] File browser panel
- [ ] Terminal emulator (xterm.js)
- [ ] Settings page
- [ ] Multiple provider support
- [ ] Syntax highlighting for code blocks
- [ ] Diff view for file changes
- [ ] Task visualization

## License

MIT
