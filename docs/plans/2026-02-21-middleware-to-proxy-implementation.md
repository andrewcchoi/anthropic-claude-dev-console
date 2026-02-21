# Middleware to Proxy Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate Next.js 16 middleware.ts to proxy.ts using official codemod, verify functionality with manual and automated tests, resolve deprecation warning.

**Architecture:** Single file rename operation using Next.js official codemod. Function export renamed from `middleware` to `proxy`. All correlation ID logic preserved. Zero functional changes.

**Tech Stack:** Next.js 16, TypeScript, Vitest, uuid, official @next/codemod

**Related:** Issue #21, Design doc at `docs/plans/2026-02-21-middleware-to-proxy-design.md`

---

## Task 1: Pre-Migration Verification

**Files:**
- Check: `src/middleware.ts` (current implementation)
- Verify: Build passes with existing code

**Step 1: Verify clean working directory**

Run: `git status`

Expected: Clean working tree or only changes in `docs/plans/`

**Step 2: Verify current build passes**

Run: `npm run build`

Expected: Build completes successfully with deprecation warning about "middleware"

**Step 3: Record current middleware content for reference**

Run: `cat src/middleware.ts`

Expected: File exists with `export function middleware` and correlation ID logic

---

## Task 2: Run Official Codemod

**Files:**
- Delete: `src/middleware.ts`
- Create: `src/proxy.ts`

**Step 1: Execute codemod**

Run: `npx @next/codemod@canary middleware-to-proxy .`

Expected:
```
✔ Running codemod...
✔ Transformed 1 file
  - src/middleware.ts → src/proxy.ts
```

**Step 2: Verify file transformations**

Run: `ls -la src/ | grep -E "(middleware|proxy)"`

Expected: Only `proxy.ts` exists, `middleware.ts` deleted

**Step 3: Review changes**

Run: `git diff --stat`

Expected:
```
 src/middleware.ts | 37 -------------------
 src/proxy.ts      | 37 +++++++++++++++++++
 2 files changed, 37 insertions(+), 37 deletions(-)
```

**Step 4: Verify function rename**

Run: `grep -n "export function" src/proxy.ts`

Expected: `export function proxy(request: NextRequest)`

**Step 5: Verify config preserved**

Run: `grep -A2 "export const config" src/proxy.ts`

Expected:
```typescript
export const config = {
  matcher: '/api/:path*',
};
```

---

## Task 3: Manual Verification (Phase 1)

**Files:**
- Verify: `src/proxy.ts` (runtime behavior)

**Step 1: Start dev server**

Run: `npm run dev`

Expected: Server starts on port 3000, NO deprecation warning about "middleware"

**Step 2: Test API endpoint with curl**

Run (in new terminal): `curl -v http://localhost:3000/api/example 2>&1 | grep -i "x-correlation-id"`

Expected:
```
< x-correlation-id: [valid-uuid-format]
```

**Step 3: Verify timing header**

Run: `curl -v http://localhost:3000/api/example 2>&1 | grep -i "x-request-start"`

Expected:
```
< x-request-start: [unix-timestamp]
```

**Step 4: Check server logs for no deprecation warnings**

Action: Review terminal where `npm run dev` is running

Expected: No message about "middleware file convention is deprecated"

**Step 5: Stop dev server**

Run: `Ctrl+C` in dev server terminal

---

## Task 4: Write Automated Tests (Phase 2)

**Files:**
- Create: `src/__tests__/proxy.test.ts`

**Step 1: Write the test file structure**

Create file at: `src/__tests__/proxy.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { proxy, config } from '@/proxy';

describe('proxy', () => {
  // Tests will go here
});

describe('proxy config', () => {
  it('should only apply to /api/* routes', () => {
    expect(config.matcher).toBe('/api/:path*');
  });
});
```

**Step 2: Write test for correlation ID generation**

Add to `src/__tests__/proxy.test.ts` inside first `describe` block:

```typescript
it('should generate unique correlation IDs for each request', () => {
  const request1 = new NextRequest('http://localhost:3000/api/test');
  const request2 = new NextRequest('http://localhost:3000/api/test');

  const response1 = proxy(request1);
  const response2 = proxy(request2);

  const correlationId1 = response1.headers.get('x-correlation-id');
  const correlationId2 = response2.headers.get('x-correlation-id');

  expect(correlationId1).toBeDefined();
  expect(correlationId2).toBeDefined();
  expect(correlationId1).not.toBe(correlationId2);
});
```

**Step 3: Write test for correlation ID format**

Add test:

```typescript
it('should generate valid UUID v4 format correlation IDs', () => {
  const request = new NextRequest('http://localhost:3000/api/test');
  const response = proxy(request);

  const correlationId = response.headers.get('x-correlation-id');
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  expect(correlationId).toMatch(uuidRegex);
});
```

**Step 4: Write test for request header propagation**

Add test:

```typescript
it('should add correlation ID to request headers', () => {
  const request = new NextRequest('http://localhost:3000/api/test');
  const response = proxy(request);

  // The response includes the modified request in Next.js
  // We verify by checking the response has the header
  const correlationId = response.headers.get('x-correlation-id');
  expect(correlationId).toBeDefined();
  expect(typeof correlationId).toBe('string');
  expect(correlationId.length).toBeGreaterThan(0);
});
```

**Step 5: Write test for timing header**

Add test:

