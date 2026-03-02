#!/bin/bash
# Stop Hook - Sends session trace to LangSmith when session ends
# This runs automatically when you exit Claude Code

# Don't fail the hook on errors (prevents blocking session exit)
set +e

# Get session info from Claude Code environment variables
SESSION_ID="${CLAUDE_SESSION_ID:-unknown}"
SESSION_START="${CLAUDE_SESSION_START:-$(date -d '1 hour ago' +%s)}"
SESSION_END="$(date +%s)"
DURATION=$((SESSION_END - SESSION_START))
WORK_DIR="${PWD}"

# Check if tracing is enabled in settings.local.json
TRACING_ENABLED="false"
if [ -f ".claude/settings.local.json" ]; then
  TRACING_ENABLED=$(jq -r '.tracing.langsmith.enabled // false' .claude/settings.local.json 2>/dev/null || echo "false")
fi

# Also check environment variable as fallback
if [ "${LANGSMITH_TRACING}" = "true" ]; then
  TRACING_ENABLED="true"
fi

# Exit if tracing is disabled
if [ "${TRACING_ENABLED}" != "true" ]; then
  exit 0
fi

# Create temp file with session data
TRACE_DATA=$(mktemp)
cat > "$TRACE_DATA" << TRACE_EOF
{
  "sessionId": "${SESSION_ID}",
  "duration": ${DURATION},
  "startTime": ${SESSION_START},
  "endTime": ${SESSION_END},
  "workDir": "${WORK_DIR}",
  "timestamp": "$(date -Iseconds)"
}
TRACE_EOF

# Send trace to LangSmith (async, don't block exit)
npx tsx .claude/hooks/send-trace.ts "$TRACE_DATA" &

# Cleanup
rm -f "$TRACE_DATA"

exit 0
