# Session Management Testing Guide

## Test Procedure

Follow these steps to verify the session management feature:

### 1. Start Fresh
1. Open http://localhost:3000 in your browser
2. Check the sidebar - should show "No previous sessions"

### 2. Create First Session
1. Send a message: "Hello, this is my first test message"
2. Wait for response
3. Check sidebar:
   - A new session should appear under "History"
   - Session name should be: "Hello, this is my first test message" (truncated to 50 chars)
   - Should show "0m ago"

### 3. Continue First Session
1. Send another message: "Can you help me test sessions?"
2. The session should update (still same session ID)
3. Click the session in sidebar - it should be highlighted

### 4. Create Second Session
1. Click "New Chat" button
2. Sidebar should show both sessions, but none highlighted
3. Send message: "This is a second session"
4. New session appears in sidebar (highlighted)
5. Both sessions should now be visible

### 5. Switch Between Sessions
1. Click the first session in sidebar
2. Session ID should change
3. Messages should clear (CLI maintains history)
4. Send a message - should continue the first session's conversation

### 6. Delete Session
1. Hover over a session in sidebar
2. Click the × button
3. Session should be removed from list
4. If it was active, UI should reset

### 7. Test Persistence
1. Refresh the page (F5)
2. All sessions should still appear in sidebar
3. Last active session should be highlighted

## Expected Data Flow

```
User sends first message
  ↓
API returns session_id
  ↓
saveCurrentSession() adds to sessions[]
  ↓
persist middleware saves to localStorage
  ↓
SessionList renders the new session

Click "New Chat"
  ↓
startNewSession() clears sessionId, messages
  ↓
User sends message → new session_id created
  ↓
Process repeats

Click existing session
  ↓
switchSession(id) sets sessionId
  ↓
Next message uses --session-id flag
  ↓
CLI continues that conversation
```

## Files Modified

- `/workspace/src/lib/store/index.ts` - Added persist middleware and session methods
- `/workspace/src/components/sidebar/SessionList.tsx` - New component for session history
- `/workspace/src/components/sidebar/Sidebar.tsx` - Integrated SessionList
- `/workspace/src/hooks/useClaudeChat.ts` - Calls saveCurrentSession after receiving session ID

## Verification Checklist

- [ ] Sessions appear in sidebar after first message
- [ ] "New Chat" creates fresh session
- [ ] Sessions persist after page refresh
- [ ] Can switch between sessions
- [ ] Session names are auto-generated from first message
- [ ] Delete button removes sessions
- [ ] Active session is highlighted
- [ ] Relative timestamps display correctly (0m, 5m, 1h, 2d ago)
