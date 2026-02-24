#!/bin/bash
# Fast Path Eligibility Checker
# Determines if staged changes qualify for fast-path development (skip full review)
#
# Usage: ./scripts/check-fast-path-eligible.sh [--verbose]
#
# Exit codes:
#   0 - Eligible for fast path
#   1 - Not eligible (use full review process)
#   2 - No staged changes

set -e

VERBOSE=false
if [ "$1" = "--verbose" ] || [ "$1" = "-v" ]; then
  VERBOSE=true
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_verbose() {
  if [ "$VERBOSE" = true ]; then
    echo -e "${YELLOW}[DEBUG]${NC} $1"
  fi
}

# Check if there are staged changes
STAGED_FILES=$(git diff --cached --name-only 2>/dev/null)
if [ -z "$STAGED_FILES" ]; then
  echo -e "${RED}No staged changes found.${NC}"
  echo "Stage your changes with: git add <files>"
  exit 2
fi

# Count staged files
STAGED_FILE_COUNT=$(echo "$STAGED_FILES" | wc -l | tr -d ' ')
log_verbose "Staged files: $STAGED_FILE_COUNT"
log_verbose "Files: $STAGED_FILES"

# Criterion 1: Max 2 files
if [ "$STAGED_FILE_COUNT" -gt 2 ]; then
  echo -e "${RED}Not eligible: $STAGED_FILE_COUNT files modified (max 2)${NC}"
  exit 1
fi

# Count insertions and deletions
STAT_LINE=$(git diff --cached --stat 2>/dev/null | tail -1)
log_verbose "Stat line: $STAT_LINE"

# Extract insertions (handles "X insertion(s)")
INSERTIONS=$(echo "$STAT_LINE" | grep -oE '[0-9]+ insertion' | grep -oE '[0-9]+' || echo "0")
# Extract deletions (handles "X deletion(s)")
DELETIONS=$(echo "$STAT_LINE" | grep -oE '[0-9]+ deletion' | grep -oE '[0-9]+' || echo "0")

# Default to 0 if empty
INSERTIONS=${INSERTIONS:-0}
DELETIONS=${DELETIONS:-0}

TOTAL_LINES=$((INSERTIONS + DELETIONS))
log_verbose "Lines changed: $TOTAL_LINES (ins: $INSERTIONS, del: $DELETIONS)"

# Criterion 2: Max 20 lines total
if [ "$TOTAL_LINES" -gt 20 ]; then
  echo -e "${RED}Not eligible: $TOTAL_LINES lines changed (max 20)${NC}"
  exit 1
fi

# Criterion 3: No risky patterns in the diff
DIFF_CONTENT=$(git diff --cached 2>/dev/null)

# Patterns that indicate risky changes
# These should trigger full review process
RISKY_PATTERNS=(
  # Function signature changes (but not comments about functions)
  '^[+-][^#/]*function [a-zA-Z_][a-zA-Z0-9_]*\s*\('
  '^[+-][^#/]*const [a-zA-Z_][a-zA-Z0-9_]*\s*=\s*\([^)]*\)\s*=>'
  '^[+-][^#/]*const [a-zA-Z_][a-zA-Z0-9_]*\s*=\s*async\s*\('
  # Type/interface definitions
  '^[+-]\s*interface [A-Z]'
  '^[+-]\s*type [A-Z][a-zA-Z0-9_]*\s*='
  # Export changes
  '^[+-]\s*export (default |const |function |interface |type |class )'
  # API route patterns
  '^[+-].*\.(get|post|put|delete|patch)\s*\('
  '^[+-].*route\.(get|post|put|delete|patch)'
  '^[+-].*app\.(get|post|put|delete|patch)'
  # Request/Response shape changes
  '^[+-].*return\s*\{[^}]*\}'
  '^[+-].*res\.(json|send|status)'
)

# Check each risky pattern
for pattern in "${RISKY_PATTERNS[@]}"; do
  if echo "$DIFF_CONTENT" | grep -qE "$pattern"; then
    MATCH=$(echo "$DIFF_CONTENT" | grep -E "$pattern" | head -1)
    log_verbose "Pattern matched: $pattern"
    log_verbose "Match: $MATCH"
    echo -e "${RED}Not eligible: Contains risky pattern${NC}"
    if [ "$VERBOSE" = true ]; then
      echo "  Pattern: $pattern"
      echo "  Match: $MATCH"
    fi
    exit 1
  fi
done

# Check if changes are test-only (allowed) - check BEFORE cross-file import check
NON_TEST_FILES=$(echo "$STAGED_FILES" | grep -v '__tests__' | grep -v '\.test\.' | grep -v '\.spec\.' || true)
if [ -z "$NON_TEST_FILES" ]; then
  log_verbose "Test-only changes detected"
  echo -e "${GREEN}Eligible for fast path${NC} (test-only changes)"
  exit 0
fi

# Check for cross-file import changes (import from same module in multiple files)
# This check must come after test-only check but before logging-only check
# Pattern: line starts with + or -, optionally whitespace, then import...from
# Note: hyphen must be placed last in character class to avoid range interpretation
IMPORT_CHANGES=$(echo "$DIFF_CONTENT" | grep -E '^[+-]\s*import .* from' | grep -v '^---' | grep -v '^[+][+][+]' || true)
if [ -n "$IMPORT_CHANGES" ] && [ "$STAGED_FILE_COUNT" -gt 1 ]; then
  log_verbose "Import changes in multi-file commit: $IMPORT_CHANGES"
  echo -e "${RED}Not eligible: Cross-file import changes detected${NC}"
  exit 1
fi

# Check if changes are logging-only (allowed)
# Filter out context lines (no +/-) and headers
# Note: Use literal +++ instead of \+\+\+ because ERE interprets \+ differently
REAL_CHANGES=$(echo "$DIFF_CONTENT" | grep -E '^[+-]' | grep -v '^---' | grep -v '^+++' || true)
# Filter out logging, comments, and also import statements (they're safe if we got here - single file)
NON_LOG_CHANGES=$(echo "$REAL_CHANGES" | grep -v 'console\.' | grep -v 'log\.' | grep -v 'logger\.' | grep -v '\/\/' | grep -v '^\s*\*' | grep -v '^[+-]import ' || true)

if [ -z "$NON_LOG_CHANGES" ]; then
  log_verbose "Logging-only changes detected"
  echo -e "${GREEN}Eligible for fast path${NC} (logging/comment only)"
  exit 0
fi

# All checks passed
echo -e "${GREEN}Eligible for fast path${NC}"
echo ""
echo "Checklist before committing:"
echo "  [ ] Change does what I intended"
echo "  [ ] No accidental modifications"
echo "  [ ] Build passes: npm run build"
exit 0
