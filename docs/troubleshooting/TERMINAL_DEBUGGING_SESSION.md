# Terminal Debugging Session - February 2026

**Session Date:** February 2-3, 2026
**Branch:** `feature/terminal-enhancement`
**Context:** Implementing Bash tool output display in terminal UI

---

## Overview

This document records a comprehensive debugging session focused on getting Bash tool output to display correctly in the terminal UI. Multiple interconnected issues were discovered and resolved.

---

## Bug #1: Bash Tool Output Not Displaying ✅ RESOLVED

**Commit:** `778c0ef` - fix(terminal): Display Bash tool output by preserving tool_use blocks

### Problem Description

The Bash tool was executing commands but the output was not displaying in the terminal UI. The terminal would show the command input but the output section remained empty.

### Root Cause

**ID Mismatch Between Streaming and Final Messages:**

During streaming, `content_block_start` events sometimes don't include a tool `id`, causing the code to generate fallback IDs:

```typescript
// Generated fallback ID
const toolId = toolBlock.id || `tool-${Date.now()}`;  // e.g., "tool-1738542228586"
```

When the final `assistant` message arrived, it contained the real tool ID from Claude:

```typescript
// Real Claude ID
{
  type: "tool_use",
  id: "toolu_01AbCdEfGhIjKlMnOpQrStUv",
  name: "Bash",
  input: { command: "ls -la" }
}
```

### The Merge Problem

The original deduplication logic tried to merge by ID but failed:

```typescript
// BROKEN: Two different IDs, no deduplication
const toolUseById = new Map<string, any>();
existingToolUseBlocks.forEach(block => {
  if (block.id) toolUseById.set(block.id, block);  // Sets 'tool-1738542228586'
});
incomingToolUseBlocks.forEach(block => {
  if (block.id) toolUseById.set(block.id, block);  // Sets 'toolu_01AbC...'
});
// Result: TWO tool_use blocks in state - one with output, one without!
```

### Solution

**File:** `src/hooks/useClaudeChat.ts` (Lines 130-156)

Simplified the merge logic to trust the `assistant` message instead of trying to deduplicate:

```typescript
// Keep streaming text (incrementally built) but replace tool_use blocks entirely
const existingTextBlocks = currentContent.filter(c => c.type === 'text');

// Map incoming content from assistant message (has correct tool IDs)
const incomingContent = message.message.content.map((block: any) => ({
  type: block.type,
  text: block.text,
  id: block.id,
  name: block.name,
  input: block.input,
}));

const incomingToolUseBlocks = incomingContent.filter(c => c.type === 'tool_use');
const incomingTextBlocks = incomingContent.filter(c => c.type === 'text');

// Use incoming tool_use blocks (they have real IDs from Claude)
// For text: prefer incoming if present, else use streaming text
const finalTextBlocks = incomingTextBlocks.length > 0 ? incomingTextBlocks : existingTextBlocks;
currentContent = [...incomingToolUseBlocks, ...finalTextBlocks];
```

### Additional Improvements

The commit also added:
- `cwd` parameter support for terminal sessions
- `input_json_delta` streaming event handling
- Terminal session management in store
- Improved bash output extraction for various formats

### Files Modified
- `src/hooks/useClaudeChat.ts` - Fixed content merging logic
- `src/components/chat/ToolExecution.tsx` - Enhanced output display
- `src/lib/store/index.ts` - Added terminal session management
- `src/components/chat/MessageContent.tsx` - Improved rendering
- `scripts/terminal-server.ts` - Added cwd support
- `src/lib/terminal/websocket-client.ts` - Enhanced WebSocket handling

### Verification

```bash
# Test with manual UI
1. Open http://localhost:3000
2. Send: "Use the Bash tool to run: ls -la"
3. Verify tool execution auto-expands with output

# Test with test page
open http://localhost:3000/test-bash-tool-ui.html
```

**Expected:** All 4 checkboxes pass:
- ✅ Received 'assistant' message with tool_use
- ✅ Received 'user' message with tool_result
- ✅ Tool result has output content
- ✅ Received 'result' with success

