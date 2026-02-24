#!/bin/bash
# Create a regression test for a bug fix
# Usage: ./scripts/create-regression-test.sh "Bug description" "file-that-was-fixed.ts"

BUG_DESCRIPTION="$1"
FIXED_FILE="$2"
DATE=$(date +%Y-%m-%d)
BUG_ID=$(echo "$BUG_DESCRIPTION" | md5sum | cut -c1-8)

if [ -z "$BUG_DESCRIPTION" ] || [ -z "$FIXED_FILE" ]; then
  echo "Usage: $0 \"Bug description\" \"path/to/fixed-file.ts\""
  echo ""
  echo "Example:"
  echo "  $0 \"Sessions not showing when switching workspaces\" \"src/components/sidebar/SessionList.tsx\""
  exit 1
fi

# Determine test file path
TEST_DIR="__tests__/regression"
TEST_FILE="$TEST_DIR/bug-${BUG_ID}.test.ts"

mkdir -p "$TEST_DIR"

# Generate test template
cat > "$TEST_FILE" << EOF
/**
 * Regression Test: ${BUG_DESCRIPTION}
 *
 * Bug ID: ${BUG_ID}
 * Date Fixed: ${DATE}
 * File Fixed: ${FIXED_FILE}
 *
 * This test ensures the bug does not reoccur.
 */

import { describe, it, expect } from 'vitest';

describe('Regression: ${BUG_DESCRIPTION}', () => {
  /**
   * Scenario that triggered the bug:
   * TODO: Describe the exact user action or state that caused the bug
   */
  it('should not regress: ${BUG_DESCRIPTION}', () => {
    // TODO: Implement test that would have caught this bug
    //
    // Steps:
    // 1. Set up the state that existed before the bug
    // 2. Perform the action that triggered the bug
    // 3. Assert the correct behavior (not the buggy behavior)
    //
    // Example:
    // const result = functionThatWasBuggy(input);
    // expect(result).toBe(expectedCorrectValue);

    expect(true).toBe(true); // Replace with actual test
  });

  /**
   * Edge cases related to this bug:
   * TODO: Add tests for similar scenarios
   */
  it('should handle edge case: [describe edge case]', () => {
    // TODO: Test edge cases that might have similar bugs
    expect(true).toBe(true); // Replace with actual test
  });
});

/**
 * Root Cause Analysis:
 * TODO: Document what caused this bug
 *
 * What was wrong:
 *   [Describe the incorrect code/logic]
 *
 * What was the fix:
 *   [Describe the fix]
 *
 * Why it wasn't caught:
 *   [Describe why existing tests didn't catch it]
 *
 * Prevention:
 *   [What process/test should prevent this in future]
 */
EOF

echo "✅ Created regression test: $TEST_FILE"
echo ""
echo "Next steps:"
echo "  1. Edit $TEST_FILE"
echo "  2. Implement the actual test logic"
echo "  3. Run: npx vitest run $TEST_FILE"
echo "  4. Commit with the bug fix"
