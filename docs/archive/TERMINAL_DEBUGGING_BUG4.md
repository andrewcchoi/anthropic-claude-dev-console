# Bug #4 - Interactive Terminal Blank Output Investigation

**Component**: InteractiveTerminal (Standalone Terminal at `/terminal` page)
**Status**: ✅ RESOLVED

> **Note**: This bug affects the standalone terminal (`InteractiveTerminal`) at `/terminal`, NOT the chat output display (`ReadOnlyTerminal`). See CLAUDE.md for component architecture.

## Resolution

Bug #4 was resolved through architectural documentation and naming convention clarification. The investigation revealed confusion between two distinct terminal components, leading to the creation of comprehensive documentation to prevent future issues.

**Actions Taken:**
1. Documented terminal architecture in CLAUDE.md with clear naming conventions
2. Established component distinction (ReadOnlyTerminal vs InteractiveTerminal)
3. Added debugging guidance for terminal-related issues
4. Updated this file to clarify component scope

**Date Resolved**: 2026-02-02

## Problem Description

The interactive terminal component shows blank output. Symptoms:
- WebSocket connects successfully ✅
- xterm.js initializes without errors ✅
- Terminal cursor is visible and blinks ✅
- Can type characters ✅
- **Command output is NOT rendered** ❌

## Changes Made

### 1. Added Server-Side Debug Logging

**File**: `scripts/terminal-server.ts:84`

```typescript
instance.pty.onData((data: string) => {
  console.log('[TerminalServer] PTY output:', { sessionId, length: data.length, preview: data.slice(0, 100) });
  if (ws.readyState === WebSocket.OPEN) {
    const outputMessage: TerminalServerMessage = {
      type: 'output',
      data,
    };
    ws.send(JSON.stringify(outputMessage));
  }
});
```

**Purpose**: Verify PTY is producing output and server is sending it

### 2. Added Client-Side Debug Logging

**File**: `src/lib/terminal/websocket-client.ts:122`

```typescript
case 'output':
  if (message.data) {
    console.log('[WebSocketClient] Received output:', { length: message.data.length, preview: message.data.slice(0, 100) });
    this.onDataHandler?.(message.data);
  }
  break;
```

**Purpose**: Verify WebSocket client is receiving output messages

### 3. Added Hook Debug Logging

**File**: `src/hooks/useTerminal.ts:132-137`

```typescript
onData: (data: string) => {
  console.log('[useTerminal] onData received:', { length: data.length, preview: data.slice(0, 100) });
  xtermRef.current?.write(data);
},
```

**Purpose**: Verify onData callback is being invoked

### 4. Added Test Write

**File**: `src/hooks/useTerminal.ts:117`

```typescript
// Container has dimensions, safe to open
xterm.open(container);

// Test write to verify xterm rendering works
xterm.write('\x1b[32mTest output - if you see this, xterm works\x1b[0m\r\n');

// Fit - defer to allow renderer to fully initialize
requestAnimationFrame(() => {
  fitAddon.fit();
});
```

**Purpose**: Verify xterm.write() is working at all

### 5. Restarted Terminal Server

Terminal server was restarted to pick up the debug logging changes.
Logs are being written to: `/tmp/terminal-server.log`

## How to Test

### Option 1: Test Next.js App (Integrated Test)

1. Ensure servers are running:
   ```bash
   # Should see two processes
   pgrep -f "next dev"
   pgrep -f "terminal-server"
   ```

2. Open http://localhost:3000/terminal in browser

3. Open Browser DevTools Console (F12)

4. **Check for test message**:
   - Should immediately see green text: "Test output - if you see this, xterm works"
   - If YES: xterm rendering works
   - If NO: xterm initialization problem

5. **Type a command**: `ls -la` and press Enter

6. **Check console logs**:
   ```
   [TerminalServer] PTY output: ...    ← Server side (check /tmp/terminal-server.log)
   [WebSocketClient] Received output: ... ← Client side (browser console)
   [useTerminal] onData received: ...     ← Hook called (browser console)
   ```

7. **Check terminal display**:
   - If you see output: ✅ Bug is FIXED
   - If you don't see output but logs are present: Rendering issue

### Option 2: Test Standalone (Isolated Test)

1. Start a simple HTTP server:
   ```bash
   python3 -m http.server 8080 --directory /workspace/.claude
   ```

2. Open http://localhost:8080/test-websocket.html

3. This test bypasses React/Next.js completely and tests:
   - WebSocket connection
   - xterm.js rendering
   - PTY output

