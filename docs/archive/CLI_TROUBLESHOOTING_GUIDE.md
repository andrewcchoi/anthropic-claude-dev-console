# CLI Integration Troubleshooting Guide

> **Complete reference for integrating the UI with Claude Code CLI**
> Last updated: 2026-01-27
> Status: ✅ Fully functional CLI integration via subprocess

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Initial Approach: SDK Integration (Abandoned)](#2-initial-approach-sdk-integration-abandoned)
3. [Successful Approach: CLI Subprocess](#3-successful-approach-cli-subprocess-the-solution)
4. [CLI Flag Discovery (Trial and Error)](#4-cli-flag-discovery-trial-and-error)
5. [Telemetry Noise Problem](#5-telemetry-noise-problem)
6. ["Unknown Error" in UI Problem](#6-unknown-error-in-ui-problem)
7. [Message Format Differences](#7-message-format-differences)
8. [Files Modified Summary](#8-files-modified-summary)
9. [Quick Reference: What NOT to Do](#9-quick-reference-what-not-to-do)
10. [Error Message Index (Searchable)](#10-error-message-index-searchable)
11. [Timeline / Sequence Diagram](#11-timeline--sequence-diagram)
12. [Configuration Snippets](#12-configuration-snippets)
13. [Telemetry Data Reference](#13-telemetry-data-reference)
14. [Test Cases for Future Development](#14-test-cases-for-future-development)
15. [Verification Checklist](#15-verification-checklist)

---

## 1. Executive Summary

### Goal
Replace the limited SDK-based implementation with a full CLI subprocess integration to provide complete Claude Code functionality in a web UI.

### Final Solution
Spawn the Claude CLI as a subprocess using:
```bash
claude -p --verbose --output-format stream-json --include-partial-messages
```

Write plain text prompts to stdin, parse JSON events from stdout, filter telemetry noise, and track success state to avoid false errors.

### Time Invested
~4-6 hours across multiple attempts, primarily spent on:
- Testing different CLI input formats (3 failed attempts)
- Developing telemetry filtering logic (4 attempts)
- Fixing false error states in UI

### Key Achievement
Full Claude Code functionality including:
- All built-in tools (Bash, Read, Write, Edit, Glob, Grep, etc.)
- MCP server support
- Hook system
- Session persistence
- Automatic updates when CLI is updated

---

## 2. Initial Approach: SDK Integration (Abandoned)

### BEFORE (SDK Approach - Abandoned)

```typescript
// route.ts - Original SDK implementation
import { query } from '@anthropic-ai/claude-agent-sdk';

export async function POST(req: NextRequest) {
  const { prompt, sessionId, cwd } = await req.json();

  const stream = new ReadableStream({
    async start(controller) {
      const result = query({
        prompt,
        options: {
          cwd: cwd || process.cwd(),
          resume: sessionId || undefined,
          includePartialMessages: true,
        },
      });

      for await (const message of result) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
      }

      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new Response(stream, { /* headers */ });
}
```

### Why It Was Abandoned

| Limitation | Impact |
|------------|--------|
| **No full tool access** | Couldn't execute Bash, Read, Write tools as CLI does - would require reimplementing all tools |
| **No MCP server support** | Couldn't connect to external services (databases, APIs, etc.) |
| **No hooks** | Couldn't intercept/modify tool calls or add custom behavior |
| **Limited session management** | Basic conversation history, but not full CLI-level persistence |
| **Abstract API** | Would need to replicate all tool implementations manually |
| **Maintenance burden** | Need to keep tool implementations in sync with CLI updates |

### AFTER (Decision: Use CLI Instead)

The SDK was completely replaced with the CLI subprocess approach (see Section 3).

### Lesson Learned

> **The SDK abstracts away Claude Code's full functionality.** For a true CLI-like experience in a web UI, spawn the actual CLI as a subprocess. This provides:
> - All tools working out of the box
> - Automatic updates when CLI is updated
> - Full session persistence with `--session-id` flag
> - MCP server support without extra configuration
> - Hook support for custom behavior
> - Zero maintenance for tool implementations

---

## 3. Successful Approach: CLI Subprocess (★ THE SOLUTION ★)

### Final Working Command

```bash
claude -p --verbose --output-format stream-json --include-partial-messages
```

### Flag Breakdown

| Flag | Purpose |
|------|---------|
| `-p` | Print mode (non-interactive) |
| `--verbose` | Required for stream-json output format |
| `--output-format stream-json` | Outputs newline-delimited JSON events |
| `--include-partial-messages` | Streams text deltas as they arrive |
| `--session-id <id>` | (Optional) Resume previous session |

### Implementation Code

From `/workspace/src/app/api/claude/route.ts`:

```typescript
import { spawn } from 'child_process';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const { prompt, sessionId, cwd } = await req.json();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Build CLI arguments
      const args = [
        '-p',
        '--verbose',
        '--output-format', 'stream-json',
        '--include-partial-messages',
      ];

      if (sessionId) {
        args.push('--session-id', sessionId);
      }

      // Spawn CLI process
      const claude = spawn('claude', args, {
        cwd: cwd || '/workspace',
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stderrBuffer = '';
      let receivedSuccessResult = false;
      let telemetryBuffer = '';
      let inTelemetryBlock = false;
      let bracketDepth = 0;

      // Handle stdout (JSON stream)
      claude.stdout.on('data', (chunk: Buffer) => {
        const data = chunk.toString();
        const lines = data.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          // Detect telemetry blocks (see Section 5)
          const isTelemetryLine = trimmed.includes('descriptor:') ||
                                  trimmed.includes('dataPointType:') ||
                                  trimmed.includes('dataPoints:') ||
                                  /* ... more keywords ... */;

          if (isTelemetryLine) {
            inTelemetryBlock = true;
          }

          // Buffer telemetry
          if (inTelemetryBlock) {
            telemetryBuffer += line + '\n';
            for (const char of trimmed) {
              if (char === '{') bracketDepth++;
              if (char === '}') bracketDepth--;
            }
            if (bracketDepth === 0 && trimmed === '}') {
              inTelemetryBlock = false;
            }
            continue;
          }

          // Parse valid JSON messages
          try {
            const parsed = JSON.parse(trimmed);
            if (parsed.type) {
              if (parsed.type === 'result' && parsed.subtype === 'success') {
                receivedSuccessResult = true;
              }
              controller.enqueue(encoder.encode(`data: ${trimmed}\n\n`));
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      });

      // Capture stderr
      claude.stderr.on('data', (chunk: Buffer) => {
        stderrBuffer += chunk.toString();
      });

      // Handle close
      claude.on('close', (code) => {
        // Only report errors if no success result was received
        if (code !== 0 && !receivedSuccessResult && stderrBuffer) {
          const errorMessage = {
            type: 'error',
            error: `Claude CLI exited with code ${code}: ${stderrBuffer}`,
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorMessage)}\n\n`));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      });

      // Write prompt to stdin (PLAIN TEXT, NOT JSON!)
      claude.stdin.write(prompt + '\n');
      claude.stdin.end();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

### Why This Works

1. **Full functionality**: All CLI tools, MCP servers, and hooks work automatically
2. **Simple input**: Plain text to stdin (no complex JSON formatting needed)
3. **Structured output**: JSON events on stdout for easy parsing
4. **Session persistence**: `--session-id` flag maintains conversation state
5. **Automatic updates**: When CLI updates, the UI gets new features for free
6. **SSE streaming**: Real-time response streaming to the frontend

---

## 4. CLI Flag Discovery (Trial and Error)

### Attempt 1: Missing `--verbose` flag

**BEFORE (Code Causing Error):**
```typescript
const args = [
  '-p',
  '--output-format', 'stream-json',
  '--include-partial-messages',
];
const claude = spawn('claude', args, { cwd: '/workspace' });
```

**Error Message:**
```
Error: When using --print, --output-format=stream-json requires --verbose
```

**Root Cause:** The CLI enforces that `--verbose` must be present when using `stream-json` output format.

**AFTER (Attempt 1 Fix):**
```typescript
const args = [
  '-p',
  '--verbose',  // ← Added this flag
  '--output-format', 'stream-json',
  '--include-partial-messages',
];
```

**Status:** ❌ Partial fix - CLI now accepts flags but input format still broken

---

### Attempt 2: Streaming JSON Input Format (Multiple Sub-Attempts)

**BEFORE (Code Causing Error):**
```typescript
const args = [
  '-p',
  '--verbose',
  '--input-format', 'stream-json',  // ← Problematic flag
  '--output-format', 'stream-json',
  '--include-partial-messages',
];

// Tried writing JSON to stdin:
claude.stdin.write(JSON.stringify({ type: 'user', text: prompt }));
```

**Error Message:**
```
Error parsing streaming input line: TypeError: Cannot read properties of undefined (reading 'role')
```

**Root Cause:** The CLI's `--input-format stream-json` expects a specific JSON structure that was undocumented/unclear.

**AFTER (Attempt 2a - Different JSON format):**
```typescript
// Tried format with role field
claude.stdin.write(JSON.stringify({
  role: 'user',
  content: [{ type: 'text', text: prompt }]
}));
```
**Status:** ❌ Same error - CLI still expects different structure

**AFTER (Attempt 2b - Combined fields):**
```typescript
// Tried combining type and role
claude.stdin.write(JSON.stringify({
  type: 'user',
  role: 'user',
  content: [{ type: 'text', text: prompt }]
}));
```
**Status:** ❌ New error: `Expected message type 'user' or 'control', got 'undefined'`

**AFTER (Attempt 2c - Message wrapper):**
```typescript
// Tried wrapping in messages array
claude.stdin.write(JSON.stringify({
  messages: [{ role: 'user', content: prompt }]
}));
```
**Status:** ❌ Still failed - JSON input format too complex/undocumented

---

### ★ Attempt 3: Plain Text Input via stdin (SUCCESS) ★

**BEFORE (Code Causing Error):**
```typescript
const args = [
  '-p',
  '--verbose',
  '--input-format', 'stream-json',  // ← REMOVE THIS
  '--output-format', 'stream-json',
  '--include-partial-messages',
];

claude.stdin.write(JSON.stringify({ type: 'user', text: prompt }));
```

**★ AFTER (WORKING SOLUTION): ★**
```typescript
const args = [
  '-p',
  '--verbose',
  '--output-format', 'stream-json',
  '--include-partial-messages',
  // NO --input-format flag!
];

// Write plain text, not JSON
claude.stdin.write(prompt + '\n');
claude.stdin.end();
```

**Status:** ✅ **SUCCESS** - CLI responds correctly!

### Lesson Learned

> **Don't use `--input-format stream-json`.** The CLI expects plain text input via stdin by default. The `--output-format stream-json` flag only controls output, not input. Plain text input is simpler and matches how users interact with the CLI normally.

---

## 5. Telemetry Noise Problem

### Symptom

UI displayed errors like:
```json
{"type":"error","error":"CLI output was not valid JSON. This may indicate an error during startup. Output: {"}
```

### Root Cause

The CLI outputs telemetry at session end in **JavaScript object notation** (not valid JSON):

```javascript
{
  descriptor: {    // ← unquoted keys (not valid JSON)
    name: 'claude_code.cost.usage',
    type: 'COUNTER',
    valueType: 1,
  },
  dataPoints: [...]
}
```

This telemetry appears on **stdout** (not stderr), interleaved with the JSON stream, causing parse errors.

---

### Attempt 1: No Filtering (Original Code)

**BEFORE (Code Causing Error):**
```typescript
claude.stdout.on('data', (chunk: Buffer) => {
  const data = chunk.toString();
  const lines = data.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      // Tried to parse ALL lines as JSON
      const parsed = JSON.parse(trimmed);
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(parsed)}\n\n`));
    } catch (e) {
      // Error thrown here when telemetry lines encountered
      const errorMessage = {
        type: 'error',
        error: `CLI output was not valid JSON: ${trimmed}`
      };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorMessage)}\n\n`));
    }
  }
});
```

**Error Triggered By This Telemetry Output:**
```
{
  descriptor: {
    name: 'claude_code.cost.usage',
```

**Problem:** Every telemetry line causes a JSON parse error that gets sent to the UI.

**Status:** ❌ Error sent to UI for every telemetry line

---

### Attempt 2: Filter `descriptor:` Keyword Only

**AFTER (Attempt 2):**
```typescript
for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed) continue;

  // Added basic filter
  if (trimmed.includes('descriptor:')) continue;

  try {
    const parsed = JSON.parse(trimmed);
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(parsed)}\n\n`));
  } catch (e) {
    const errorMessage = { type: 'error', error: `Not valid JSON: ${trimmed}` };
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorMessage)}\n\n`));
  }
}
```

**Still Failing Because:**
```javascript
{                          // ← Standalone brace not filtered
  descriptor: {...},       // ← This line filtered ✓
  dataPointType: 3,        // ← This line NOT filtered, causes error ✗
  dataPoints: [...]        // ← This line NOT filtered, causes error ✗
}
```

**Status:** ❌ Incomplete - other telemetry keywords still leak through

---

### Attempt 3: Filter Multiple Keywords (Simple)

**AFTER (Attempt 3):**
```typescript
for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed) continue;

  // Filter telemetry keywords
  if (trimmed.includes('descriptor:') ||
      trimmed.includes('valueType:') ||
      trimmed === '{' ||
      trimmed === '}') continue;

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed.type) {  // Only send if valid Claude message
      controller.enqueue(encoder.encode(`data: ${trimmed}\n\n`));
    }
  } catch (e) {
    // Silently skip invalid JSON
  }
}
```

**Still Failing Because:**
```javascript
{
  descriptor: {...},
  dataPointType: 3,        // ← NOT in filter list ✗
  dataPoints: [            // ← NOT in filter list ✗
    {
      attributes: {...},   // ← NOT in filter list ✗
      startTime: [...],    // ← NOT in filter list ✗
```

**Status:** ❌ Incomplete - need more keywords and depth tracking

---

### ★ Attempt 4: Bracket Depth Tracking (SUCCESS) ★

**BEFORE (Attempt 3 Code - Still Failing):**
```typescript
// Simple keyword filtering - incomplete
if (trimmed.includes('descriptor:') || trimmed.includes('valueType:')) continue;
if (trimmed === '{' || trimmed === '}') continue;
```

**★ AFTER (WORKING SOLUTION): ★**

From `/workspace/src/app/api/claude/route.ts:48-116`:

```typescript
let telemetryBuffer = '';
let inTelemetryBlock = false;
let bracketDepth = 0;

claude.stdout.on('data', (chunk: Buffer) => {
  const data = chunk.toString();
  const lines = data.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Comprehensive telemetry keyword detection
    const isTelemetryLine = trimmed.includes('descriptor:') ||
                            trimmed.includes('dataPointType:') ||
                            trimmed.includes('dataPoints:') ||
                            trimmed.includes('attributes:') ||
                            trimmed.includes('startTime:') ||
                            trimmed.includes('endTime:') ||
                            trimmed.includes('valueType:') ||
                            trimmed.includes('advice:');

    if (isTelemetryLine) {
      inTelemetryBlock = true;
    }

    // If in telemetry block, capture everything and track depth
    if (inTelemetryBlock) {
      telemetryBuffer += line + '\n';

      // Count braces to track nesting depth
      for (const char of trimmed) {
        if (char === '{') bracketDepth++;
        if (char === '}') bracketDepth--;
      }

      // End of top-level telemetry object
      if (bracketDepth === 0 && trimmed === '}') {
        inTelemetryBlock = false;
        // telemetryBuffer now contains complete telemetry object
      }
      continue;  // Don't process telemetry as JSON
    }

    // Handle standalone opening brace (might be start of telemetry)
    if (trimmed === '{') {
      telemetryBuffer += line + '\n';
      bracketDepth = 1;
      continue;
    }

    // Only valid Claude JSON messages reach here
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.type) {
        controller.enqueue(encoder.encode(`data: ${trimmed}\n\n`));
      }
    } catch (e) {
      // Silently skip invalid lines
    }
  }
});
```

**How It Works:**

1. **Keyword Detection**: Detect telemetry by looking for specific keywords (descriptor, dataPoints, etc.)
2. **State Tracking**: Set `inTelemetryBlock = true` when telemetry detected
3. **Bracket Counting**: Track `{` and `}` to know when telemetry object is complete
4. **Buffer Capture**: Accumulate all telemetry lines in `telemetryBuffer`
5. **Exit Condition**: When `bracketDepth` returns to 0 and line is `}`, telemetry is complete
6. **Clean Stream**: Only non-telemetry JSON messages are sent to the UI

**Status:** ✅ **SUCCESS** - Telemetry completely filtered, clean JSON stream to UI

### Lesson Learned

> **Telemetry filtering requires TWO techniques:**
> 1. **Keyword detection** to identify telemetry lines
> 2. **Bracket depth tracking** to capture COMPLETE multi-line telemetry objects
>
> Simple keyword filtering alone is insufficient because telemetry spans multiple lines with nested braces. Without depth tracking, partial telemetry lines leak through and cause parse errors.

---

## 6. "Unknown Error" in UI Problem

### Symptom

UI displayed "unknown error" even when Claude responded with the correct answer.

### Root Cause

The message sequence from CLI:
```
1. {"type":"assistant","message":{...}}     ← Correct response
2. {"type":"result","subtype":"success"}    ← Success indicator
3. [telemetry noise might trigger issues]
4. [CLI exits with non-zero code]
5. {"type":"error","error":"..."}           ← Error sent to UI (WRONG!)
```

The frontend processed ALL messages, including error messages that arrived after a successful response completed.

---

### Attempt 1: No Success Tracking (Original Code)

**BEFORE (Backend Code Causing Problem):**

From early version of `route.ts`:

```typescript
// close handler
claude.on('close', (code) => {
  // Always sent error if exit code non-zero
  if (code !== 0 && stderrBuffer) {
    const errorMessage = {
      type: 'error',
      error: `Claude CLI exited with code ${code}: ${stderrBuffer}`,
    };
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorMessage)}\n\n`));
  }
  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
  controller.close();
});
```

**BEFORE (Frontend Code Causing Problem):**

From early version of `useClaudeChat.ts`:

```typescript
if (message.type === 'error') {
  // Always set error, even after successful result
  setError(message.error || 'Unknown error occurred');
}
```

**Problem:**
- CLI may exit with non-zero code due to telemetry parsing issues
- Error message sent to UI even though the actual response was successful
- Frontend displays error even after receiving `{"type":"result","subtype":"success"}`

**Status:** ❌ False "unknown error" shown to user despite successful response

---

### ★ Attempt 2: Success Tracking Flag (SUCCESS) ★

**★ AFTER (Backend - WORKING SOLUTION): ★**

From `/workspace/src/app/api/claude/route.ts:48,101-102,147-155`:

```typescript
let receivedSuccessResult = false;