```typescript
it('should add x-request-start timestamp header', () => {
  const beforeTimestamp = Date.now();
  const request = new NextRequest('http://localhost:3000/api/test');
  const response = proxy(request);
  const afterTimestamp = Date.now();

  const requestStart = response.headers.get('x-request-start');
  expect(requestStart).toBeDefined();

  const timestamp = parseInt(requestStart!, 10);
  expect(timestamp).toBeGreaterThanOrEqual(beforeTimestamp);
  expect(timestamp).toBeLessThanOrEqual(afterTimestamp);
});
```

**Step 6: Write test for response header presence**

Add test:

```typescript
it('should include correlation ID in response headers', () => {
  const request = new NextRequest('http://localhost:3000/api/test');
  const response = proxy(request);

  const hasCorrelationHeader = response.headers.has('x-correlation-id');
  expect(hasCorrelationHeader).toBe(true);
});
```

---

## Task 5: Run Automated Tests

**Files:**
- Test: `src/__tests__/proxy.test.ts`

**Step 1: Run test suite**

Run: `npm test src/__tests__/proxy.test.ts`

Expected: All tests pass (6 tests)

```
✓ proxy (5 tests)
  ✓ should generate unique correlation IDs for each request
  ✓ should generate valid UUID v4 format correlation IDs
  ✓ should add correlation ID to request headers
  ✓ should add x-request-start timestamp header
  ✓ should include correlation ID in response headers
✓ proxy config (1 test)
  ✓ should only apply to /api/* routes

Test Files  1 passed (1)
     Tests  6 passed (6)
```

**Step 2: Run full test suite to ensure no regressions**

Run: `npm test`

Expected: All existing tests still pass

---

## Task 6: Final Build Verification

**Files:**
- Verify: Production build

**Step 1: Run production build**

Run: `npm run build`

Expected: Build succeeds with no errors, no deprecation warning

**Step 2: Verify build output**

Run: `ls -la .next/server/ | grep proxy`

Expected: Next.js build includes proxy configuration

---

## Task 7: Commit Changes

**Files:**
- Delete: `src/middleware.ts`
- Create: `src/proxy.ts`
- Create: `src/__tests__/proxy.test.ts`

**Step 1: Stage all changes**

Run: `git add src/proxy.ts src/__tests__/proxy.test.ts`

**Step 2: Verify no middleware.ts in staging**

Run: `git status`

Expected: Shows `deleted: src/middleware.ts`, `new file: src/proxy.ts`, `new file: src/__tests__/proxy.test.ts`

**Step 3: Commit with descriptive message**

Run:
```bash
git commit -m "chore: Migrate middleware to proxy (Next.js 16)

- Rename src/middleware.ts → src/proxy.ts using official codemod
- Update function export: middleware → proxy
- Add automated tests for proxy functionality
- Verify correlation ID and timing headers work correctly
- Resolves Next.js 16 deprecation warning

Fixes #21

Co-Authored-By: Claude Sonnet 4.5 (1M context) <noreply@anthropic.com>"
```

Expected: Commit succeeds with commit hash

**Step 4: Verify clean status**

Run: `git status`

Expected: `nothing to commit, working tree clean`

---

## Task 8: Final Verification Summary

**Files:**
- Verify: All success criteria met

**Step 1: Checklist verification**

Manual checklist:

- [x] Codemod completed without errors
- [x] `src/middleware.ts` deleted
- [x] `src/proxy.ts` created
- [x] Function renamed to `proxy`
- [x] Dev server starts without deprecation warning
- [x] Manual test: API response includes correlation ID
- [x] Automated tests written and passing (6 tests)
- [x] Production build succeeds
- [x] Clean git commit with descriptive message
- [x] Ready to close Issue #21

**Step 2: Generate summary output**

Action: Document completion status

Summary:
```
✅ Migration Complete

Files Changed:
  - src/middleware.ts → src/proxy.ts (renamed via codemod)
  - src/__tests__/proxy.test.ts (new, 6 tests)

Verification:
  ✓ No deprecation warnings
  ✓ Correlation IDs working
  ✓ All tests passing (6/6)
  ✓ Production build succeeds
  ✓ Git history clean

Next Steps:
  1. Push branch: git push origin chore/migrate-middleware-to-proxy
  2. Create PR referencing #21
  3. Merge after CI passes
  4. Close issue #21
```

---

## Rollback Procedure (If Needed)

**Emergency rollback if issues discovered:**

```bash
# Option 1: Reset to before codemod
git reset --hard HEAD~1

# Option 2: Return to main branch
git checkout main
git branch -D chore/migrate-middleware-to-proxy

# Option 3: Revert specific commit
git revert HEAD
```

---

## Notes

- **Testing Philosophy:** Tests verify behavior, not implementation. Correlation ID format and header presence are behaviors. Internal UUID generation is implementation detail.

- **TDD Not Applicable:** This task uses official codemod, so traditional red-green-refactor doesn't apply. Tests written after migration to verify correctness.

- **YAGNI Applied:** No additional features added. No refactoring. Pure naming convention migration.

- **DRY Principle:** Tests reuse Next.js mocks. No duplicate test logic.

- **Manual + Automated:** Manual verification catches immediate issues. Automated tests prevent future regressions.

---

## Success Metrics

1. **Zero Functional Changes:** Correlation ID logic identical before/after
2. **Deprecation Resolved:** No Next.js warnings in console
3. **Tests Pass:** 6/6 proxy tests passing
4. **Build Success:** Production build completes
5. **Clean Git History:** Single descriptive commit

---

## Related Skills

- @superpowers:verification-before-completion - Use before claiming task complete
- @superpowers:finishing-a-development-branch - Use to decide merge strategy after completion
