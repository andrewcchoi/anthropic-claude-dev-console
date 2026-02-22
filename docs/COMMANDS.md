# Commands Reference

This document provides a complete reference for all slash commands available in the Claude Code Browser UI.

## Command Types

Commands are routed in two ways:

1. **Local Commands** (12 total) - Handled directly in the web UI (instant response, no network round-trip)
2. **CLI Passthrough Commands** - Sent to Claude CLI (skills, plugins, MCP tools)

## Local Commands

These commands are executed instantly in the browser without sending requests to the Claude CLI.

### `/help`

**Description**: Show help panel with available commands

**Handler**: `openHelpPanel`

**Output**: Opens help panel in sidebar with:
- List of all slash commands
- Keyboard shortcuts reference
- Feature overview
- Quick tips

**Example**:
```
/help
```

---

### `/clear`

**Description**: Clear the current chat history

**Handler**: `clearChat`

**Output**: Clears all messages in the current chat (does not delete session, only UI state)

**Keyboard Shortcut**: `Cmd/Ctrl + L`

**Example**:
```
/clear
```

**Note**: This only clears the UI. The session history is preserved in the CLI and can be reloaded.

---

### `/status`

**Description**: Show connection and session status

**Handler**: `openStatusPanel`

**Output**: Opens status panel showing:
- WebSocket connection status
- Current session ID
- CLI process health
- Server connectivity

**Example**:
```
/status
```

---

### `/cost`

**Description**: Scroll to usage and cost information

**Handler**: `scrollToUsage`

**Output**: Scrolls message list to the latest usage statistics display

**Use Case**: Quickly jump to cost breakdown after long conversation

**Example**:
```
/cost
```

---

### `/copy`

**Description**: Copy last assistant response to clipboard

**Handler**: `copyLastResponse`

**Output**: Copies the most recent assistant message to clipboard (plain text, markdown preserved)

**Success Indicator**: Toast notification confirming copy

**Example**:
```
/copy
```

---

### `/model`

**Description**: Open model selection panel

**Handler**: `openModelPanel`

**Output**: Opens panel to switch between Claude models:
- Claude Opus 4.6 (most capable)
- Claude Sonnet 4.5 (balanced)
- Claude Haiku 4 (fastest, cheapest)

**Example**:
```
/model
```

**Note**: Model selection persists across sessions.

---

### `/theme`

**Description**: Cycle through available themes

**Handler**: `cycleTheme`

**Output**: Cycles theme in order: auto → light → dark → auto

**Themes**:
- **auto**: Follows system preference
- **light**: Light mode
- **dark**: Dark mode (optimized for visibility)

**Persistence**: Theme preference saved to localStorage

**Example**:
```
/theme
```

---

### `/export`

**Description**: Export conversation to file (HTML, JSON, or Markdown)

**Handler**: `exportConversation`

**Formats**:
1. **HTML** (default) - Rich formatted export for Microsoft Word
2. **JSON** - Structured data export
3. **Markdown** - Plain text export

**Usage**:
```
/export           # Exports as HTML (Word-ready)
/export html      # Explicitly export as HTML
/export json      # Export as JSON
/export markdown  # Export as Markdown
/export md        # Export as Markdown (alias)
```

**HTML Export Features**:
- Preserves syntax highlighting
- Includes tool execution details
- Images embedded as base64
- Metadata header (session ID, timestamp, model)
- Filename: `claude-chat-{timestamp}.html`

**JSON Export Structure**:
```json
{
  "sessionId": "...",
  "timestamp": "...",
  "model": "claude-sonnet-4.5",
  "messages": [...],
  "usage": {...}
}
```

**Markdown Export**:
- GitHub-flavored markdown
- Code blocks preserved
- Tool outputs as blockquotes
- Minimal formatting

---

### `/todos`

**Description**: Show tasks and todos panel

**Handler**: `openTodosPanel`

**Output**: Opens panel displaying:
- Active tasks from Claude
- Task status (pending, in progress, completed)
- Checkboxes for completed items

**Example**:
```
/todos
```

---

### `/rename`

**Description**: Rename the current session

**Handler**: `openRenameDialog`

**Output**: Opens dialog to rename current session

**Validation**:
- Cannot be empty
- Max 100 characters

**Persistence**: Name saved immediately, visible in session list

**Example**:
```
/rename
```

---

### `/context` (Future)

**Description**: Open context panel

**Handler**: `openContextPanel`

**Output**: Opens panel showing current context (files, settings, etc.)

**Status**: Planned feature, not yet implemented

**Example**:
```
/context
```

---

### `/config` (Future)

**Description**: Open configuration panel

**Handler**: `openConfigPanel`

**Output**: Opens settings/configuration panel

**Status**: Planned feature, not yet implemented

**Example**:
```
/config
```

---

## CLI Passthrough Commands

All other commands starting with `/` are passed directly to the Claude CLI. This includes:

### Skills

Skills are specialized prompts that guide Claude's behavior.

