#!/bin/bash
# SessionStart Hook - Runs at the beginning of every Claude Code session
# This enforces mandatory verification before any work begins

cd /workspace

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "🔒 MANDATORY SESSION START VERIFICATION"
echo "════════════════════════════════════════════════════════════════"

# Quick build check (timeout after 60 seconds)
echo "🔨 Verifying TypeScript builds..."
timeout 60 npm run build > /tmp/session-build.log 2>&1
BUILD_STATUS=$?

if [ $BUILD_STATUS -eq 0 ]; then
  echo "✅ Build passes - environment verified"
elif [ $BUILD_STATUS -eq 124 ]; then
  echo "⚠️  Build check timed out (>60s) - proceeding with caution"
else
  echo ""
  echo "❌ BUILD FAILS - REVIEW ERRORS BEFORE PROCEEDING"
  echo "════════════════════════════════════════════════════════════════"
  tail -30 /tmp/session-build.log
  echo "════════════════════════════════════════════════════════════════"
  echo ""
  echo "Run 'npm run build' to see full errors"
fi

echo ""
