#!/bin/bash
# Tests for check-fast-path-eligible.sh
#
# Usage: ./__tests__/scripts/check-fast-path-eligible.test.sh
#
# This script creates temporary git repos to test various scenarios

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
CHECK_SCRIPT="$SCRIPT_DIR/scripts/check-fast-path-eligible.sh"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Create a temporary directory for test repos
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

setup_test_repo() {
  local test_name=$1
  local test_dir="$TEMP_DIR/$test_name"
  mkdir -p "$test_dir"
  cd "$test_dir"
  git init --quiet
  git config user.email "test@test.com"
  git config user.name "Test"
  # Create initial commit
  echo "initial" > initial.txt
  git add initial.txt
  git commit -m "initial" --quiet
}

run_test() {
  local test_name=$1
  local expected_exit=$2
  local expected_output=$3

  TESTS_RUN=$((TESTS_RUN + 1))

  # Run the check script and capture output/exit code
  set +e
  OUTPUT=$("$CHECK_SCRIPT" 2>&1)
  EXIT_CODE=$?
  set -e

  # Check exit code
  if [ "$EXIT_CODE" -ne "$expected_exit" ]; then
    echo -e "${RED}FAIL${NC}: $test_name"
    echo "  Expected exit code: $expected_exit, got: $EXIT_CODE"
    echo "  Output: $OUTPUT"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return
  fi

  # Check output contains expected string
  if [ -n "$expected_output" ] && ! echo "$OUTPUT" | grep -q "$expected_output"; then
    echo -e "${RED}FAIL${NC}: $test_name"
    echo "  Expected output to contain: $expected_output"
    echo "  Got: $OUTPUT"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return
  fi

  echo -e "${GREEN}PASS${NC}: $test_name"
  TESTS_PASSED=$((TESTS_PASSED + 1))
}

echo "Running check-fast-path-eligible.sh tests..."
echo ""

# Test 1: No staged changes
echo -e "${YELLOW}Test 1: No staged changes${NC}"
setup_test_repo "test1"
run_test "No staged changes" 2 "No staged changes"

# Test 2: Single file, small change (eligible)
echo -e "${YELLOW}Test 2: Single file, small change (eligible)${NC}"
setup_test_repo "test2"
echo "// Comment fix" > file.js
git add file.js
run_test "Single file, small change" 0 "Eligible for fast path"

# Test 3: Too many files (3 files)
echo -e "${YELLOW}Test 3: Too many files (3 files)${NC}"
setup_test_repo "test3"
echo "a" > a.js
echo "b" > b.js
echo "c" > c.js
git add a.js b.js c.js
run_test "Too many files" 1 "files modified"

# Test 4: Too many lines (>20)
echo -e "${YELLOW}Test 4: Too many lines (>20)${NC}"
setup_test_repo "test4"
for i in $(seq 1 25); do
  echo "line $i" >> big.js
done
git add big.js
run_test "Too many lines" 1 "lines changed"

# Test 5: Function signature change (risky)
echo -e "${YELLOW}Test 5: Function signature change (risky)${NC}"
setup_test_repo "test5"
echo "function foo() {}" > func.js
git add func.js
git commit -m "add func" --quiet
echo "function foo(param) {}" > func.js
git add func.js
run_test "Function signature change" 1 "risky pattern"

# Test 6: Interface definition (risky)
echo -e "${YELLOW}Test 6: Interface definition (risky)${NC}"
setup_test_repo "test6"
echo "interface User { name: string }" > types.ts
git add types.ts
run_test "Interface definition" 1 "risky pattern"

# Test 7: Export statement (risky)
echo -e "${YELLOW}Test 7: Export statement (risky)${NC}"
setup_test_repo "test7"
echo "export const foo = 1" > exports.ts
git add exports.ts
run_test "Export statement" 1 "risky pattern"

# Test 8: Test-only changes (eligible)
echo -e "${YELLOW}Test 8: Test-only changes (eligible)${NC}"
setup_test_repo "test8"
mkdir -p __tests__
echo "test code" > __tests__/example.test.ts
git add __tests__/example.test.ts
run_test "Test-only changes" 0 "test-only"

# Test 9: Logging addition (eligible)
echo -e "${YELLOW}Test 9: Logging addition (eligible)${NC}"
setup_test_repo "test9"
echo "const x = 1;" > file.js
git add file.js
git commit -m "add file" --quiet
echo "const x = 1;" > file.js
echo "console.log(x);" >> file.js
git add file.js
run_test "Logging addition" 0 "Eligible"