**Examples**:
- `/commit` - Create a git commit
- `/debug` - Debug mode skill
- `/brainstorm` - Brainstorming skill
- `/review` - Code review skill

**Invocation**: Type skill name with `/` prefix

**Discovery**: Skills are loaded from Claude CLI on app startup. Use Command Palette (Cmd/Ctrl+K) to see all available skills.

### Plugins

Plugins extend Claude's capabilities with custom commands, agents, and tools.

**Examples**:
- `/plugin-name` - Invoke plugin-specific command

**Discovery**: Plugins are loaded from `~/.claude/plugins/`. Use Command Palette to see all available plugins.

### MCP Tools

Model Context Protocol tools provide access to external services.

**Examples**:
- `/mcp-server-name` - Invoke MCP server tool

**Discovery**: MCP servers configured in `.mcp.json`. Use Command Palette to see all available MCP tools.

## Command Palette

**Keyboard Shortcut**: `Cmd/Ctrl + K`

**Features**:
- Fuzzy search filtering
- Shows all available commands (local + CLI)
- Command descriptions
- Keyboard-driven navigation
- Auto-deduplication (skills appear in both skills and slash_commands arrays)

**Usage**:
1. Press `Cmd/Ctrl + K`
2. Type to filter commands
3. Use arrow keys to navigate
4. Press Enter to execute

**Example**: Type `/exp` → filters to `/export` command

## Command Routing Logic

Commands are routed as follows:

```
User Input → Command Router → Route Decision
                              ├─ Local Command → Execute in UI
                              └─ Passthrough → Send to CLI
```

**Local Commands**: Handled in `src/components/chat/ChatInput.tsx`

**Passthrough Commands**: Sent to CLI via SSE stream in `src/hooks/useClaudeChat.ts`

**Router**: `src/lib/commands/router.ts`

## Keyboard Shortcuts

| Shortcut | Command | Description |
|----------|---------|-------------|
| `Cmd/Ctrl + Enter` | Send | Send message |
| `Cmd/Ctrl + K` | Command Palette | Open command palette |
| `Cmd/Ctrl + L` | `/clear` | Clear chat |
| `Escape` | - | Close panels/dialogs |
| `Tab` | - | Autocomplete in command palette |

## Adding New Commands

### Local Commands

1. Add to `src/lib/commands/router.ts`:
   ```typescript
   const LOCAL_COMMANDS: Record<string, string> = {
     '/mycommand': 'handleMyCommand'
   };

   export const LOCAL_COMMAND_INFO: CommandInfo[] = [
     {
       command: '/mycommand',
       handler: 'handleMyCommand',
       description: 'My command description'
     }
   ];
   ```

2. Add handler in `src/components/chat/ChatInput.tsx`:
   ```typescript
   const handleMyCommand = () => {
     // Implementation
   };
   ```

3. Test in UI: Type `/mycommand` and verify it executes

### CLI Commands

CLI commands (skills, plugins) are defined in the Claude CLI ecosystem:

- **Skills**: `.claude/skills/*.md`
- **Plugins**: `~/.claude/plugins/*/plugin.json`
- **MCP**: `.mcp.json`

See Claude CLI documentation for creating skills and plugins.

## Troubleshooting

### Command not recognized

**Symptom**: Command does nothing when entered

**Causes**:
1. Typo in command name
2. Command not loaded (CLI not initialized)
3. Plugin not installed

**Fix**:
- Check spelling (use Command Palette to verify)
- Refresh page to reload CLI commands
- Verify plugin installed in `~/.claude/plugins/`

### Command executes twice

**Symptom**: Command handler called multiple times

**Causes**:
1. React Strict Mode (development only)
2. Event listener registered multiple times

**Fix**:
- Expected in development (Strict Mode mounts components twice)
- Should not happen in production build

### Command Palette empty

**Symptom**: Command Palette shows no commands

**Causes**:
1. CLI not initialized
2. Skills/commands not loaded

**Fix**:
- Refresh page (triggers CLI prewarm on mount)
- Check browser console for initialization errors
- Verify Claude CLI installed and working

### Export fails

**Symptom**: `/export` command does nothing or errors

**Causes**:
1. No messages in chat
2. Browser blocks download

**Fix**:
- Ensure at least one message exists
- Check browser download settings
- Look for download prompt in address bar

## Command Best Practices

1. **Use Command Palette**: Discover commands with `Cmd/Ctrl + K` instead of memorizing
2. **Check descriptions**: Command descriptions explain what each command does
3. **Local vs CLI**: Local commands are instant, CLI commands may take longer
4. **Export early**: Export important conversations regularly (no undo for `/clear`)
5. **Rename sessions**: Use `/rename` to organize sessions with descriptive names

## References

- [Features Guide](FEATURES.md) - Full feature documentation
- [Architecture](ARCHITECTURE.md) - How commands are routed
- [Development Guide](DEVELOPMENT.md) - Adding new commands
- [CLAUDE.md](../CLAUDE.md) - Project instructions
