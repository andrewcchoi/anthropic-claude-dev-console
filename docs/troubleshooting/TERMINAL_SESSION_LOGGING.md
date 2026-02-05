# Terminal Session Resumption - Troubleshooting Logs

This document describes all logging events for debugging terminal session resumption functionality.

## Overview

The terminal session resumption feature allows users to open a standalone terminal that automatically connects to their active Claude session. This involves several components working together, each with comprehensive logging.

## Enabling Debug Mode

### Quick Method: Settings Panel Button

1. Open Settings panel (gear icon on right side)
2. Click **"Debug Logs"** button
3. Debug mode is automatically enabled AND logs page opens in new tab
4. Reload the main page to see debug logs in console

### Manual Method: Browser Console

To see all debug logs in the browser:

```javascript
// In browser console
localStorage.setItem('DEBUG_MODE', 'true')
// Reload page
location.reload()
```

To disable:

```javascript
localStorage.removeItem('DEBUG_MODE')
location.reload()
```

## Log Flow for Session Resumption

### 1. User Clicks "Open Terminal" Button

**Component:** `RightPanel.tsx`
**Module:** `RightPanel`

```
INFO: Opening terminal in new tab
Data: {
  hasSession: boolean,
  sessionId: string (first 8 chars) | null,
  url: string
}
```

**What to check:**
- `hasSession` should be `true` when a chat session is active
- `sessionId` should match the current chat session
- `url` should include `?sessionId=` parameter when hasSession is true

---

### 2. Terminal Page Loads

**Component:** `terminal/page.tsx`
**Module:** `TerminalPage`

```
INFO: Terminal page loaded with session
Data: {
  sessionId: string,
  sessionIdShort: string (first 8 chars)
}
```

Or without session:

```
INFO: Terminal page loaded without session
```

**What to check:**
- Session ID should match what was passed from RightPanel
- If missing, check URL query parameters

```
DEBUG: Constructed initial command for session resumption
Data: {
  sessionId: string (first 8 chars),
  command: string (trimmed)
}
```

**What to check:**
- Command should be: `claude --allow-dangerously-skip-permissions --resume <full-session-id>`
- Command should end with `\n` (newline for auto-execution)

---

### 3. InteractiveTerminal Mounts

**Component:** `InteractiveTerminal.tsx`
**Module:** `InteractiveTerminal`

```
INFO: InteractiveTerminal mounted
Data: {
  cwd: string | undefined,
  hasInitialCommand: boolean,
  initialCommand: string | undefined,
  theme: 'light' | 'dark'
}
```

**What to check:**
- `hasInitialCommand` should be `true` for session resumption
- `initialCommand` should contain `claude -p --resume`

---

### 4. Terminal Hook Initialization

**Component:** `useTerminal.ts`
**Module:** `useTerminal`

```
INFO: Terminal connect initiated
Data: {
  cwd: string | undefined,
  theme: 'light' | 'dark',
  hasInitialCommand: boolean
}
```

```
DEBUG: Creating xterm instance
```

**What to check:**
- Hook is being called with correct parameters
- No errors during xterm initialization

---

### 5. WebSocket Connection

**Component:** `useTerminal.ts`
**Module:** `useTerminal`

```
DEBUG: Creating WebSocket client
Data: { cwd: string | undefined }
```

```
INFO: Attempting WebSocket connection
Data: { cwd: string | undefined }
```

**Component:** `websocket-client.ts`
**Module:** `WebSocketClient`

```
DEBUG: Connecting
Data: { url: string, cwd: string | undefined }
```

```
INFO: Connected to terminal server
```

```
INFO: Session established
Data: { sessionId: string }
```

**What to check:**
- WebSocket URL should be `ws://localhost:3001/terminal` (or configured URL)
- Session established message confirms PTY session created
- Session ID from WebSocket is different from Claude session ID (this is the PTY session)

---

### 6. Terminal Connected Callback

**Component:** `useTerminal.ts`
**Module:** `useTerminal`

```
INFO: WebSocket connected successfully
Data: {
  sessionId: string (first 8 chars) - PTY session,
  hasInitialCommand: boolean
}
```