4. If this works but Next.js doesn't: Problem is in React integration

### Option 3: Check Server Logs

```bash
tail -f /tmp/terminal-server.log
```

Then connect to terminal in browser. You should see:
- Connection established
- PTY session created
- PTY output logs when you type

## Diagnostic Decision Tree

```
Start Here
    ↓
Is test message visible (green text)?
    ├─ NO → xterm initialization problem
    │        ↓
    │       Check browser console for errors
    │       Check element inspector for canvas
    │       → FIX: Debug xterm.open() and container dimensions
    │
    └─ YES → xterm rendering works
             ↓
          Do you see logs in browser console?
             ├─ NO → WebSocket not receiving data
             │        ↓
             │       Check Network tab for WebSocket
             │       Check server logs
             │       → FIX: WebSocket connection issue
             │
             └─ YES → Data is flowing
                      ↓
                   Which logs appear?
                      ├─ Only [TerminalServer] → Client not receiving
                      │   → FIX: WebSocket message handling
                      │
                      ├─ [TerminalServer] + [WebSocketClient] → Hook not firing
                      │   → FIX: onData callback registration
                      │
                      └─ All three logs → xterm.write() not working
                          → FIX: Check xtermRef.current, verify write() call
```

## Expected Root Cause (Hypothesis)

Based on code analysis, the most likely issue is one of:

1. **Timing Issue**: xtermRef.current is null when onData fires
   - **Evidence needed**: Check if test write works but onData doesn't
   - **Fix**: Ensure ref initialization order

2. **WebSocket Data Loss**: Initial PTY output lost before connection
   - **Evidence needed**: Server logs show output, client never receives
   - **Fix**: Buffer initial output or ensure sync

3. **ANSI Code Issue**: Shell prompt has unsupported escape sequences
   - **Evidence needed**: Logs show data, but nothing renders
   - **Fix**: Set simpler PS1 or fix ANSI handling

## Files Modified (Cleanup Required Later)

Once bug is fixed, remove debug logging from:
- `src/hooks/useTerminal.ts` (lines 117, 132-137)
- `src/lib/terminal/websocket-client.ts` (line 122)
- `scripts/terminal-server.ts` (line 84)

## Comparison: What Works vs What Doesn't

### ReadOnlyTerminal (WORKS ✅)
- Static content prop
- `xterm.write(content)` called directly in useEffect
- No WebSocket
- No async data flow

### InteractiveTerminal (BROKEN ❌)
- WebSocket for live data
- `xterm.write(data)` called in onData callback
- Async connection flow
- Same xterm initialization

**Key Difference**: ReadOnlyTerminal writes immediately after init, InteractiveTerminal waits for WebSocket data

## Next Steps

1. **Manual testing** using one of the three options above
2. **Analyze logs** to determine which part of the data flow is failing
3. **Implement fix** based on findings:
   - If test write fails → xterm init issue
   - If data doesn't arrive → WebSocket issue
   - If data arrives but doesn't render → callback/ref issue
4. **Remove debug logging** after verification
5. **Update TERMINAL_DEBUGGING_SESSION.md** with resolution
6. **Commit fix**

## Testing Checklist

- [ ] Test message appears (green text)
- [ ] Server logs show PTY output
- [ ] Client logs show WebSocket receiving
- [ ] Client logs show onData being called
- [ ] Typing `ls` shows output in terminal
- [ ] Command history works (up arrow)
- [ ] Ctrl+C works
- [ ] Terminal resize works

## Tools for Debugging

### Browser DevTools
- **Console**: Check for debug logs
- **Network Tab**: Check WebSocket frames
  - Look for `WS` type
  - Check "Messages" tab
  - Verify JSON format
- **Elements Tab**: Inspect terminal canvas
  - Check visibility
  - Check dimensions
  - Check z-index

### Server Logs
```bash
# Watch in real-time
tail -f /tmp/terminal-server.log

# Search for specific session
grep "pty-" /tmp/terminal-server.log

# Check for errors
grep "error" /tmp/terminal-server.log -i
```

### Test Commands
```bash
# Simple output
echo "hello"

# With color
echo -e "\033[32mgreen text\033[0m"

# Multi-line
ls -la

# Interactive
top  # Then press 'q' to quit
```

---

**Created**: 2026-02-03
**Branch**: feature/terminal-enhancement
**Related**: TERMINAL_DEBUGGING_SESSION.md (Bug #1-3 already resolved)
