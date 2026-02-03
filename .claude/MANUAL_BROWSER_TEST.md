# Manual Browser Testing Guide

## Quick Start

```bash
# Start both servers (runs in foreground)
npm run dev
```

**Then open**: http://localhost:3000/terminal

## What to Test

### 1. Connection
- [ ] Terminal appears with black background
- [ ] No error messages in browser console
- [ ] Connection status shows "connected"

### 2. Basic Commands
```bash
ls -la
pwd
echo "Hello Terminal"
date
whoami
```

### 3. Interactive Commands
```bash
# Should see colored output
ls --color=auto

# Try tab completion
cd /wo<TAB>

# Try command history
<UP ARROW> # Should show previous command
```

### 4. Terminal Features
- [ ] Copy/paste works
- [ ] Resize window - terminal should adapt
- [ ] Scroll back through history
- [ ] Click links (if any appear in output)

### 5. Edge Cases
```bash
# Long output
find /workspace

# Clear screen
clear

# Exit shell (should show exit message)
exit
```

## Expected Behavior

### On Connection
- WebSocket connects to `ws://localhost:3001/terminal`
- Server spawns PTY session
- Shell prompt appears (usually `$` or `#`)

### On Input
- Characters appear as you type
- Commands execute when you press Enter
- Output streams back in real-time

### On Resize
- Terminal automatically fits container
- Server receives resize message
- PTY adjusts cols/rows

### On Disconnect
- Terminal shows "disconnected" status
- Can reconnect by refreshing page
- Server cleans up PTY session

## Troubleshooting

### Terminal doesn't appear
1. Check browser console for errors
2. Verify servers are running:
   ```bash
   curl http://localhost:3001/health
   curl http://localhost:3000
   ```

### Can't type or see output
1. Check WebSocket connection in browser DevTools (Network tab)
2. Look for error messages in terminal server logs
3. Verify port 3001 is not blocked

### Connection keeps dropping
1. Check terminal server logs for errors
2. Look for memory/CPU issues
3. Verify no firewall blocking WebSocket connections

## Browser Console Commands

Open browser DevTools console and try:

```javascript
// Check WebSocket status
window.wsClient?.isConnected()

// Get session ID
window.wsClient?.getSessionId()
```

## Server Logs

Watch server logs in the terminal where you ran `npm run dev`:

```
[TerminalServer] New WebSocket connection
[TerminalServer] Created PTY session <uuid>
[WebSocketClient] Connected to terminal server
[WebSocketClient] Session established: <uuid>
```

## Success Criteria

- ✅ Terminal connects without errors
- ✅ Can execute basic shell commands
- ✅ Output appears in real-time
- ✅ Can resize terminal window
- ✅ Can scroll through command history
- ✅ Copy/paste works
- ✅ Terminal cleans up on disconnect