# Test 10: Comment only (eligible)
echo -e "${YELLOW}Test 10: Comment only (eligible)${NC}"
setup_test_repo "test10"
echo "// old comment" > file.js
git add file.js
git commit -m "add" --quiet
echo "// new comment" > file.js
git add file.js
run_test "Comment only" 0 "comment only"

# Test 11: Type definition (risky)
echo -e "${YELLOW}Test 11: Type definition (risky)${NC}"
setup_test_repo "test11"
echo "type UserID = string" > types.ts
git add types.ts
run_test "Type definition" 1 "risky pattern"

# Test 12: Arrow function signature change (risky)
echo -e "${YELLOW}Test 12: Arrow function signature change (risky)${NC}"
setup_test_repo "test12"
# First, create an existing arrow function and commit it
echo "const handler = () => {}" > func.ts
git add func.ts
git commit -m "add handler" --quiet
# Now modify the signature (add parameter)
echo "const handler = (param) => {}" > func.ts
git add func.ts
run_test "Arrow function signature change" 1 "risky pattern"

# Test 13: Exactly 2 files (eligible if small)
echo -e "${YELLOW}Test 13: Exactly 2 files (eligible if small)${NC}"
setup_test_repo "test13"
echo "// comment" > a.js
echo "// comment" > b.js
git add a.js b.js
run_test "Exactly 2 files" 0 "Eligible"

# Test 14: Exactly 20 lines (eligible)
echo -e "${YELLOW}Test 14: Exactly 20 lines (eligible)${NC}"
setup_test_repo "test14"
for i in $(seq 1 20); do
  echo "// line $i" >> twenty.js
done
git add twenty.js
run_test "Exactly 20 lines" 0 "Eligible"

# Test 15: 21 lines (not eligible)
echo -e "${YELLOW}Test 15: 21 lines (not eligible)${NC}"
setup_test_repo "test15"
for i in $(seq 1 21); do
  echo "// line $i" >> twenty-one.js
done
git add twenty-one.js
run_test "21 lines" 1 "lines changed"

# Test 16: Cross-file import changes (risky)
echo -e "${YELLOW}Test 16: Cross-file import changes (risky)${NC}"
setup_test_repo "test16"
echo "import { foo } from './utils'" > a.ts
echo "import { foo } from './utils'" > b.ts
git add a.ts b.ts
run_test "Cross-file imports" 1 "Cross-file import"

# Test 17: Spec file (test file variant)
echo -e "${YELLOW}Test 17: Spec file (test file variant)${NC}"
setup_test_repo "test17"
echo "test code" > example.spec.ts
git add example.spec.ts
run_test "Spec file (test-only)" 0 "test-only"

# Test 18: Binary file (image - eligible if small)
echo -e "${YELLOW}Test 18: Binary file (image - eligible if small)${NC}"
setup_test_repo "test18"
# Create a small binary file (1x1 PNG)
printf '\x89PNG\r\n\x1a\n' > icon.png
git add icon.png
run_test "Binary file (small image)" 0 "Eligible"

# Test 19: Empty file (0 bytes)
echo -e "${YELLOW}Test 19: Empty file (0 bytes)${NC}"
setup_test_repo "test19"
touch empty.txt
git add empty.txt
run_test "Empty file" 0 "Eligible"

# Test 20: File with special characters in name
echo -e "${YELLOW}Test 20: File with special characters in name${NC}"
setup_test_repo "test20"
echo "content" > "file with spaces.ts"
git add "file with spaces.ts"
run_test "File with spaces in name" 0 "Eligible"

# Test 21: File with unicode characters in name
echo -e "${YELLOW}Test 21: File with unicode characters in name${NC}"
setup_test_repo "test21"
echo "content" > "file-with-émojis.ts"
git add "file-with-émojis.ts"
run_test "File with unicode in name" 0 "Eligible"

# Test 22: Font file (binary - eligible if small)
echo -e "${YELLOW}Test 22: Font file (binary - eligible if small)${NC}"
setup_test_repo "test22"
# Create minimal content to simulate a font file
printf 'WOFF2' > font.woff2
git add font.woff2
run_test "Font file (binary)" 0 "Eligible"

# Print summary
echo ""
echo "========================================"
echo "Tests Run: $TESTS_RUN"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
echo "========================================"

if [ "$TESTS_FAILED" -gt 0 ]; then
  exit 1
fi
exit 0