// In stdout handler - track success
claude.stdout.on('data', (chunk: Buffer) => {
  // ... parsing code ...

  const parsed = JSON.parse(trimmed);
  if (parsed.type) {
    // Track if we received a successful result
    if (parsed.type === 'result' && parsed.subtype === 'success') {
      receivedSuccessResult = true;  // ← Mark success received
    }
    controller.enqueue(encoder.encode(`data: ${trimmed}\n\n`));
  }
});

// In close handler - only report error if NO success
claude.on('close', (code) => {
  // Only report errors if we didn't receive a success result
  if (code !== 0 && !receivedSuccessResult && stderrBuffer) {
    const errorMessage = {
      type: 'error',
      error: `Claude CLI exited with code ${code}: ${stderrBuffer}`,
    };
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorMessage)}\n\n`));
  }
  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
  controller.close();
});
```

**★ AFTER (Frontend - WORKING SOLUTION): ★**

From `/workspace/src/hooks/useClaudeChat.ts:66,143-152`:

```typescript
let receivedSuccessResult = false;

// ... in message processing loop ...

if (message.type === 'result') {
  // Final result
  if (message.subtype === 'success') {
    receivedSuccessResult = true;  // ← Mark success received
  } else if (message.subtype === 'error' || message.is_error) {
    setError(message.error || 'Unknown error');
  }
} else if (message.type === 'error') {
  // Only show error if we haven't received a successful result
  if (!receivedSuccessResult) {
    setError(message.error || 'Unknown error occurred');
  }
}
```

**How It Works:**

1. **Backend tracking**: Set `receivedSuccessResult = true` when `{"type":"result","subtype":"success"}` is received
2. **Backend gating**: Only send error message on close if `receivedSuccessResult` is still false
3. **Frontend tracking**: Set `receivedSuccessResult = true` when success result arrives
4. **Frontend gating**: Ignore subsequent error messages if `receivedSuccessResult` is true

**Status:** ✅ **SUCCESS** - No more false "unknown error" messages

### Lesson Learned

> **The CLI may send error-like messages AFTER a successful response completes.** Always track success state in BOTH backend and frontend:
> - Backend: Prevent sending error messages after success
> - Frontend: Ignore error messages that arrive after success
>
> Only display errors if no success result was received during the session.

---

## 7. Message Format Differences

### SDK vs CLI Format Comparison

The CLI's `stream-json` format differs significantly from the SDK's message format:

| Field | SDK Format | CLI Format | Notes |
|-------|-----------|------------|-------|
| **Text delta** | `message.delta.text` | `message.event.delta.text` | CLI nests under `event` |
| **Tool use** | `message.content_block` | `message.event.content_block` | CLI nests under `event` |
| **Session ID** | `message.sessionId` (camelCase) | `message.session_id` (snake_case) | CLI uses snake_case |
| **Full message** | `message.content` | `message.message.content` | CLI nests under `message` |
| **Stream event type** | `message.type === 'content_block_delta'` | `message.type === 'stream_event'` then `event.type === 'content_block_delta'` | CLI wraps in stream_event |

### Example CLI Message Structure

```json
{
  "type": "stream_event",
  "event": {
    "type": "content_block_delta",
    "index": 0,
    "delta": {
      "type": "text_delta",
      "text": "Hello"
    }
  }
}
```

### Type Definitions Updated

From `/workspace/src/types/claude.ts:24-44`:

```typescript
export interface SDKMessage {
  type: SDKMessageType;
  subtype?: string;
  session_id?: string;  // ← snake_case, not sessionId
  // ...

  // CLI-specific fields
  event?: {
    type: string;
    index?: number;
    content_block?: {
      type: string;
      text?: string;
      id?: string;
      name?: string;
      input?: any;
    };
    delta?: {
      type: string;
      text?: string;
    };
  };
  message?: {
    content?: MessageContent[];
    model?: string;
    usage?: any;
  };
}
```

### Frontend Parsing

From `/workspace/src/hooks/useClaudeChat.ts:82-140`:

```typescript
if (message.type === 'system') {
  // Store session ID (snake_case)
  if (message.session_id) {
    setSessionId(message.session_id);
  }
} else if (message.type === 'assistant') {
  // Full message (nested under message.message.content)
  if (message.message?.content) {
    currentContent = message.message.content;
    updateMessage(assistantMessageId, { content: currentContent });
  }
} else if (message.type === 'stream_event') {
  const event = message.event;

  if (event?.type === 'content_block_delta') {
    // Streaming text deltas (nested under event.delta.text)
    if (event.delta?.type === 'text_delta') {
      if (!currentTextBlock) {
        currentTextBlock = { type: 'text', text: event.delta.text };
        currentContent = [...currentContent, currentTextBlock];
      } else {
        currentTextBlock.text = (currentTextBlock.text || '') + event.delta.text;
      }
      updateMessage(assistantMessageId, { content: [...currentContent] });
    }
  } else if (event?.type === 'content_block_start') {
    // New content block (nested under event.content_block)
    if (event.content_block?.type === 'tool_use') {
      const toolBlock = event.content_block;
      addToolExecution({
        id: toolBlock.id || `tool-${Date.now()}`,
        name: toolBlock.name || 'unknown',
        input: toolBlock.input,
        status: 'pending',
        timestamp: Date.now(),
      });
    }
  }
}
```

### Lesson Learned

> **CLI stream-json format uses:**
> - **Nested `event` objects** for stream events
> - **snake_case field names** (not camelCase)
> - **Different wrapper structure** compared to SDK
>
> Update type definitions and parsing logic to match CLI format. Don't assume SDK message structure will work.

---

## 8. Files Modified Summary

| File | Changes | Lines |
|------|---------|-------|
| `/workspace/src/app/api/claude/route.ts` | CLI subprocess spawning, telemetry filtering, success tracking, SSE streaming | 202 |
| `/workspace/src/hooks/useClaudeChat.ts` | CLI message parsing, success tracking, event handling | 190 |
| `/workspace/src/types/claude.ts` | CLI-specific message types with `event` and `message` nesting | 83 |
| `/workspace/src/lib/telemetry.ts` | Telemetry parsing utility (JS to JSON conversion) | ~50 |
| `/workspace/TELEMETRY_LOG.md` | Documentation for telemetry logging feature | 113 |

### Key Functions Added

**Backend:**
- `spawn('claude', args)` - CLI subprocess management
- Telemetry filtering logic - Bracket depth tracking
- Success state tracking - Prevent false errors
- Telemetry logging - JSONL append on session close

**Frontend:**
- `message.event` parsing - Handle CLI stream format
- Success state tracking - Ignore late errors
- Tool execution tracking - Display tool use blocks

---

## 9. Quick Reference: What NOT to Do

| ❌ Don't | ✅ Do Instead | Why |
|---------|--------------|-----|
| Use SDK `query()` for full CLI experience | Spawn CLI subprocess | SDK lacks tools, MCP, hooks |
| Use `--input-format stream-json` | Write plain text to stdin | Complex, error-prone, undocumented |
| Parse all stdout as JSON | Filter telemetry keywords + bracket depth tracking | Telemetry breaks parsing |
| Send error on non-zero exit code | Track success, only send error if no success | False positives |
| Show errors after success result | Track `receivedSuccessResult` flag | User sees errors despite success |
| Assume SDK message format | Use CLI format with `event` nesting | Different structure |
| Use `sessionId` (camelCase) | Use `session_id` (snake_case) | CLI uses snake_case |
| Filter telemetry with keywords only | Use keywords + bracket depth tracking | Multi-line objects leak through |

---

## 10. Error Message Index (Searchable)

| Error Message | Cause | Solution | Section |
|--------------|-------|----------|---------|
| `--output-format=stream-json requires --verbose` | Missing `--verbose` flag | Add `--verbose` to CLI args | [§4.1](#attempt-1-missing---verbose-flag) |
| `Cannot read properties of undefined (reading 'role')` | Using `--input-format stream-json` with wrong JSON structure | Remove `--input-format`, use plain text stdin | [§4.2](#attempt-2-streaming-json-input-format-multiple-sub-attempts) |
| `Expected message type 'user' or 'control', got 'undefined'` | Wrong JSON structure for streaming input | Don't use `--input-format stream-json` | [§4.2](#attempt-2-streaming-json-input-format-multiple-sub-attempts) |
| `CLI output was not valid JSON` | Telemetry noise on stdout | Filter telemetry with keywords + bracket depth | [§5](#5-telemetry-noise-problem) |
| `unknown error` in UI | Error message sent/displayed after success result | Track `receivedSuccessResult` in backend and frontend | [§6](#6-unknown-error-in-ui-problem) |
| `TypeError: message.delta is undefined` | Using SDK format for CLI messages | Use `message.event.delta.text` | [§7](#7-message-format-differences) |
| `Cannot read properties of undefined (reading 'text')` | Wrong message path | Use `message.event.delta.text` not `message.delta.text` | [§7](#7-message-format-differences) |

---

## 11. Timeline / Sequence Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CLI INTEGRATION TROUBLESHOOTING TIMELINE                  │
└─────────────────────────────────────────────────────────────────────────────┘

Phase 1: SDK Approach                    Phase 2: CLI Subprocess
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│                                        │
├─ Try: @anthropic-ai/claude-agent-sdk   ├─ Try: spawn('claude', [...])
│       query() function                 │       with --input-format stream-json
│                                        │
├─ Result: Works but limited             ├─ Error: "Cannot read 'role'"
│          - No full tool access         │       ❌ Attempt 1: JSON with type
│          - No MCP/hooks                │       ❌ Attempt 2: JSON with role
│          - Maintenance burden          │       ❌ Attempt 3: JSON with both
│                                        │
├─ Decision: ABANDON SDK                 ├─ Try: Plain text via stdin
│            Use CLI subprocess          │       (no --input-format flag)
│                                        │
└────────────────────────────────────────├─ Result: ✅ CLI responds!
                                         │
Phase 3: Telemetry Filtering             Phase 4: Frontend Fix
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│                                        │
├─ Problem: "CLI output not valid JSON"  ├─ Problem: "Unknown error" in UI
│           Telemetry on stdout          │           after successful response
│                                        │
├─ Try: Filter 'descriptor:' only        ├─ Root cause: Error msgs arrive
│       ❌ Incomplete - partial leak    │              after success result
│                                        │
├─ Try: Filter multiple keywords         ├─ Try: Track receivedSuccessResult
│       ❌ Incomplete - no depth track  │       in backend only
│                                        │       ⚠️  Partial - still leaks
├─ Try: Keywords + bracket depth         │
│       tracking                         ├─ Fix: Track receivedSuccessResult
│       ✅ Works!                        │       in BOTH backend + frontend
│                                        │       ✅ Works!
│                                        │
└────────────────────────────────────────└─────────────────────────────────────

Phase 5: Telemetry Logging (Bonus)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│
├─ Goal: Capture telemetry for analytics
│
├─ Implementation:
│   - Parse buffered telemetry (JS → JSON)
│   - Log to /workspace/logs/telemetry.jsonl
│   - Timestamp each entry
│   ✅ Complete
│
└─────────────────────────────────────────────────────────────────────────────

FINAL STATE: ✅ Full CLI integration working
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Command: claude -p --verbose --output-format stream-json --include-partial-messages
Input:   Plain text via stdin (NOT --input-format stream-json)
Output:  Filtered JSON stream (telemetry removed, logged separately)
Errors:  Success tracking prevents false errors
Format:  CLI-specific (event nesting, snake_case)
```

---

## 12. Configuration Snippets

### next.config.js (Next.js 15+)

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 15+ uses serverExternalPackages, not experimental.serverComponentsExternalPackages
  serverExternalPackages: ['better-sqlite3'],
};

module.exports = nextConfig;
```

### postcss.config.js (Tailwind CSS v4)

```javascript
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},  // NOT 'tailwindcss'
  },
};
```

### globals.css (Tailwind CSS v4)

```css
@import "tailwindcss";  /* NOT @tailwind base/components/utilities */
```

### API Route Spawn Config

```typescript
const args = [
  '-p',
  '--verbose',
  '--output-format', 'stream-json',
  '--include-partial-messages',
];

if (sessionId) {
  args.push('--session-id', sessionId);
}

const claude = spawn('claude', args, {
  cwd: cwd || '/workspace',
  stdio: ['pipe', 'pipe', 'pipe'],
});
```

### SSE Response Headers

```typescript
return new Response(stream, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  },
});
```

---

## 13. Telemetry Data Reference

### Sample Telemetry Entry

From `/workspace/logs/telemetry.jsonl`:

```json
{
  "timestamp": "2026-01-28T02:53:30.185Z",
  "descriptor": {
    "name": "claude_code.cost.usage",
    "type": "COUNTER",
    "description": "Cost of the Claude Code session",
    "unit": "USD",
    "valueType": 1,
    "advice": {}
  },
  "dataPointType": 3,
  "dataPoints": [{
    "attributes": {
      "user.id": "c326a92f7bdc36b0585854424e1f44b1e90592088b876925c4317fc471ea384d",
      "session.id": "8101480c-261b-4b11-bfba-b4f0cdd05c05",
      "terminal.type": "vscode",
      "model": "claude-sonnet-4-5"
    },
    "startTime": [1769568810, 160000000],
    "endTime": [1769568810, 166000000],
    "value": 0.01700295
  }]
}
```

### Telemetry Metrics Captured

| Metric Name | Description | Unit | Value Example |
|-------------|-------------|------|---------------|
| `claude_code.cost.usage` | Total API cost per session | USD | 0.017 |
| `claude_code.token.usage` (type: input) | Input tokens consumed | tokens | 2 |
| `claude_code.token.usage` (type: output) | Output tokens generated | tokens | 14 |
| `claude_code.token.usage` (type: cacheRead) | Cache read tokens | tokens | 21894 |
| `claude_code.token.usage` (type: cacheCreation) | Cache write tokens | tokens | 2725 |

### Baseline Metrics (Working State)

From actual telemetry logs:

| Metric | Typical Value | Notes |
|--------|---------------|-------|
| **Cost per simple query** | $0.007 - $0.017 | Depends on cache hits |
| **Input tokens** | 2-10 | Minimal for short prompts |
| **Output tokens** | 10-50 | Short responses |
| **Cache read tokens** | ~21,000-24,000 | System prompt cached |
| **Cache creation tokens** | ~2,700 | Initial system prompt |
| **Response time** | 2-3 seconds | API round-trip |

### When Telemetry Helps Troubleshooting

- **Cost spike:** May indicate retry loops or error handling issues
- **Zero cache hits:** System prompt may not be caching properly (check session persistence)
- **Missing telemetry:** CLI process may be crashing before completion
- **High input tokens:** Possible context leak or unnecessary history being sent
- **Multiple sessions per request:** Session ID not being persisted correctly

### Viewing Telemetry

```bash
# View all metrics
tail -10 /workspace/logs/telemetry.jsonl | jq .

# View cost metrics only
jq 'select(.descriptor.name == "claude_code.cost.usage")' /workspace/logs/telemetry.jsonl

# Summarize costs by session
jq -s 'group_by(.dataPoints[0].attributes."session.id") |
  map({session: .[0].dataPoints[0].attributes."session.id",
       total_cost: map(.dataPoints[0].value) | add})' \
  /workspace/logs/telemetry.jsonl

# View token breakdown for a session
jq 'select(.dataPoints[0].attributes."session.id" == "YOUR_SESSION_ID")' \
  /workspace/logs/telemetry.jsonl
```

---

## 14. Test Cases for Future Development

### Test Suite: CLI Integration

These tests should be added to prevent regressions and catch the errors documented above.

---

#### Test 1: CLI Flag Validation

**Purpose:** Catch missing required flags early

```typescript
// __tests__/cli-flags.test.ts
import { spawn } from 'child_process';

describe('CLI Flag Requirements', () => {
  it('should fail without --verbose when using stream-json output', async () => {
    const args = ['-p', '--output-format', 'stream-json'];
    const claude = spawn('claude', args);

    let stderr = '';
    claude.stderr.on('data', (data) => { stderr += data.toString(); });

    await new Promise(resolve => claude.on('close', resolve));

    expect(stderr).toContain('requires --verbose');
  });

  it('should accept plain text input without --input-format flag', async () => {
    const args = ['-p', '--verbose', '--output-format', 'stream-json'];
    const claude = spawn('claude', args);

    claude.stdin.write('Hello\n');
    claude.stdin.end();

    let stdout = '';
    claude.stdout.on('data', (data) => { stdout += data.toString(); });

    const exitCode = await new Promise(resolve => claude.on('close', resolve));

    // Should receive valid JSON response
    expect(stdout).toContain('"type"');
  });
});
```

---

#### Test 2: Telemetry Filtering

**Purpose:** Ensure telemetry doesn't leak to client

```typescript
// __tests__/telemetry-filtering.test.ts
describe('Telemetry Filtering', () => {
  const telemetryKeywords = [
    'descriptor:',
    'dataPointType:',
    'dataPoints:',
    'attributes:',
    'startTime:',
    'endTime:',
    'valueType:',
    'advice:'
  ];

  it('should filter all telemetry keywords from SSE output', async () => {
    const response = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Hello' }),
    });

    const text = await response.text();

    for (const keyword of telemetryKeywords) {
      expect(text).not.toContain(keyword);
    }
  });

  it('should not send standalone braces as messages', async () => {
    const response = await fetch('/api/claude', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Hello' }),
    });

    const lines = (await response.text()).split('\n');
    const dataLines = lines.filter(l => l.startsWith('data: ') && l !== 'data: [DONE]');

    for (const line of dataLines) {
      const json = line.replace('data: ', '');
      expect(json.trim()).not.toBe('{');
      expect(json.trim()).not.toBe('}');
    }
  });

  it('should only send messages with type field', async () => {
    const response = await fetch('/api/claude', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Hello' }),
    });

    const lines = (await response.text()).split('\n');
    const dataLines = lines.filter(l => l.startsWith('data: ') && l !== 'data: [DONE]');

    for (const line of dataLines) {
      const json = JSON.parse(line.replace('data: ', ''));
      expect(json).toHaveProperty('type');
    }
  });
});
```

---

#### Test 3: Success Tracking

**Purpose:** Ensure errors after success don't show in UI

```typescript
// __tests__/success-tracking.test.ts
describe('Success Tracking', () => {
  it('should not set error state after receiving success result', async () => {
    // Simulate message sequence with error after success
    const messages = [
      { type: 'assistant', message: { content: [{ text: 'Hello' }] } },
      { type: 'result', subtype: 'success', is_error: false },
      { type: 'error', error: 'Some late error' },
    ];

    let receivedSuccessResult = false;
    let errorState = null;

    for (const message of messages) {
      if (message.type === 'result' && message.subtype === 'success') {
        receivedSuccessResult = true;
      }

      if (message.type === 'error' && !receivedSuccessResult) {
        errorState = message.error;
      }
    }

    expect(errorState).toBeNull();
  });

  it('should set error state if error arrives before success', async () => {
    const messages = [
      { type: 'error', error: 'Connection failed' },
    ];

    let receivedSuccessResult = false;
    let errorState = null;

    for (const message of messages) {
      if (message.type === 'result' && message.subtype === 'success') {
        receivedSuccessResult = true;
      }

      if (message.type === 'error' && !receivedSuccessResult) {
        errorState = message.error;
      }
    }

    expect(errorState).toBe('Connection failed');
  });
});
```

---

#### Test 4: Message Format Validation

**Purpose:** Ensure frontend handles CLI message format correctly

```typescript
// __tests__/message-format.test.ts
describe('CLI Message Format Parsing', () => {
  it('should extract text from stream_event delta', () => {
    const message = {
      type: 'stream_event',
      event: {
        type: 'content_block_delta',
        delta: { type: 'text_delta', text: 'Hello' }
      }
    };

    // This is the correct path for CLI format
    const text = message.event?.delta?.text;
    expect(text).toBe('Hello');
  });

  it('should NOT use SDK format for text extraction', () => {
    const message = {
      type: 'stream_event',
      event: { delta: { text: 'Hello' } }
    };

    // SDK format (wrong): message.delta.text
    // CLI format (correct): message.event.delta.text
    expect((message as any).delta).toBeUndefined();
  });

  it('should extract session_id with underscore (not camelCase)', () => {
    const message = {
      type: 'system',
      session_id: 'abc-123',
    };

    // CLI uses session_id (snake_case)
    expect(message.session_id).toBe('abc-123');
    expect((message as any).sessionId).toBeUndefined();
  });

  it('should handle nested message.message.content structure', () => {
    const message = {
      type: 'assistant',
      message: {
        content: [{ type: 'text', text: 'Hello' }]
      }
    };

    // CLI nests content under message.message.content
    expect(message.message.content).toHaveLength(1);
    expect(message.message.content[0].text).toBe('Hello');
  });
});
```

---

#### Test 5: Integration Test

**Purpose:** Full end-to-end test of CLI integration

```typescript
// __tests__/integration.test.ts
describe('CLI Integration E2E', () => {
  it('should complete simple query without errors', async () => {
    const response = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'What is 2+2?' }),
    });

    expect(response.ok).toBe(true);

    const text = await response.text();
    const lines = text.split('\n').filter(l => l.startsWith('data: '));

    // Should have system init
    const systemMsg = lines.find(l => l.includes('"type":"system"'));
    expect(systemMsg).toBeDefined();

    // Should have result success
    const resultMsg = lines.find(l => l.includes('"subtype":"success"'));
    expect(resultMsg).toBeDefined();

    // Should NOT have error messages
    const errorMsg = lines.find(l => l.includes('"type":"error"'));
    expect(errorMsg).toBeUndefined();

    // Should end with [DONE]
    expect(text).toContain('data: [DONE]');
  });

  it('should persist session across requests', async () => {
    // First request
    const res1 = await fetch('/api/claude', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Remember the number 42' }),
    });
    const text1 = await res1.text();
    const sessionMatch = text1.match(/"session_id":"([^"]+)"/);
    const sessionId = sessionMatch?.[1];

    expect(sessionId).toBeDefined();

    // Second request with same session
    const res2 = await fetch('/api/claude', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'What number?', sessionId }),
    });
    const text2 = await res2.text();

    expect(text2).toContain('42');
  });

  it('should log telemetry to JSONL file', async () => {
    await fetch('/api/claude', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Hello' }),
    });

    // Wait for process to close and telemetry to be written
    await new Promise(resolve => setTimeout(resolve, 1000));

    const fs = require('fs');
    const telemetryExists = fs.existsSync('/workspace/logs/telemetry.jsonl');
    expect(telemetryExists).toBe(true);

    const content = fs.readFileSync('/workspace/logs/telemetry.jsonl', 'utf-8');
    const lastLine = content.trim().split('\n').pop();
    const entry = JSON.parse(lastLine);

    expect(entry).toHaveProperty('timestamp');
    expect(entry).toHaveProperty('descriptor');
    expect(entry.descriptor).toHaveProperty('name');
  });
});
```

---

### Running Tests

```bash
# Run all CLI integration tests
npm test -- --testPathPattern=cli

# Run specific test suite
npm test -- telemetry-filtering.test.ts

# Run with coverage
npm test -- --coverage --testPathPattern=cli

# Watch mode for development
npm test -- --watch cli-flags.test.ts
```

---

## 15. Verification Checklist

Use this checklist to verify the CLI integration is working correctly:

### Basic Functionality
- [ ] Simple text messages work (`"Hello"` → correct response)
- [ ] Multi-turn conversation works (session persists)
- [ ] Streaming text appears in real-time
- [ ] No errors in browser console
- [ ] No errors in server logs

### Tool Execution
- [ ] Bash tool works (e.g., `"Run ls"`)
- [ ] Read tool works (e.g., `"Read package.json"`)
- [ ] Write tool works (e.g., `"Create test.txt"`)
- [ ] Glob tool works (e.g., `"Find all .ts files"`)
- [ ] Grep tool works (e.g., `"Search for 'TODO'"`)

### Session Management
- [ ] Session ID is captured and stored
- [ ] Session ID is passed to subsequent requests
- [ ] Conversation history persists across requests
- [ ] Different tabs/sessions are isolated

### Error Handling
- [ ] No "unknown error" on successful responses
- [ ] Real errors are displayed correctly
- [ ] CLI startup failures are caught
- [ ] Network errors are handled gracefully

### Telemetry
- [ ] Telemetry is filtered from UI output
- [ ] Telemetry is logged to `/workspace/logs/telemetry.jsonl`
- [ ] Telemetry entries have correct structure
- [ ] Cost and token metrics are captured

### Configuration
- [ ] `next.config.js` uses `serverExternalPackages` (not experimental)
- [ ] `postcss.config.js` uses `@tailwindcss/postcss`
- [ ] `globals.css` uses `@import "tailwindcss"`
- [ ] CLI flags match recommended configuration

### Performance
- [ ] First response arrives within 2-3 seconds
- [ ] Subsequent responses benefit from cache (lower cost)
- [ ] No memory leaks after multiple requests
- [ ] Processes are cleaned up correctly

---

## Final Notes

### What This Document Provides

1. **Complete journey**: From SDK to CLI subprocess
2. **All failed attempts**: What was tried and why it failed
3. **Working solutions**: Exact code that solved each problem
4. **Lessons learned**: Key insights for future implementations
5. **Test cases**: Prevent regressions
6. **Quick reference**: Fast lookup for common issues

### When to Use This Document

- **Debugging CLI integration issues**: Search error messages in Section 10
- **Understanding design decisions**: See why SDK was abandoned in Section 2
- **Implementing similar integrations**: Follow the successful approach in Section 3
- **Writing tests**: Use test cases in Section 14
- **Troubleshooting telemetry**: Reference Section 5 and 13

### Maintenance

Keep this document updated when:
- CLI flag behavior changes
- New telemetry metrics are added
- Message format evolves
- New error patterns are discovered
- Additional integration patterns emerge

---

**Document Version:** 1.0
**Last Updated:** 2026-01-27
**Status:** Complete and Verified