---

## Bug #2: Invalid Session ID Format ✅ RESOLVED

**Fixed in:** Session validation implementation

### Problem Description

The test page was generating session IDs using `'test-' + Date.now()` format (e.g., `test-1738542228586`), but the Claude CLI requires valid UUIDs in the format `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`.

### Error Message

```bash
curl -X POST http://localhost:3000/api/claude \
  -d '{"prompt": "ls", "sessionId": "test-12345"}'

# Error: Invalid session ID. Must be a valid UUID.
```

### Solution Part 1: Fix Test Page

**File:** `public/test-bash-tool-ui.html` (Line 160)

```javascript
// Before:
sessionId: 'test-' + Date.now()

// After:
sessionId: crypto.randomUUID()
```

### Solution Part 2: Server-Side Validation

**File:** `src/app/api/claude/route.ts` (Lines 49-67)

```typescript
// Validate sessionId is a valid UUID format if provided
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let validSessionId = sessionId;

if (sessionId && !uuidRegex.test(sessionId)) {
  // Generate a new UUID if invalid format provided
  validSessionId = crypto.randomUUID();
  log.warn('Invalid sessionId format, generated new UUID', {
    original: sessionId,
    generated: validSessionId
  });
}

// Use validSessionId in CLI arguments
if (sessionExists) {
  args.push('--resume', validSessionId);
} else {
  args.push('--session-id', validSessionId);
}
```

### Impact

- Test page now generates valid UUIDs
- Server auto-corrects invalid session IDs (defensive programming)
- Better error logging for session ID issues
- Prevents Claude CLI rejections

---

## Bug #3: xterm.js RenderService Dimensions Error ✅ RESOLVED

**Commit:** `db03aa7` - fix(terminal): Wait for container dimensions before xterm.open()

### Problem Description

The terminal component was throwing errors when trying to initialize:

```
TypeError: Cannot read properties of undefined (reading 'dimensions')
  at Viewport.tsx (xterm.js internal)
```

### Root Cause

**Race Condition with Container Dimensions:**

1. React rendered the container `<div>` with `h-full` class
2. Immediately called `xterm.open(containerRef.current)`
3. Container's computed height was still `0` (CSS not yet applied)
4. xterm.js Viewport tried to access `RenderService.dimensions` before renderer initialized

```typescript
// BROKEN: Opens immediately, container might have 0 dimensions
useEffect(() => {
  if (containerRef.current) {
    xterm.open(containerRef.current);  // ❌ Too early!
    const observer = new ResizeObserver(handleResize);
    observer.observe(containerRef.current);
  }
}, []);
```

### Solution: Dimension-Aware Initialization

**Files Modified:**
- `src/components/terminal/ReadOnlyTerminal.tsx`
- `src/hooks/useTerminal.ts`

**Implementation:**

```typescript
const openWhenReady = () => {
  if (!containerRef.current || !terminal) return;

  const rect = containerRef.current.getBoundingClientRect();

  // Wait for valid dimensions
  if (rect.width > 0 && rect.height > 0) {
    try {
      terminal.open(containerRef.current);

      // Set up ResizeObserver AFTER successful open
      const observer = new ResizeObserver(() => {
        terminal.fit();
      });
      observer.observe(containerRef.current);
      setResizeObserver(observer);
    } catch (error) {
      console.error('Failed to open terminal:', error);
    }
  } else {
    // Retry on next animation frame
    rafIdRef.current = requestAnimationFrame(openWhenReady);
  }
};

useEffect(() => {
  openWhenReady();

  return () => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }
    if (resizeObserver) {
      resizeObserver.disconnect();
    }
  };
}, [terminal, containerRef.current]);
```

### How It Works

1. Check container dimensions with `getBoundingClientRect()`
2. Only call `xterm.open()` when `width > 0 && height > 0`
3. Use `requestAnimationFrame()` to retry if dimensions not ready
4. Move `ResizeObserver` setup into success branch
5. Proper cleanup of animation frames and observers

