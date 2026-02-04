# Slash Commands Implementation

## Overview

This document describes the implementation of full slash command support in the web UI. The web UI now captures command information from the CLI's `system.init` message and routes commands appropriately between local UI handlers and CLI passthrough.

## Implementation Summary

### Phase 1: Type Extensions (`src/types/claude.ts`)

Added new fields to `SDKMessage` interface to capture init data:
- `slash_commands?: string[]` - All available slash commands
- `skills?: string[]` - Available skill commands
- `plugins?: Array<{ name: string; path: string }>` - Installed plugins
- `mcp_servers?: Array<{ name: string; status: string }>` - MCP server status
- `cwd?: string` - Working directory
- `claude_code_version?: string` - CLI version
- `agents?: string[]` - Available agents

### Phase 2: Store Extensions (`src/lib/store/index.ts`)

Added state and actions to Zustand store:
- **State**: `availableCommands`, `availableTools`, `availableSkills`, `mcpServers`, `cliVersion`, `workingDirectory`, `activePermissionMode`
- **UI State**: `isStatusPanelOpen`, `isHelpPanelOpen`
- **Actions**: `setInitInfo()`, `setStatusPanelOpen()`, `setHelpPanelOpen()`, `clearChat()`

### Phase 3: Init Data Capture (`src/hooks/useClaudeChat.ts`)

Modified the `system.init` message handler to call `setInitInfo()` with all captured data from the CLI, including model, session ID, tools, commands, skills, MCP servers, CLI version, working directory, and permission mode.

### Phase 4: Command Router (`src/lib/commands/router.ts`)

Created a command routing system that categorizes commands:
- **Local commands** (handled in UI): `/help`, `/clear`, `/status`, `/cost`, `/context`, `/config`
- **Passthrough commands**: All skills, plugins, and other slash commands go to CLI

### Phase 5: Command Interception (`src/components/chat/ChatInput.tsx`)

Modified `handleSend()` to:
1. Route commands using `routeCommand()`
2. Handle local commands directly (open panels, clear chat, scroll to usage)
3. Pass through all other commands to CLI

### Phase 6: Sidebar Footer (`src/components/sidebar/Sidebar.tsx`)

Extended the sidebar footer to display init information:
- Model name
- Working directory (from init, not hardcoded)
- Permission mode
- Tools count
- MCP servers status (connected/total)
- CLI version

### Phase 7: UI Panels

Created two new modal panels:

#### HelpPanel (`src/components/panels/HelpPanel.tsx`)
- Shows all available commands grouped by type (Built-in, Skills, Plugins)
- Commands are color-coded (blue, purple, green)
- Click a command to insert it into chat input
- Triggered by `/help` command

#### StatusPanel (`src/components/panels/StatusPanel.tsx`)
- Shows comprehensive session information
- Lists all tools, skills, and MCP servers with status indicators
- Displays session ID, model, working directory, permission mode, CLI version
- Triggered by `/status` command

## File Structure

```
src/
├── types/
│   └── claude.ts                     # Extended SDKMessage with init fields
├── lib/
│   ├── store/
│   │   └── index.ts                  # Added init state and panel toggles
│   └── commands/
│       └── router.ts                 # NEW: Command routing logic
├── hooks/
│   └── useClaudeChat.ts              # Captures full init data
├── components/
│   ├── chat/
│   │   └── ChatInput.tsx             # Intercepts and routes commands
│   ├── sidebar/
│   │   └── Sidebar.tsx               # Extended footer with init values
│   ├── usage/
│   │   └── UsageDisplay.tsx          # Added data-usage-display attribute
│   └── panels/
│       ├── HelpPanel.tsx             # NEW: Command list panel
│       ├── StatusPanel.tsx           # NEW: Session status panel
│       └── index.ts                  # NEW: Panel exports
└── app/
    └── page.tsx                      # Added HelpPanel and StatusPanel
```

## How It Works

### Command Flow

```
User types command → ChatInput.handleSend()
                         ↓
                   routeCommand()
                    /         \
              LOCAL        PASSTHROUGH
               ↓                ↓
        Execute in UI     Send to CLI
        (panels, etc.)    (skills, etc.)
```

### Local Commands

| Command | Action |
|---------|--------|
| `/help` | Opens HelpPanel showing all available commands |
| `/clear` | Clears chat messages locally |
| `/status` | Opens StatusPanel with session info |
| `/cost` | Scrolls to UsageDisplay (already visible in UI) |
| `/context` | Future: context visualization (currently passes to CLI) |
| `/config` | Future: config panel (currently passes to CLI) |

### Passthrough Commands

All other commands go to the CLI:
- Skill commands (e.g., `/commit`, `/brainstorm`, `/review`)
- Plugin commands (e.g., any custom plugins)
- Any other `/command` not in the local list

## Testing

### 1. Start a New Chat
- The `system.init` event should populate the sidebar footer with:
  - Model name
  - Working directory from CLI (not hardcoded `/workspace`)
  - Permission mode
  - Tools count
  - MCP servers (if any)
  - CLI version

### 2. Type `/help`
- HelpPanel should open
- Commands should be grouped by type
- Click a command → it inserts into chat input
- Close panel and command is ready to send

### 3. Type `/status`
- StatusPanel should open
- Shows session ID, model, directory, mode
- Lists all tools with checkmarks
- Shows skills (if any)
- Shows MCP servers with status (if any)

### 4. Type `/clear`
- Chat messages should clear locally
- Input should clear
- No message sent to CLI

### 5. Type `/cost`
- Page should scroll to UsageDisplay at bottom
- Smooth scroll animation

### 6. Type `/commit` (or any skill command)
- Should pass through to CLI
- Skill should execute normally (works in `-p` mode)

### 7. Type `/brainstorm` (or any other skill)
- Should pass through to CLI
- Works as expected

## Verification Checklist

- [x] Types extended with init fields
- [x] Store has init state and panel toggles
- [x] `useClaudeChat` captures full init data
- [x] Command router categorizes commands correctly
- [x] ChatInput intercepts and routes commands
- [x] Sidebar footer displays init values dynamically
- [x] HelpPanel shows all commands grouped by type
- [x] StatusPanel shows comprehensive session info
- [x] Panels added to main layout
- [x] UsageDisplay has data attribute for scrolling
- [x] Dev server builds without errors

## Future Enhancements

1. **Context Panel**: Visualize conversation context/token usage
2. **Config Panel**: Inline settings editor
3. **Command Autocomplete**: Show suggestions as user types `/`
4. **Command History**: Track recently used commands
5. **Keyboard Shortcuts**: Hotkeys for common commands
6. **Command Aliases**: User-defined shortcuts

## Architecture Decisions

### Why Route in ChatInput?
- Single point of control for command handling
- Can intercept before network call
- Consistent UX for all commands

### Why Separate Panels?
- Modular, reusable components
- Easy to extend with new panels
- Keeps main layout clean

### Why Store Init Data?
- Eliminates hardcoded values
- Reflects actual CLI state
- Enables dynamic UI updates

### Why Local Commands?
- Instant response (no network round-trip)
- Works even if CLI connection fails
- Better UX for UI-specific features
