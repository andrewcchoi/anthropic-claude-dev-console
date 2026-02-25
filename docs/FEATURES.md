# Features Guide

This document provides a comprehensive overview of all features available in the Claude Code Browser UI.

## Chat Interface

### Real-time Streaming
- Server-Sent Events (SSE) streaming for instant message delivery
- Live updates as Claude processes your requests
- Tool execution streamed in real-time
- Usage statistics (tokens, cost) updated continuously

### Message History
- Full conversation history preserved across sessions
- Session persistence via Claude CLI
- Automatic session discovery from `~/.claude/projects/`
- Session search with fuzzy matching
- Load and continue previous conversations

### Keyboard Shortcuts
- `Cmd/Ctrl + Enter`: Send message
- `Cmd/Ctrl + K`: Open command palette
- `Cmd/Ctrl + L`: Clear chat
- `Escape`: Close panels/dialogs
- `Tab`: Autocomplete commands in command palette

### Markdown Support
- Full GitHub-flavored markdown rendering
- Syntax-highlighted code blocks
- Tables, lists, blockquotes
- LaTeX math equations (inline and block)
- Auto-linkification of URLs

## Editors & Viewers

### DiffViewer (Monaco DiffEditor)
- Side-by-side diff view for file changes (Edit tool)
- Syntax highlighting based on file extension
- Automatic language detection
- Responsive layout (switches to inline on narrow screens)
- "Copy New" button to copy modified content
- Theme support (auto, light, dark)
- Read-only display (no editing in MVP)

**Triggers**: Edit tool with `old_string` and `new_string` parameters

### CodeViewer (Syntax Highlighting)
- Syntax-highlighted code display (Read, Write, Edit tools)
- 180+ languages supported via Prism.js
- Line numbers
- Copy button for entire code block
- Automatic language detection from file paths
- Fallback to plaintext for unknown types
- Theme-aware (matches app theme)

**Triggers**: Read tool, Write tool, Edit tool with output only

### ReadOnlyTerminal (ANSI Colors)
- Terminal output display for Bash tool execution
- Full ANSI color and formatting support
- xterm.js-powered rendering
- Auto-scrolling to latest output
- Incremental output updates during streaming
- Dark theme optimized

**Triggers**: Bash tool execution

### JsonViewer
- Pretty-printed JSON display
- Syntax highlighting for JSON structures
- Collapsible sections for nested objects
- Copy button
- Fallback viewer for unrecognized tool outputs

**Triggers**: All other tools without specialized viewers

## File Management

### File Browser
- Tree view of workspace files and directories
- Git status indicators (modified, untracked, staged)
- Collapsible directories
- Current workspace always visible
- Keyboard navigation support
- Refresh button to reload file tree

### File Preview Pane
- Click any file in tree to preview
- Syntax-highlighted code preview
- Large file handling (first 500 lines)
- File metadata (size, modified date)
- Selection toolbar for quick actions

### Context Menus
- Right-click files for context menu
- Actions: Copy path, Open in editor, Reveal in finder
- Platform-aware (Windows, macOS, Linux)

### File Upload
Three methods to attach files to chat:

1. **Drag and Drop**
   - Drag files from file system into chat input area
   - Visual drop zone indicator
   - Multi-file support

2. **Clipboard Paste**
   - Paste images from clipboard (Cmd/Ctrl + V)
   - Paste files from file manager
   - Screenshot support
   - Supported formats: PNG, JPG, JPEG, GIF, WebP, HEIC, AVIF

3. **File Picker**
   - Click attachment icon to open file picker
   - Multi-select support
   - File type filtering

**Upload Features**:
- Image preview thumbnails
- File size display
- Remove individual files before sending
- Max 5 files per message (configurable)
- Max 5MB per file (configurable)
- Automatic cleanup of old uploads

## Export Functionality

Export conversations to multiple formats via `/export` command.

