---
name: comprehensive-testing
description: Use when implementing features to ensure comprehensive test coverage across all layers with call-site audits. Prevents integration bugs like the missing projectId parameter. Integrates with ultrathink-with-tests skill for planning.
ultrathink-integration: true
brainstorming-integration: true
ralph-loop-verification: true
---

# Comprehensive Testing Strategy

## When to Use This Skill

Use this skill when:
- Implementing any new feature (required for all features)
- Modifying function signatures
- Refactoring cross-layer code
- Adding new integration points
- Before creating a pull request

**Better yet**: Use `/ultrathink-with-tests` which integrates this strategy into planning from the start.

## Integration with Other Skills

- **With ultrathink**: Use `/ultrathink-with-tests` for integrated planning + test design
- **With brainstorming**: Brainstorming identifies testability considerations
- **With Ralph Loop**: Verify test completeness after implementation

## The Five Layers

You MUST test all five layers for every feature:

### Layer 1: Store Tests (Foundation)
- Test all store actions and selectors
- Test state transitions
- Test edge cases (empty, invalid input)
- Test cross-store coordination

### Layer 2: Hook Tests
- Test hook return values
- Test API calls (verify URL, params, body)
- Test cleanup functions
- Test error handling

### Layer 3: Component Tests
- Test user interactions
- Test event handlers pass correct arguments
- Test conditional rendering
- Test loading/error states

### Layer 4: Integration Tests
- Test full data flow: Component → Hook → Store → API
- Verify API calls with actual fetch/axios
- Test response handling
- Test error propagation

### Layer 5: Call-Site Audits (Critical)
- After modifying a function, audit all call sites
- Use grep to find all callers
- Verify each caller passes required parameters
- Generate automated test that fails if call sites are missed

## Workflow

### Step 1: Generate Test Checklist

```bash
npm run generate-checklist -- [files you're modifying]
```

This creates `.test-checklist.md` with specific tests you need to write.

### Step 2: Write Tests (TDD)

Follow this order:
1. Store tests (Layer 1)
2. Hook tests (Layer 2)
3. Component tests (Layer 3)
4. Integration tests (Layer 4)
5. Call-site audits (Layer 5)

### Step 3: Implement Code

Write the code to make tests pass.

### Step 4: Verify Completeness

```bash
npm run verify-tests
```

This checks that:
- All checklist items are complete
- Coverage thresholds are met (>90%)
- Call-site audits exist for modified functions
- Integration tests verify API calls

### Step 5: Before PR

```bash
npm test -- --coverage
npm run test:audits
npm run verify-tests
```

All three must pass before creating PR.

## Call-Site Audit Pattern

When you modify a function signature, you MUST create a call-site audit:

```typescript
// __tests__/audits/[functionName]-call-sites.test.ts
describe('[functionName] call-site audit', () => {
  it('should verify all call sites pass required parameters', async () => {
    const callSites = await grepCallSites('[functionName](');

    // List all expected call sites
    const expected = [
      'FileA.tsx:10',
      'FileB.tsx:25',
      // ... all callers
    ];

    expect(callSites).toHaveLength(expected.length);

    // Verify each has correct parameter count
    for (const callSite of callSites) {
      const code = await readCallSiteCode(callSite);
      expect(code).toMatch(/functionName\([^,]+,\s*[^)]+\)/);
      // Adjust regex for parameter count
    });
  });
});
```

## Example: The Bug That Motivated This

**Bug**: `switchSession(sessionId)` called without `projectId` parameter in 5 locations.

**What would have caught it:**

1. **Component Test** (Layer 3):
```typescript
it('should pass workspaceId when clicking session', () => {
  const mockSwitch = vi.fn();
  render(<SessionList />);
  userEvent.click(screen.getByText('Session'));
  expect(mockSwitch).toHaveBeenCalledWith('id', 'workspace-id');
  // ← Would fail without second parameter
});
```

2. **Integration Test** (Layer 4):
```typescript
it('should include project query param in API call', async () => {
  const spy = vi.spyOn(global, 'fetch');
  await switchSession('id', '-workspace-docs');
  expect(spy).toHaveBeenCalledWith(
    expect.stringContaining('?project=-workspace-docs')
  );
  // ← Would catch 404 error
});
```

3. **Call-Site Audit** (Layer 5):
```typescript
it('all switchSession calls have 2 parameters', async () => {
  const sites = await grepCallSites('switchSession(');
  for (const site of sites) {
    expect(site.code).toMatch(/switchSession\([^,]+,\s*[^)]+\)/);
  }
  // ← Would catch all 5 broken call sites
});
```

## Red Flags

These thoughts mean you're skipping layers:

| Thought | Reality |
|---------|---------|
| "It's a simple change" | Simple changes break in unexpected ways |
| "I'll skip integration tests" | Integration bugs are the most common |
| "Call-site audit is overkill" | This is what catches refactoring bugs |
| "Coverage is at 90%" | Coverage ≠ correctness |
| "Tests are passing" | Passing tests can still miss bugs |

## Success Criteria

Before marking feature complete:

- [ ] All 5 layers have tests
- [ ] Test checklist is 100% complete
- [ ] Coverage >90% (lines, branches)
- [ ] Call-site audits exist for modified functions
- [ ] Integration tests verify API calls
- [ ] CI/CD checks pass
- [ ] Manual code review confirms no missed call sites

## Tools

- `npm run generate-checklist` - Generate test checklist
- `npm run test:watch` - Run tests in watch mode
- `npm run test:audits` - Run call-site audits
- `npm run verify-tests` - Verify completeness
- `npm test -- --coverage` - Check coverage

## Related Documentation

- [Comprehensive Test Strategy](../../docs/testing/comprehensive-test-strategy.md)
- [Test Templates](../../__tests__/templates/)
- [Call-Site Audit Examples](../../__tests__/audits/)

---

**Remember**: The goal is not 100% coverage. The goal is zero integration bugs.
