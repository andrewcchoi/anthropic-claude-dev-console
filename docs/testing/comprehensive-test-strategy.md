# Comprehensive Test Strategy: Zero-Gap Testing

**Version**: 1.0
**Last Updated**: 2026-02-24
**Status**: Draft (Iteration 1)

## Problem Statement

The workspace session selection feature had 45 passing tests (>90% coverage) but still shipped with a critical bug: `switchSession()` was called without the `projectId` parameter in 5 locations, causing 404 errors for sessions in non-default workspaces.

**Root Cause**: Tests focused on new code but didn't audit existing call sites or verify integration points.

## The Gap

Traditional TDD answers: "Does my new code work?"
But fails to answer: "Did I update all the places that need updating?"

## Zero-Gap Testing Strategy

### Core Principles

1. **Test what you wrote** (TDD)
2. **Test what you touched** (Call-site audit)
3. **Test what interacts** (Integration testing)
4. **Test what can break** (Regression testing)
5. **Enforce completeness** (Automated checklist validation)

---

## The Layered Test Pyramid

```
         ┌─────────────┐
         │  Call-Site  │  ← NEW: Automated grep-based audits
         │   Audits    │     Verify all callers updated
         └─────────────┘
              ▲
         ┌─────────────┐
         │ Integration │  ← E2E: Component → Store → API
         │    Tests    │     Verify data flows correctly
         └─────────────┘
              ▲
         ┌─────────────┐
         │  Component  │  ← UI behavior with mocked deps
         │    Tests    │     Verify user interactions
         └─────────────┘
              ▲
         ┌─────────────┐
         │    Hook     │  ← Custom hooks in isolation
         │    Tests    │     Verify hook logic
         └─────────────┘
              ▲
         ┌─────────────┐
         │    Store    │  ← Pure functions, state transitions
         │    Tests    │     Verify business logic
         └─────────────┘
```

---

## Layer 1: Store Tests (Foundation)

**What to test:**
- All store actions (add, update, delete, etc.)
- All selectors/getters
- State transitions
- Edge cases (empty state, missing data, invalid input)

**Example from the bug:**
```typescript
// ✅ This was tested
describe('updateWorkspaceLastActiveSession', () => {
  it('should update lastActiveSessionId', () => {
    // ...tested
  });
});

// ❌ This was NOT tested
describe('switchSession parameter validation', () => {
  it('should require projectId when switching to non-default workspace', () => {
    // Missing test
  });
});
```

**Checklist:**
- [ ] All actions have unit tests
- [ ] All selectors have unit tests
- [ ] Cross-store coordination is tested
- [ ] Edge cases are covered
- [ ] Invalid input is handled

---

## Layer 2: Hook Tests

**What to test:**
- Hook return values
- Hook side effects (API calls, state updates)
- Hook cleanup (useEffect cleanup functions)
- Hook error handling

**Example from the bug:**
```typescript
// ✅ This was tested
describe('useClaudeChat', () => {
  it('should cleanup stream on unmount', () => {
    // ...tested
  });
});

// ❌ This was NOT tested
describe('useClaudeChat API calls', () => {
  it('should include projectId in message fetch URL', () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    // ...should verify query params
  });
});
```

**Checklist:**
- [ ] All hooks have tests
- [ ] API calls are verified (URL, params, body)
- [ ] Cleanup functions are tested
- [ ] Error boundaries are tested

---

## Layer 3: Component Tests

**What to test:**
- Rendering with props
- User interactions (click, type, submit)
- Conditional rendering
- Event handlers call correct functions with correct args

**Example from the bug:**
```typescript
// ❌ This was NOT tested
describe('SessionList', () => {
  it('should pass workspaceId when clicking session', async () => {
    const mockSwitch = vi.fn();
    useChatStore.setState({ switchSession: mockSwitch });

    render(<SessionList />);
    await userEvent.click(screen.getByText('Session in docs'));

    expect(mockSwitch).toHaveBeenCalledWith(
      'session-id',
      '-workspace-docs'  // ← This was missing!
    );
  });
});
```

**Checklist:**
- [ ] All user interactions are tested
- [ ] Event handlers pass correct arguments
- [ ] Conditional rendering is covered
- [ ] Loading/error states are tested