### HTML Export (Default, Word-ready)
- Rich formatted export for Microsoft Word
- Preserves syntax highlighting
- Includes tool execution details
- Images embedded as base64
- Metadata header (session ID, timestamp, model)
- Filename: `claude-chat-{timestamp}.html`

**Usage**: `/export` or `/export html`

### JSON Export
- Structured data export
- Full message history
- Tool use and results
- Usage statistics
- Session metadata
- Machine-readable format

**Usage**: `/export json`

### Markdown Export
- Plain text export
- GitHub-flavored markdown
- Code blocks preserved
- Tool outputs as blockquotes
- Minimal formatting (no syntax highlighting)

**Usage**: `/export markdown` or `/export md`

## Terminal

Two distinct terminal components for different use cases:

### ReadOnlyTerminal (Chat Output)
- **Purpose**: Display Bash tool output in chat messages
- **Location**: Inline within chat interface
- **Type**: Static, read-only display
- **Technology**: xterm.js
- **Features**: ANSI colors, auto-scroll, incremental updates
- **Use case**: Viewing command outputs from Claude's Bash tool

### InteractiveTerminal (Standalone Shell)
- **Purpose**: Full interactive shell access
- **Location**: `/terminal` page (dedicated route)
- **Type**: Bidirectional I/O via WebSocket
- **Technology**: xterm.js + WebSocket + node-pty
- **Features**: Full PTY, command history, text selection, copy/paste
- **Use case**: Manual terminal interaction, debugging, exploration

**Key Difference**: ReadOnlyTerminal displays output from Claude's tools, InteractiveTerminal is a standalone shell you control directly.

## Session Management

### Auto-Select Last Active Session
- **What**: Automatically restores the last active session when switching workspaces
- **How**: Click workspace in sidebar → last viewed session loads automatically
- **Fallback**: If last session was deleted, shows most recent session
- **Empty state**: Shows "New Chat" button with keyboard hint (⌘N) when no sessions
- **Streaming**: Gracefully stops active conversation before switching
- **Accessibility**: Screen reader announces workspace and session name

**Key Features**:
- Zero-click session selection (95% of cases)
- Data integrity validation with auto-repair
- Toast notifications for user awareness
- Keyboard navigation support
- Focus management for accessibility

### Session Discovery
- Automatic discovery of CLI sessions from `~/.claude/projects/`
- Grouped by project directory
- Sorted by last modified (newest first)
- Hide/show sessions with eye icon

### Session Search
- Fuzzy search across session names
- Real-time filtering as you type
- Search placeholder shows total session count

### Session Switching
- Click any session to load its history
- Atomic session switching (prevents conflicts)
- Preserves scroll position in message list
- Auto-clears previous messages before loading new session

### Current Session Indicator
- Active session highlighted in sidebar
- Session name displayed in header
- Last modified timestamp

## Slash Commands

12 local commands handled directly in the UI (no network round-trip):

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

**CLI Passthrough**: All other `/commands` (skills, plugins) are passed to Claude CLI.

## Command Palette

- Quick access to all available commands
- Fuzzy search filtering
- Keyboard-driven (Cmd/Ctrl + K)
- Shows local commands, skills, and CLI commands
- Descriptions for each command
- Auto-deduplication (skills appear in both skills and slash_commands)

## Panels & Dialogs

### Help Panel
- List of all available slash commands
- Keyboard shortcuts reference
- Feature overview
- Quick tips

### Status Panel
- WebSocket connection status
- Current session ID
- CLI process health
- Server connectivity

### Model Panel
- Switch between Claude models (Opus, Sonnet, Haiku)
- Shows current model selection
- Model descriptions and capabilities

### Todos Panel
- View active tasks from Claude
- Task status tracking
- Checkboxes for completed items

### Rename Dialog
- Rename current session
- Validation (no empty names)
- Updates session name in sidebar immediately

## Debugging & Logging

### Client Logger
- Structured logging in browser console
- Log levels: debug, info, warn, error
- Component-specific namespaces
- Enable/disable via `enableDebug()` / `disableDebug()`

