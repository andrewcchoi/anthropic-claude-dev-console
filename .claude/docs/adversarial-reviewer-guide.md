# Adversarial Reviewer Guide

## Why Adversarial Mode Exists

### The Problem: Same-Model Bias

When a reviewer uses the same underlying AI model as the implementer, they share the same blind spots. The reviewer tends to:

1. **Approve quickly** - The implementation "looks right" because it follows patterns the model prefers
2. **Miss type issues** - Both implementer and reviewer may confuse similar types (UUID vs path)
3. **Skip verification** - Trust the implementer's self-review instead of checking independently
4. **Find no issues** - "Looks good to me" without actually looking

### Evidence of the Problem

Real bug from this codebase:

```typescript
// BUG: Called switchSession with workspace UUID instead of encoded project path
// Workspace UUID: "ca31cb4c-..." (from workspace store)
// Project path: "-workspace-docs" (what CLI expects)
handleClick(() => {
  switchSession(session.id, workspaceId); // WRONG: workspaceId is UUID
});
```

This bug passed:
- 45 unit tests (all passing)
- 90%+ code coverage
- Standard code review (reviewer said "Issues: None. Approved.")

The bug caused 404 errors in production because the API expected an encoded project path, not a UUID.

### Why Standard Review Missed It

The reviewer:
1. Saw the function had two parameters (correct count)
2. Saw the second parameter was called `workspaceId` (reasonable name)
3. Didn't trace the parameter type through the call chain
4. Didn't check what the API actually expected
5. Approved without finding any issues

## When to Use Adversarial Mode

**Always.** Adversarial mode should be the default for all code reviews in subagent-driven development.

### Especially Critical For:

| Scenario | Why Adversarial Matters |
|----------|------------------------|
| Modified function signatures | Call sites may not be updated |
| Cross-layer changes | Integration bugs are hard to spot |
| Type changes | Similar-looking types can be confused |
| New integrations | API contract mismatches |
| Refactoring | Subtle behavior changes |

### Minimum Complexity Threshold

Even for "trivial" changes, adversarial mode catches:
- Typos in variable names
- Missing await keywords
- Incorrect import paths
- Off-by-one errors

## How to Invoke Adversarial Mode

### Option 1: Direct Skill Invocation

```
Use skill: adversarial-reviewer

Review the implementation of [feature] with adversarial mode.
Base SHA: abc123
Head SHA: def456
```

### Option 2: In Subagent-Driven Development

Replace the standard code-quality-reviewer step with adversarial-reviewer:

```
# Standard flow (DON'T USE):
[Dispatch spec reviewer] -> [Dispatch code quality reviewer]

# Adversarial flow (USE THIS):
[Dispatch spec reviewer] -> [Dispatch adversarial-reviewer]
```

### Option 3: Modified Code Review Prompt

Add this prefix to any code review prompt:

```
IMPORTANT: You are reviewing in ADVERSARIAL MODE.

You MUST find at least one issue (Critical, Important, or Minor).
There are no perfect implementations.

If you find no issues, you must provide:
1. Exact files and lines you reviewed
2. Why each common bug pattern doesn't apply
3. Justification why this code is exception-worthy
```

## The Mandatory Issue Rule

### Core Principle

Every code review MUST report at least one issue.

### Why This Works

1. **Forces active engagement** - Reviewer must actually analyze code to find something
2. **Prevents rubber-stamping** - "No issues" requires extraordinary justification
3. **Catches more bugs** - Looking for problems finds problems
4. **Creates paper trail** - Every review documents what was checked

### What Counts as an Issue

**Critical (must fix):**
- Type mismatches
- Missing error handling
- Security vulnerabilities
- Data loss risks
- Runtime errors

**Important (should fix):**
- Missing tests
- Unclear variable names
- Incomplete edge case handling
- Potential maintenance burden
- Performance concerns

**Minor (consider fixing):**
- Documentation gaps
- Code style improvements
- Defensive improvements
- Future-proofing suggestions

### Exception Process

If genuinely no issues exist, the reviewer must provide:

```
## Exception Justification

### Files Reviewed
- src/utils/helper.ts: Lines 1-50 (full file)
- __tests__/helper.test.ts: Lines 1-80 (full file)

### Bug Pattern Exclusions
- UUID/path confusion: N/A - no ID types in this change
- Call site updates: N/A - new function, no existing callers
- Silent errors: N/A - explicit try/catch at line 25
- Type mismatch: Verified - signature matches all callers

### Why Exception-Worthy
1. Pure function with no side effects
2. 100% branch coverage in tests
3. < 20 lines of logic
4. Copy of existing tested pattern

I certify I actively looked for problems and found none.
```

**Key:** The exception process is intentionally onerous. It should be easier to find an issue than to justify not finding one.

## Minimum Review Checklist

The adversarial reviewer MUST check each of these explicitly:

### Type Safety
- [ ] All parameters have explicit types
- [ ] No implicit `any` types
- [ ] UUIDs and paths are not confused
- [ ] Return types are declared
- [ ] Generics are constrained

### Call Site Integrity
- [ ] All callers of modified functions are updated
- [ ] Parameter order matches everywhere
- [ ] Optional parameters handled correctly
- [ ] Imports are correct