---

## Layer 4: Integration Tests

**What to test:**
- Full data flow: Component → Hook → Store → API
- Cross-layer interactions
- API response handling
- Error propagation

**Example from the bug:**
```typescript
// ❌ This was NOT tested (the missing layer)
describe('Session switching integration', () => {
  it('should fetch messages from correct project directory', async () => {
    // Mock API
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ messages: [], toolExecutions: [] }))
    );

    // Render component
    render(<SessionList />);

    // Click session from non-default workspace
    await userEvent.click(screen.getByText('Session in docs'));

    // Verify API call includes projectId
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('?project=-workspace-docs')
    );
  });
});
```

**Checklist:**
- [ ] API calls are verified (full URL with query params)
- [ ] Response handling is tested
- [ ] Error propagation is tested
- [ ] State updates after API calls are verified

---

## Layer 5: Call-Site Audits (NEW)

**The Innovation**: Automated grep-based tests that verify all callers of modified functions are updated.

**How it works:**
1. After modifying a function signature, generate a call-site audit test
2. Test greps codebase for all calls to the function
3. Test verifies each call site passes required parameters
4. Fails if any call site is missing parameters

**Example from the bug:**
```typescript
// __tests__/audits/switchSession-call-sites.test.ts
describe('switchSession call-site audit', () => {
  it('should verify all call sites pass projectId parameter', async () => {
    const callSites = await grepCallSites('switchSession(');

    // Expected call sites
    const expected = [
      'SessionList.tsx:76',
      'SessionList.tsx:209',
      'SessionList.tsx:259',
      'SessionList.tsx:291',
      'UISessionItem.tsx:47',
      'ProjectList.tsx:92',
    ];

    // Verify all found
    expect(callSites).toHaveLength(expected.length);

    // Verify each passes both parameters
    for (const callSite of callSites) {
      const code = await readCallSiteCode(callSite);
      expect(code).toMatch(/switchSession\([^,]+,\s*[^)]+\)/);
      // ← Regex checks for 2 parameters
    });
  });
});
```

**Checklist:**
- [ ] Call-site audit test exists for modified functions
- [ ] All call sites are found
- [ ] Parameter count is verified
- [ ] Parameter types are validated (if possible)

---

## Implementation Workflow

### Phase 1: Planning (During Ultrathink Stage C)

1. **Identify test layers needed**
   - Which layers does this feature touch?
   - Are there function signature changes?
   - Are there new integration points?

2. **Create test checklist**
   - Use template from `.claude/test-checklists/`
   - Mark which layers are mandatory
   - Identify call-site audits needed

3. **Add to implementation plan**
   - Test tasks are part of the implementation plan
   - Each layer is a separate task group
   - Call-site audits are final verification

### Phase 2: Implementation (TDD)

1. **Write tests first** (Store → Hook → Component)
2. **Implement code**
3. **Write integration tests**
4. **Write call-site audit tests**
5. **Verify all checklists complete**

### Phase 3: Verification (Before PR)

1. **Run full test suite**: `npm test`
2. **Run coverage**: `npm test -- --coverage`
3. **Run call-site audits**: `npm run test:audits`
4. **Verify checklist**: `npm run verify-tests`
5. **Manual review**: Check git diff for missed call sites

---

## Automation & Enforcement

### CI/CD Integration

```yaml
# .github/workflows/test-verification.yml
name: Test Verification

on: [pull_request]

jobs:
  verify-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: npm ci

      - name: Run test suite
        run: npm test

      - name: Check coverage thresholds
        run: npm test -- --coverage
        env:
          COVERAGE_THRESHOLD_LINES: 90
          COVERAGE_THRESHOLD_BRANCHES: 90

      - name: Run call-site audits
        run: npm run test:audits

      - name: Verify test checklist
        run: npm run verify-tests

      - name: Fail if checklist incomplete
        run: |
          if [ -f .test-checklist-failures ]; then
            cat .test-checklist-failures
            exit 1
          fi
```

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Run tests on staged files
npm run test:staged

# Run call-site audits if function signatures changed
if git diff --cached | grep -q "switchSession\|addSession\|deleteSession"; then
  echo "⚠️  Function signature change detected - running call-site audits..."
  npm run test:audits

  if [ $? -ne 0 ]; then
    echo "❌ Call-site audit failed - some call sites may need updating"
    exit 1
  fi