### Server Logger
- JSON-formatted server logs
- Correlation IDs for request tracking
- Environment-based log levels (`LOG_LEVEL`)
- Pretty printing for development (`LOG_FORMAT=pretty`)

### Debug Mode
- Toggle debug mode in browser console
- `enableDebug()`: Enable verbose logging (includes debug-level logs)
- `disableDebug()`: Disable verbose logging
- `toggleDebug()`: Toggle current state
- `downloadLogs()`: Download logs as timestamped JSONL file
- `exportLogs()`: Copy logs to clipboard
- `clearLogs()`: Clear saved logs
- `getLogStats()`: Show log statistics

**Log Saving**:
- `info`, `warn`, `error`: Always saved (no debug mode required)
- `debug`: Only saved when debug mode is enabled

**Global Error Capture** (always active):
- `console.error()` and `console.warn()` calls
- Uncaught JavaScript exceptions
- Unhandled promise rejections

### Log Streaming
- Real-time log viewer at `/logs`
- SSE streaming of server logs
- Auto-scroll to latest entries
- Filter by log level
- Copy logs to clipboard

### Error Boundaries
- React error boundaries for graceful failure handling
- Terminal-specific error boundary
- Editor error boundary
- Fallback UI with error details

## UI & Theming

### Themes
- **Auto**: Follows system preference
- **Light**: Light mode
- **Dark**: Dark mode (optimized for visibility)
- Theme persistence via localStorage
- Smooth transitions between themes

### Responsive Design
- Mobile-friendly layout
- Collapsible sidebar
- Responsive Monaco editors (side-by-side → inline on narrow screens)
- Touch-friendly controls

### Dark Mode Optimizations
- High contrast interactive elements
- Visible hover states (2+ step jumps in gray scale)
- Thicker borders for better visibility
- Subtle glow effects on containers
- Focus rings for accessibility

## Usage Statistics

### Token Tracking
- Input tokens (prompts)
- Output tokens (responses)
- Cache read tokens (prompt caching)
- Cache write tokens (prompt caching)
- Total tokens per message
- Cumulative session totals

### Cost Calculation
- Real-time cost estimates
- Model-specific pricing
- Breakdown by token type (input, output, cache)
- Session total cost
- Formatted in USD

### Usage Display
- Inline usage stats after each message
- Collapsible usage details
- Color-coded for easy scanning
- Scroll to usage via `/cost` command

## Performance Optimizations

### Code Splitting
- Dynamic imports for Monaco, xterm.js, and other heavy libraries
- Lazy loading of viewer components
- Reduced initial bundle size

### Caching
- localStorage persistence for theme, sessions, settings
- CLI prewarm on app startup (loads skills/commands once)
- Session state cached in Zustand store

### Streaming
- Incremental message rendering (SSE)
- Tool outputs stream as they execute
- No blocking on large responses

## Security Features

### Path Validation
- Canonicalized paths in file operations
- Workspace boundary enforcement
- Prevents directory traversal attacks

### Command Safety
- CLI command blocklists
- Timeout protection
- User isolation for Bash execution

### Credential Protection
- Encrypted credentials at rest
- Log sanitization (prevents credential leakage)
- Environment variable masking

### XSS Prevention
- DOMPurify sanitization for markdown
- Safe HTML rendering
- Content Security Policy headers

## Accessibility

### Keyboard Navigation
- Full keyboard support for all features
- Focus management in modals and panels
- Skip links for screen readers
- Tab order optimization

### ARIA Labels
- Semantic HTML elements
- ARIA labels for custom components
- Role attributes for dynamic content

### Focus Rings
- Visible focus indicators
- High contrast focus rings
- Persistent focus state

## Browser Support

- **Chrome**: 90+ (full support)
- **Firefox**: 88+ (full support)
- **Safari**: 14+ (full support, with clipboard paste quirks)
- **Edge**: 90+ (full support)

**Note**: Some features (clipboard paste) have browser-specific implementations for compatibility.