### Error Handling
- [ ] Every failure mode is handled
- [ ] No empty catch blocks
- [ ] Errors are logged with context
- [ ] Cleanup happens on error

### Test Coverage
- [ ] Tests test behavior, not mocks
- [ ] Edge cases are covered
- [ ] Error paths are tested
- [ ] Integration points are tested

### Logic Correctness
- [ ] All branches are reachable
- [ ] Comparisons use correct operators
- [ ] Loops terminate correctly
- [ ] Async patterns are correct

## Red Flags (Auto-Issue Triggers)

See the authoritative red flags table in the [Adversarial Reviewer Skill](./../skills/adversarial-reviewer.md#red-flags-auto-reject-triggers).

Key patterns that should ALWAYS generate an issue include:
- **Critical**: Empty catch blocks, missing `await`, parameter count changes without call site audit, UUID/path type confusion
- **Important**: `any` types, no tests for new functions
- **Minor**: `// TODO` comments, magic numbers, `console.log`, commented code

## Integration with Development Workflow

### With Subagent-Driven Development

```
Per Task:
1. Implementer subagent builds feature
2. Spec reviewer checks completeness
3. Adversarial reviewer finds issues  <-- USE THIS
4. Implementer fixes issues
5. Re-review until approved
6. Mark task complete
```

### With Manual Development

```
Before PR:
1. Self-review your changes
2. Run adversarial reviewer on your own code
3. Fix issues found
4. Submit PR with issues addressed
```

### With CI/CD

Consider adding adversarial review as a CI gate:
```yaml
- name: Adversarial Review
  run: |
    # Use AI-powered review with adversarial prompt
    claude-code review --adversarial --require-issues
```

## Measuring Success

### Metrics to Track

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Issue finding rate | 100% | Reviews with >= 1 issue / Total reviews |
| False positive rate | < 20% | Issues disputed as invalid / Total issues |
| Bug escape rate | < 5% | Production bugs / Total changes reviewed |
| Review thoroughness | > 80% | Checklist items verified / Total items |

### Signs It's Working

- Reviewers consistently find issues (even minor ones)
- Bug escape rate decreases over time
- Implementers start writing better code (anticipating review)
- Review discussions become more substantive

### Signs It's Not Working

- Reviewers report "no issues" frequently
- Same bug patterns keep escaping
- Reviews are rubber-stamp approvals
- Checklist items skipped

## Troubleshooting

### "I genuinely can't find any issues"

You haven't looked hard enough. Every change has something that could be improved.

Try these questions:
1. What's the most confusing line of code?
2. What would happen if this input were null?
3. What would break if requirements changed?
4. What assumption is not tested?
5. What would a new developer misunderstand?

### "All issues are Minor"

That's fine! Minor issues are still issues. The goal is active engagement, not severity.

Common minor issues:
- Variable could be named more clearly
- Comment would help explain why
- Test could cover this edge case
- Type could be more precise
- Error message could be more helpful

### "The implementer pushes back on issues"

Issues can be:
- **Accepted** - Implementer fixes
- **Deferred** - Tracked for later
- **Disputed** - Escalate for decision

Disputed issues count toward the false positive metric. High dispute rates indicate the reviewer is being too picky.

### "Reviews take too long"

Balance is key. Target:
- < 15 minutes for small changes (< 100 lines)
- < 30 minutes for medium changes (100-500 lines)
- < 60 minutes for large changes (> 500 lines)

If exceeding these, the change may be too large. Consider splitting.

## Appendix: Example Adversarial Review

### Input

```
Implementation: Added workspace auto-selection feature
Base: abc123, Head: def456
Files: SessionList.tsx, UISessionItem.tsx, store/index.ts
```

### Output

```
## Issues Found

### Critical (Must Fix)

1. **Type Mismatch: UUID vs Encoded Path**
   - File: SessionList.tsx:45
   - What: switchSession called with workspaceId (UUID) instead of projectId (encoded path)
   - Why: API returns 404 because it expects "-workspace-docs" format, not UUID
   - Fix: Use getProjectIdFromWorkspace(workspaceId) to convert

### Important (Should Fix)

2. **Missing Error Handling**
   - File: SessionList.tsx:48-52
   - What: No error handling if session load fails
   - Why: User sees infinite loading spinner on failure
   - Fix: Add try/catch with toast notification

3. **Untested Edge Case**
   - File: __tests__/SessionList.test.ts
   - What: No test for empty workspace scenario
   - Why: Could crash with "Cannot read property of undefined"
   - Fix: Add test case for workspace with zero sessions

### Minor (Consider Fixing)

4. **Magic String**
   - File: store/index.ts:125
   - What: Hardcoded "current-workspace" string
   - Why: Easy to typo, harder to refactor
   - Fix: Extract to CURRENT_WORKSPACE_KEY constant

## Strengths
- Clean separation of workspace selection from session loading
- Proper use of Zustand for state management
- TypeScript types are mostly correct

## Assessment
- Issues: 1 Critical, 2 Important, 1 Minor
- Ready to merge: No - fix Critical and Important issues first
```

## Related Documentation

- [Adversarial Reviewer Skill](./../skills/adversarial-reviewer.md)
- [Comprehensive Testing Strategy](./../skills/comprehensive-testing.md)