**Component:** `InteractiveTerminal.tsx`
**Module:** `InteractiveTerminal`

```
INFO: Terminal connected
Data: {
  sessionId: string (first 8 chars) - PTY session,
  cwd: string | undefined
}
```

**What to check:**
- Both log messages should appear
- `hasInitialCommand` should be `true`

---

### 7. Initial Command Execution

**Component:** `useTerminal.ts`
**Module:** `useTerminal`

```
INFO: Sending initial command to terminal
Data: {
  command: string (trimmed),
  sessionId: string (first 8 chars) - PTY session,
  totalSentCommands: number
}
```

Or if duplicate detected:

```
WARN: Initial command already sent (duplicate prevented)
Data: {
  command: string (trimmed),
  sessionId: string (first 8 chars) - PTY session
}
```

**Component:** `websocket-client.ts`
**Module:** `WebSocketClient`

```
INFO: Sending Claude CLI command to terminal
Data: {
  command: string (trimmed),
  sessionId: string (first 8 chars) - PTY session
}
```

**What to check:**
- Command should be: `claude --allow-dangerously-skip-permissions --resume <claude-session-id>`
- Module-level gate prevents duplicate connections across React Strict Mode remounts
- "Sending initial command" should appear only once
- If "duplicate prevented" appears, React Strict Mode caused remount (expected in dev)
- Appears 100ms after connection (small delay for terminal readiness)
- `totalSentCommands` shows how many unique commands have been sent this session