### Benefits

- No more RenderService errors
- Handles CSS animation delays gracefully
- Works with Tailwind's `h-full` and other dynamic sizing
- Proper resource cleanup on unmount

---

## Bug #4: Terminal Emulator Blank Output ⚠️ UNRESOLVED

### Problem Description

After all the above fixes, the **InteractiveTerminal** component (the actual terminal emulator that allows user input) still shows blank output in some scenarios. The **ReadOnlyTerminal** component (used for tool output display) works correctly.

### Known Symptoms

- ReadOnlyTerminal displays Bash tool output correctly ✅
- InteractiveTerminal receives WebSocket messages ✅
- xterm.js initializes without errors ✅
- Terminal cursor is visible and responsive ✅
- **BUT:** Command output is not rendered in the terminal display ❌

### Suspected Causes (Not Confirmed)

1. **WebSocket Data Format Mismatch:**
   - Terminal server sends data in a format xterm doesn't recognize
   - Possible encoding issues (UTF-8, base64, etc.)

2. **xterm.js Write Buffer Issues:**
   - Data is written to terminal but not flushed to display
   - Possible issue with `terminal.write()` vs `terminal.writeln()`

3. **CSS/Z-Index Rendering:**
   - Terminal canvas is rendered but hidden behind another element
   - Viewport positioning issue

4. **Terminal Addon Conflict:**
   - FitAddon or other addons interfering with data rendering
   - Addon initialization order problem

### Debugging Steps Taken

1. ✅ Verified WebSocket connection established
2. ✅ Confirmed messages received in browser console
3. ✅ Checked xterm.js initialization (no errors)
4. ✅ Verified container dimensions (width > 0, height > 0)
5. ❌ Not yet tested: Raw xterm.write() with known-good data
6. ❌ Not yet tested: Terminal addon isolation
7. ❌ Not yet tested: Alternative data formats

### Next Investigation Steps

```typescript
// 1. Test direct write to terminal
useEffect(() => {
  if (terminal) {
    terminal.write('Test output\r\n');  // Should appear immediately
  }
}, [terminal]);

// 2. Log WebSocket data format
socket.on('message', (data) => {
  console.log('Raw WS data:', data);
  console.log('Data type:', typeof data);
  console.log('Is Buffer:', Buffer.isBuffer(data));
});

// 3. Verify terminal write calls
const originalWrite = terminal.write.bind(terminal);
terminal.write = (data: string | Uint8Array) => {
  console.log('Terminal.write() called with:', data);
  return originalWrite(data);
};
```

### Workaround

For Bash tool output, use the **ToolExecution** component which displays output correctly via ReadOnlyTerminal. The InteractiveTerminal is only needed for direct shell access.

### Related Files

- `src/components/terminal/InteractiveTerminal.tsx` - Main terminal component
- `src/hooks/useTerminal.ts` - Terminal connection and message handling
- `src/lib/terminal/websocket-client.ts` - WebSocket client
- `scripts/terminal-server.ts` - WebSocket server

---

## Testing Tools Created

### 1. Test HTML Page (KEPT)

**File:** `public/test-bash-tool-ui.html`

A dark-themed manual testing UI with:
- Preset test buttons (ls, echo, pwd, non-tool prompts)
- Real-time SSE event monitor
- Verification checklist with auto-updating status
- Event type filtering
- Full event payload display

**Usage:**
```bash
open http://localhost:3000/test-bash-tool-ui.html
```

**Value:** User explicitly requested keeping this for quick manual tests.

### 2. CLI Test Script (DELETED)

**File:** `test-bash-tool-flow.sh` (removed during cleanup)

Bash script that tested CLI directly and provided manual test instructions. Less comprehensive than the HTML test page, so it was removed.

### 3. Debugging Markdown Files (DELETED)

