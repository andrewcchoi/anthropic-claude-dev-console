#!/bin/bash
# MANDATORY Session Start Verification
# Run this at the start of EVERY development session
# This script verifies the codebase is in a clean state before any work begins

set -e

echo "════════════════════════════════════════════════════════════════"
echo "🔍 ENVIRONMENT VERIFICATION (Run at session start)"
echo "════════════════════════════════════════════════════════════════"
echo ""

ERRORS=0

# ============================================================================
# CHECK 1: TypeScript Compiles
# ============================================================================
echo "🔨 Check 1: TypeScript Build"
if npm run build > /tmp/build-check.log 2>&1; then
  echo "   ✅ Build passes"
else
  echo "   ❌ BUILD FAILS - Fix before proceeding!"
  echo "   Run: npm run build"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# ============================================================================
# CHECK 2: No Stale Dev Servers
# ============================================================================
echo "🖥️  Check 2: Port Availability"
for PORT in 3000 3001 3002; do
  if lsof -i :$PORT > /dev/null 2>&1; then
    echo "   ⚠️  Port $PORT is in use"
    PIDS=$(lsof -t -i :$PORT 2>/dev/null || true)
    echo "      PIDs: $PIDS"
  else
    echo "   ✅ Port $PORT is free"
  fi
done
echo ""

# ============================================================================
# CHECK 3: Git Status
# ============================================================================
echo "📝 Check 3: Git Status"
UNCOMMITTED=$(git status --porcelain | wc -l)
if [ "$UNCOMMITTED" -gt 0 ]; then
  echo "   ⚠️  $UNCOMMITTED uncommitted changes"
  git status --short | head -10
else
  echo "   ✅ Working directory clean"
fi
echo ""

# ============================================================================
# CHECK 4: Dependencies Installed
# ============================================================================
echo "📦 Check 4: Dependencies"
if [ -d "node_modules" ]; then
  echo "   ✅ node_modules exists"
else
  echo "   ❌ node_modules missing - run: npm install"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# ============================================================================
# CHECK 5: Pre-commit Hook Active
# ============================================================================
echo "🪝 Check 5: Pre-commit Hook"
if [ -x ".git/hooks/pre-commit" ]; then
  echo "   ✅ Pre-commit hook is executable"
else
  echo "   ❌ Pre-commit hook not executable!"
  echo "      Run: chmod +x .git/hooks/pre-commit"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# ============================================================================
# SUMMARY
# ============================================================================
echo "════════════════════════════════════════════════════════════════"
if [ "$ERRORS" -eq 0 ]; then
  echo "✅ ENVIRONMENT VERIFIED - Ready for development"
else
  echo "❌ $ERRORS ISSUE(S) FOUND - Fix before proceeding"
fi
echo "════════════════════════════════════════════════════════════════"

exit $ERRORS