**Fix History (Issue #3, #6 from Issue #20):**
- Previous implementation used `setTimeout(0)` debounce which was insufficient
- Race condition: Two concurrent `onConnected` callbacks could both pass the `sentCommands.has()` check
- Solution: Module-level `connectionInitiated` flag gates connection attempts BEFORE any async operations
- See `src/hooks/useTerminal.ts:85-93` for connection gate implementation

---

### 8. Command Output

**Component:** `websocket-client.ts`
**Module:** `WebSocketClient`

```
DEBUG: (No specific log for output data)
```

**What to check:**
- Terminal UI should show Claude CLI output
- Look for Claude's welcome message and session resumption confirmation
- If blank, check WebSocket `output` messages are being received

---

## Error Scenarios

### WebSocket Connection Failed

```
ERROR: WebSocket error
Data: { url: string, readyState: number }
```

```
ERROR: Terminal connection failed
Data: {
  error: string,
  cwd: string | undefined,
  hasInitialCommand: boolean,
  stack: string | undefined
}
```

**Component:** `InteractiveTerminal.tsx`
**Module:** `InteractiveTerminal`

```
ERROR: Terminal error
Data: {
  error: string,
  cwd: string | undefined,
  initialCommand: string | undefined
}
```

**Common causes:**
- Terminal server not running (check `npm run dev:terminal` or port 3001)
- WebSocket URL incorrect
- Firewall blocking WebSocket connections
- Port 3001 already in use

---

### Session Resumption Failed

If the initial command executes but Claude fails to resume:

**Look for in terminal output:**
- `Session not found` - The Claude session ID is invalid or expired
- `Permission denied` - File permissions issue on session file
- `Invalid session format` - Session file corrupted

**Check:**
- Session file exists: `~/.claude/projects/-workspace/<session-id>.jsonl`
- Session ID matches between chat UI and terminal URL
- Session hasn't been deleted or moved

---

### Terminal Container Not Ready

```
ERROR: Terminal container ref is not available
Data: { errorMsg: string }
```

```
ERROR: Terminal container never received dimensions after 50 attempts
```

**Common causes:**
- React rendering issue
- CSS display issue (container hidden or zero-size)
- Component unmounted too quickly

---

### Component Unmounted During Connection

```
WARN: Terminal connected but component unmounted
Data: { sessionId: string }
```

```
WARN: Connection complete but component unmounted, closing
```

```
DEBUG: Connection error but component unmounted
Data: { error: Error }
```

**Common causes:**
- React Strict Mode double-mounting in development
- User closed tab during connection
- Navigation away from page

**Note:** These are expected in development mode and are handled gracefully.

---

## Disconnection Events

### Normal Disconnection

**Component:** `useTerminal.ts`
**Module:** `useTerminal`

```
INFO: Terminal disconnect requested
Data: {
  wasConnected: boolean,
  sessionId: string (first 8 chars) | 'none'
}
```

### Terminal Process Exited

**Component:** `useTerminal.ts`
**Module:** `useTerminal`

```
INFO: Terminal session exited
Data: {
  exitCode: number,
  sessionId: string (first 8 chars) | 'none'
}
```

**Component:** `websocket-client.ts`
**Module:** `WebSocketClient`

```
INFO: Terminal exited
Data: { code: number }
```

**Exit codes:**
- `0` - Normal exit
- `130` - Terminated by Ctrl+C
- Other codes - Error exit (check terminal output)

---

## Log Viewing

### Browser Console

All logs appear in the browser console with colored badges:

- 🟦 **DEBUG** - Gray - Detailed execution flow
- 🟦 **INFO** - Blue - Important events
- 🟨 **WARN** - Yellow - Non-critical issues
- 🟥 **ERROR** - Red - Failures

### Real-time Log Stream

Access the log viewer:
```
http://localhost:3000/logs
```

Shows server-side and client-side logs in real-time.

---

## Complete Session Resumption Flow

Successful session resumption produces this log sequence:

```
1. RightPanel: INFO - Opening terminal in new tab (hasSession: true)
2. TerminalPage: INFO - Terminal page loaded with session
3. TerminalPage: DEBUG - Constructed initial command (claude --allow-dangerously-skip-permissions --resume...)
4. InteractiveTerminal: INFO - InteractiveTerminal mounted (hasInitialCommand: true)
5. useTerminal: INFO - Terminal connect initiated
6. useTerminal: DEBUG - Creating xterm instance
7. useTerminal: DEBUG - Creating WebSocket client
8. useTerminal: INFO - Attempting WebSocket connection
9. WebSocketClient: DEBUG - Connecting
10. WebSocketClient: INFO - Connected to terminal server
11. WebSocketClient: INFO - Session established (PTY session)
12. useTerminal: INFO - WebSocket connected successfully
13. InteractiveTerminal: INFO - Terminal connected (willSendCommand: true)
14. useTerminal: INFO - Sending initial command to terminal (totalSentCommands: 1)
15. WebSocketClient: INFO - Sending Claude CLI command to terminal
16. [Claude CLI output appears in terminal]

In React Strict Mode (development), you may see a second mount:
17. InteractiveTerminal: INFO - InteractiveTerminal mounted (hasInitialCommand: true)
18. [Second connection attempt]
19. useTerminal: WARN - Initial command already sent (duplicate prevented)
20. [No duplicate command sent - module-level Set prevents it]
```

---

## Troubleshooting Checklist

If terminal session resumption isn't working:

1. **Check browser console for logs**
   - Enable DEBUG_MODE
   - Look for ERROR or WARN messages
   - Follow the log sequence above

2. **Verify session ID flow**
   - Session ID in RightPanel log matches chat session
   - Session ID in URL query parameter
   - Session ID passed to initialCommand

3. **Check WebSocket connection**
   - Terminal server running on port 3001
   - "Connected to terminal server" message appears
   - No WebSocket errors

4. **Verify command execution**
   - "Sending Claude CLI command" log appears
   - Command is `claude -p --resume <session-id>`
   - Terminal shows Claude output

5. **Check session file**
   ```bash
   ls -la ~/.claude/projects/-workspace/<session-id>.jsonl
   ```
   - File exists
   - Has read permissions
   - Not corrupted (valid JSONL format)

6. **Test terminal without session**
   - Open `/terminal` directly (without query param)
   - Should connect to blank terminal
   - If this fails, issue is with terminal server

7. **Test Claude CLI manually**
   ```bash
   claude --allow-dangerously-skip-permissions --resume <session-id>
   ```
   - Should resume session successfully
   - If this fails, issue is with Claude CLI or session

---

## Related Documentation

- [Terminal Architecture](../architecture/TERMINAL.md)
- [WebSocket Protocol](../protocols/WEBSOCKET.md)
- [Session Management](./SESSION_MANAGEMENT.md)
- [General Troubleshooting](./TROUBLESHOOTING_GUIDE.md)
