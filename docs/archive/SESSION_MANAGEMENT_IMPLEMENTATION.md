# Session Management Implementation

## Overview

Implemented session history persistence and switching in the sidebar, allowing users to:
- View list of previous chat sessions
- Switch between sessions (CLI maintains conversation history)
- Start new sessions cleanly
- Auto-save sessions on first message
- Delete unwanted sessions

## Changes Made

### 1. Store with Persistence (`/workspace/src/lib/store/index.ts`)

**Added:**
- Import `persist` middleware from `zustand/middleware`
- New session management methods:
  - `startNewSession()` - Clears current session and starts fresh
  - `switchSession(sessionId)` - Switches to an existing session
  - `updateSessionName(sessionId, name)` - Updates session name
  - `deleteSession(sessionId)` - Removes session from history
  - `saveCurrentSession()` - Saves current session to history

**Key Implementation Details:**
- Wrapped store with `persist()` middleware
- Store name: `'claude-code-sessions'`
- Persists only: `sessions`, `sessionId`, `currentSession` (not messages/toolExecutions)
- Session name auto-generated from first user message (first 50 chars)
- Session includes: id, name, created_at, updated_at, cwd

### 2. SessionList Component (`/workspace/src/components/sidebar/SessionList.tsx`)

**New component showing:**
- List of sessions sorted by `updated_at` (most recent first)
- Session name (truncated)
- Relative timestamps (0m, 5m, 1h, 2d ago)
- Delete button (× icon)
- Highlights active session (blue background)
- Handles hydration with `isClient` state check

**Interaction:**
- Click session → switches to that session
- Click × → deletes session (prevents event propagation)
- Empty state shows "No previous sessions"

### 3. Updated Sidebar (`/workspace/src/components/sidebar/Sidebar.tsx`)

**Changes:**
- Import and render `<SessionList />`
- "New Chat" button calls `startNewSession()` instead of `clearMessages()`
- Replaced "Current Session" display with "History" section
- Cleaner layout with session list taking up main area

### 4. Auto-save Hook (`/workspace/src/hooks/useClaudeChat.ts`)

**Changes:**
- Import `saveCurrentSession` from store
- After receiving session_id from CLI, call `saveCurrentSession()` with 100ms delay
- Added to dependency array

**Flow:**
```typescript
// When system message with session_id arrives:
if (message.session_id) {
  setSessionId(message.session_id);
  setTimeout(() => saveCurrentSession(), 100);
}
```

## Data Flow

### Creating New Session
```
User: "New Chat" → startNewSession()
  ↓
Clears: sessionId, currentSession, messages, toolExecutions, sessionUsage, error
  ↓
User sends message
  ↓
API returns session_id
  ↓
setSessionId() + saveCurrentSession()
  ↓
Session added to sessions[] array
  ↓
persist middleware → localStorage
  ↓
SessionList re-renders with new session
```

### Switching Sessions
```
User clicks session → switchSession(id)
  ↓
Find session in sessions[]
  ↓
Set: sessionId, currentSession
Clear: messages, toolExecutions, sessionUsage
  ↓
User sends message
  ↓
API uses --session-id flag
  ↓
CLI continues that conversation
```

### Persistence
```
Browser refresh/reload
  ↓
persist middleware restores from localStorage
  ↓
sessions[], sessionId, currentSession loaded
  ↓
SessionList renders with persisted data
```

## LocalStorage Structure

**Key:** `'claude-code-sessions'`

**Value:**
```json
{
  "state": {
    "sessions": [
      {
        "id": "9259694a-2b1c-4efc-a6ca-2a0fd98a055b",
        "name": "Hello, this is my first test message",
        "created_at": 1769570305000,
        "updated_at": 1769570405000,
        "cwd": "/workspace"
      },
      // ... more sessions
    ],
    "sessionId": "9259694a-2b1c-4efc-a6ca-2a0fd98a055b",
    "currentSession": {
      "id": "9259694a-2b1c-4efc-a6ca-2a0fd98a055b",
      "name": "Hello, this is my first test message",
      "created_at": 1769570305000,
      "updated_at": 1769570405000,
      "cwd": "/workspace"
    }
  },
  "version": 0
}
```

## Features

### Session Name Generation
- Extracted from first user message
- Truncated to 50 characters
- Fallback: "New Chat" if no message available

### Relative Timestamps
- < 60 minutes: "5m ago"
- < 24 hours: "2h ago"
- >= 24 hours: "3d ago"

### Active Session Highlighting
- Blue background (bg-blue-100)
- Blue text (text-blue-900)
- Inactive: gray background on hover

### Delete Functionality
- Click × to delete
- If deleting active session: resets UI (clears sessionId, messages, etc.)
- Event propagation stopped to prevent switching

## Integration with Claude CLI

The CLI integration remains unchanged:
- API spawns: `claude -p --verbose --output-format stream-json --include-partial-messages`
- When switching sessions, passes: `--session-id <id>`
- CLI maintains full conversation history server-side
- UI only stores session metadata (not messages)

## Testing

See `/workspace/SESSION_MANAGEMENT_TEST.md` for complete testing guide.

**Quick Test:**
1. Open http://localhost:3000
2. Send message → session appears in sidebar
3. Click "New Chat" → UI resets
4. Send message → new session appears
5. Click first session → switches back
6. Refresh page → sessions persist

## Files Modified

| File | Lines Changed | Type |
|------|--------------|------|
| `/workspace/src/lib/store/index.ts` | ~80 | Modified |
| `/workspace/src/components/sidebar/SessionList.tsx` | 64 | New |
| `/workspace/src/components/sidebar/Sidebar.tsx` | ~15 | Modified |
| `/workspace/src/hooks/useClaudeChat.ts` | 5 | Modified |

## Notes

- Messages are NOT persisted locally (only in CLI session history)
- Session list sorted by `updated_at` (most recent first)
- Hydration handled with `isClient` check to avoid SSR mismatch
- 100ms delay in `saveCurrentSession()` ensures messages array is populated
- Delete button uses `stopPropagation()` to prevent session switch