Files removed during cleanup (all content merged into this document):
- `BASH_TOOL_FIX_APPLIED.md` - ID mismatch documentation
- `BASH_TOOL_FIX_SUMMARY.md` - UUID validation documentation
- `BASH_TOOL_INVESTIGATION_RESULTS.md` - Investigation results
- `BASH_TOOL_VERIFICATION.md` - Status updates
- `DEBUG_BASH_TOOL.md` - Debugging journal

**Reason for removal:** Fixes documented in commit history, ~80% content overlap, debugging artifacts no longer needed.

---

## Key Learnings

### 1. Test with Real Tool-Invoking Prompts

**Problem:** Early tests used simple prompts like "hello" which don't invoke tools, leading to false negative results.

**Solution:** Always test with explicit tool invocation:
```
✅ "Use the Bash tool to run: ls -la"
✅ "Run the command: pwd"
❌ "hello" (won't invoke tools)
```

### 2. Trust the Final Message

When dealing with streaming APIs, the final `assistant` message is the authoritative source. Trying to merge streaming and final states often introduces bugs.

### 3. Dimension Timing Matters

Modern CSS (flexbox, grid, animations) can delay when elements receive their final dimensions. Always check `getBoundingClientRect()` before assuming a container is ready.

### 4. ID Consistency is Critical

Tool IDs must be consistent throughout the message lifecycle. Generating fallback IDs can break the connection between tool invocations and their results.

---

## Verification Checklist

Use this checklist when testing terminal functionality:

### Bash Tool Output (ReadOnlyTerminal)
- [ ] Tool invocation displays command input
- [ ] Output section expands automatically
- [ ] Command output is visible and readable
- [ ] ANSI colors render correctly (if applicable)
- [ ] Long output is scrollable
- [ ] Multiple tool calls in one message all display

### Interactive Terminal
- [ ] Terminal initializes without errors
- [ ] Cursor is visible and blinks
- [ ] Can type characters
- [ ] Enter key sends command
- [ ] ⚠️ **Command output displays** (KNOWN ISSUE)
- [ ] Terminal resizes with window
- [ ] Connection status shows "Connected"

### Session Management
- [ ] New sessions get valid UUIDs
- [ ] Resume session loads previous history
- [ ] Invalid session IDs are auto-corrected
- [ ] Session switching works correctly

### Test Page
- [ ] All preset buttons work
- [ ] SSE event stream displays events
- [ ] All 4 verification checkboxes pass
- [ ] Event filtering works
- [ ] No console errors

---

## References

### Commits
- `778c0ef` - Bash tool output fix (content merging)
- `db03aa7` - xterm.js initialization fix (dimension timing)
- `aefeda1` - Debug mode implementation
- `d21cea1` - Logging architecture documentation

### Files
- `src/hooks/useClaudeChat.ts` - Message processing and content merging
- `src/components/chat/ToolExecution.tsx` - Tool output display
- `src/components/terminal/ReadOnlyTerminal.tsx` - Terminal for tool output
- `src/components/terminal/InteractiveTerminal.tsx` - Interactive terminal emulator
- `src/hooks/useTerminal.ts` - Terminal connection and messaging
- `public/test-bash-tool-ui.html` - Manual testing tool

### External Resources
- [xterm.js Documentation](https://xtermjs.org/)
- [Server-Sent Events (SSE) Spec](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [Claude API Streaming](https://docs.anthropic.com/en/api/streaming)

---

## Troubleshooting Quick Reference

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| No tool output | ID mismatch | Check commit 778c0ef is applied |
| RenderService error | Dimension timing | Check commit db03aa7 is applied |
| Invalid session error | Non-UUID session ID | Use `crypto.randomUUID()` |
| Duplicate tool blocks | Content merge bug | Replace tool_use blocks, don't merge |
| Terminal won't initialize | Container not ready | Wait for valid dimensions |
| ⚠️ Blank interactive terminal | **UNKNOWN** | **Investigation needed** |

---

**Document Status:** Living document - update as issues are discovered or resolved
**Last Updated:** 2026-02-03
**Maintained By:** Development team working on terminal enhancements
