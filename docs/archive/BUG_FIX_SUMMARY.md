# Bug Fix: "Unknown Error" in UI

## Problem
Users were seeing an "unknown error" message when sending messages through the UI, even though the Claude CLI was responding successfully.

## Root Cause
The Claude CLI outputs telemetry data at the end of its response in JavaScript object notation (not JSON):

```javascript
{
  descriptor: {
    name: 'claude_code.cost.usage',
    ...
  }
}
```

This telemetry output includes lines like:
- `{` (standalone opening brace)
- `descriptor: {` (unquoted keys)
- `valueType: 1` (more JS object notation)

The API route was trying to parse these lines as JSON, failing, and sending error messages to the UI even after receiving a successful result.

## The Fix

### 1. Improved JSON Filtering (`/workspace/src/app/api/claude/route.ts`)

**Added filters for:**
- Standalone braces: `{` and `}`
- Telemetry keywords: `descriptor:`, `valueType:`
- Empty lines

**Added success tracking:**
- Track when we receive `{"type":"result","subtype":"success"}`
- Only send error messages on process exit if we didn't receive a success result

```typescript
let receivedSuccessResult = false;

// In stdout handler:
if (parsed.type === 'result' && parsed.subtype === 'success') {
  receivedSuccessResult = true;
}

// In close handler:
if (code !== 0 && !receivedSuccessResult && stderrBuffer) {
  // Only report errors if we didn't get a success
}
```

### 2. Frontend Error Handling (`/workspace/src/hooks/useClaudeChat.ts`)

**Added success tracking:**
- Track when we receive a successful result
- Ignore error messages that come after a successful result

```typescript
let receivedSuccessResult = false;

// When processing result messages:
if (message.subtype === 'success') {
  receivedSuccessResult = true;
}

// When processing error messages:
if (message.type === 'error' && !receivedSuccessResult) {
  setError(message.error);
}
```

## Verification

### Before Fix:
```bash
curl http://localhost:3000/api/claude -d '{"prompt":"hello"}'
# Output included:
data: {"type":"error","error":"CLI output was not valid JSON..."}
```

### After Fix:
```bash
curl http://localhost:3000/api/claude -d '{"prompt":"hello"}'
# No error messages - only:
data: {"type":"result","subtype":"success",...}
data: [DONE]
```

## Files Modified
1. `/workspace/src/app/api/claude/route.ts` - Improved filtering and success tracking
2. `/workspace/src/hooks/useClaudeChat.ts` - Added frontend success tracking

## Testing Steps

1. Open http://localhost:3000
2. Send message: "hello"
3. Verify:
   - ✅ No "unknown error" appears
   - ✅ Response streams correctly
   - ✅ Message displays in UI

## Result
The "unknown error" is now gone. The UI correctly ignores telemetry noise from the CLI and only reports actual errors.