fi
```

---

## Tools & Utilities

### 1. Test Checklist Generator

```typescript
// scripts/generate-test-checklist.ts
/**
 * Generates a test checklist based on files changed
 * Usage: npm run generate-checklist -- SessionList.tsx
 */
export function generateChecklist(files: string[]): TestChecklist {
  const layers = analyzeFilesForLayers(files);

  return {
    store: layers.includes('store') ? STORE_CHECKLIST : [],
    hooks: layers.includes('hooks') ? HOOK_CHECKLIST : [],
    components: layers.includes('components') ? COMPONENT_CHECKLIST : [],
    integration: INTEGRATION_CHECKLIST, // Always required
    callSites: detectFunctionChanges(files),
  };
}
```

### 2. Call-Site Audit Generator

```typescript
// scripts/generate-call-site-audit.ts
/**
 * Generates call-site audit tests for modified functions
 * Usage: npm run generate-audit -- switchSession
 */
export async function generateAudit(functionName: string) {
  const callSites = await grepCallSites(functionName);
  const testCode = generateAuditTest(functionName, callSites);

  await writeFile(
    `__tests__/audits/${functionName}-call-sites.test.ts`,
    testCode
  );
}
```

### 3. Coverage Validator

```typescript
// scripts/verify-coverage.ts
/**
 * Validates coverage meets thresholds AND
 * verifies modified files have tests
 */
export function verifyCoverage(coverage: CoverageReport, changedFiles: string[]) {
  // Check global thresholds
  if (coverage.lines < 90) throw new Error('Line coverage below 90%');

  // Check that changed files have tests
  for (const file of changedFiles) {
    const fileCoverage = coverage.files[file];
    if (!fileCoverage) {
      throw new Error(`No tests found for modified file: ${file}`);
    }
  }
}
```

---

## Developer Experience

### Quick Start

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Generate test checklist
npm run generate-checklist

# 3. See what tests you need to write
cat .test-checklist.md

# 4. Write tests (TDD)
npm run test:watch

# 5. Before committing
npm run verify-tests

# 6. Create PR
gh pr create
```

### IDE Integration

**VS Code Extension** (future):
- Inline test checklist in editor
- Green checkmarks when test exists for function
- Red warnings for untested call sites
- Code actions: "Generate test for this function"

---

## Success Metrics

### Before (Workspace Session Bug)

- ✅ 45 tests passing
- ✅ >90% coverage
- ❌ Missing integration tests
- ❌ No call-site audits
- ❌ 5 broken call sites shipped

### After (With Zero-Gap Strategy)

- ✅ All 5 layers tested
- ✅ Integration tests verify API params
- ✅ Call-site audit catches missing projectId
- ✅ CI/CD enforces checklist completion
- ✅ Bug prevented before merge

---

## Next Steps

1. **Create skill file**: `.claude/skills/comprehensive-testing.md`
2. **Create templates**: `__tests__/templates/`
3. **Build tooling**: `scripts/test-automation/`
4. **Update CI/CD**: `.github/workflows/`
5. **Train team**: Run workshop on strategy

---

## Appendix: Real-World Example

### The Bug That Motivated This

**File**: `src/components/sidebar/SessionList.tsx`

**Bug**: Line 259 called `switchSession(session.id)` without `session.workspaceId`

**What tests existed:**
- ✅ Store test: `updateWorkspaceLastActiveSession` worked
- ✅ Integration test: Store-level `switchSession` worked
- ❌ Component test: SessionList event handler not tested
- ❌ Integration test: API call params not verified
- ❌ Call-site audit: No grep-based verification

**What would have caught it:**

```typescript
// Layer 3: Component Test
it('SessionList passes workspaceId to switchSession', () => {
  // Would catch missing second parameter
});

// Layer 4: Integration Test
it('API receives correct project query param', () => {
  // Would catch 404 error
});

// Layer 5: Call-Site Audit
it('All switchSession calls have 2 parameters', () => {
  // Would catch all 5 broken call sites
});
```

All three layers would have caught this. We had zero.

---

**End of Document**
