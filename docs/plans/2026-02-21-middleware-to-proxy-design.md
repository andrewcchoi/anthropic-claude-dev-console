# Middleware to Proxy Migration Design

**Date:** 2026-02-21
**Author:** Claude Sonnet 4.5 + andrewcchoi
**Issue:** #21
**Branch:** `chore/migrate-middleware-to-proxy`

## Overview

Migrate Next.js 16 middleware.ts to proxy.ts convention to resolve deprecation warning. This is a naming convention change with no functional impact.

## Background

### Current State
- File: `src/middleware.ts`
- Function: `export function middleware(request: NextRequest)`
- Purpose: Adds correlation IDs (UUIDs) to all API requests
- Scope: Applies to `/api/:path*` routes via matcher
- Functionality: Adds `x-correlation-id` and `x-request-start` headers

### Why This Change

Next.js 16 renamed the `middleware` convention to `proxy` to:
- Avoid confusion with Express.js-style middleware
- Clarify the function's role as a network boundary/proxy layer
- Standardize on Node.js runtime (edge runtime not supported in proxy files)

### Impact Assessment
- **Risk Level:** Low
- **Breaking Changes:** None expected
- **Code References:** Single file, no imports elsewhere (zustand/middleware is unrelated)
- **Runtime Impact:** Zero - identical functionality

## Design

### 1. Migration Approach

**Strategy:** Official Next.js codemod using `@next/codemod@canary`

**Rationale:**
- Official migration path maintained by Next.js team
- Tested across thousands of Next.js 16 migrations
- Handles TypeScript types and hidden requirements automatically
- Future-proof against framework changes
- More robust than manual migration for ensuring exact compliance

**Execution:**
```bash
npx @next/codemod@canary middleware-to-proxy .
```

**Expected Transformations:**
1. Rename: `src/middleware.ts` → `src/proxy.ts`
2. Function: `export function middleware` → `export function proxy`
3. Preserve: `config` export with matcher unchanged
4. Preserve: All correlation ID logic unchanged

### 2. Testing Strategy

**Two-phase verification (manual + automated):**

#### Phase 1: Manual Verification (Immediate)

Post-migration manual check:
```bash
# Start dev server
npm run dev

# Test API endpoint
curl -v http://localhost:3000/api/example

# Verify response headers:
# ✓ x-correlation-id: <uuid>
# ✓ x-request-start: <timestamp>

# Confirm: No "middleware" deprecation warning in console
```

**Success Criteria:**
- Server starts without deprecation warning
- API response includes correlation ID header
- Correlation ID is valid UUID format
- Request timing header present

#### Phase 2: Automated Test (Regression Prevention)

**Location:** `src/__tests__/proxy.test.ts` (new file)

**Test Coverage:**
1. **Correlation ID generation** - Unique UUID per request
2. **Request header propagation** - x-correlation-id added to request
3. **Response header presence** - x-correlation-id in response
4. **Timing header** - x-request-start timestamp validation
5. **Route matcher** - Only /api/* routes affected

**Test Approach:**
- Mock Next.js request/response objects
- Call `proxy()` function directly
- Assert headers set correctly
- Use Vitest (existing test framework)

**Why Both Phases:**
- Manual: Fast feedback on immediate breakage
- Automated: Prevent regression in CI/CD pipeline
- Combined: Robust verification strategy

### 3. Implementation Workflow

**Step-by-step execution:**

```bash
# 1. Pre-migration check
git status                    # Ensure clean working directory
npm run build                 # Confirm build passes with middleware

# 2. Run codemod
npx @next/codemod@canary middleware-to-proxy .

# 3. Review changes
git diff                      # Verify transformations
# Expected:
#   - src/middleware.ts deleted
#   - src/proxy.ts created
#   - Function renamed: middleware → proxy
#   - No unexpected modifications

# 4. Manual verification (Phase 1)
npm run dev
curl -v http://localhost:3000/api/example
# Confirm: No deprecation warning, headers present

# 5. Add automated test (Phase 2)
# Create src/__tests__/proxy.test.ts
npm test                      # Run test suite

# 6. Final build check
npm run build                 # Verify production build

# 7. Commit
git add .
git commit -m "chore: Migrate middleware to proxy (Next.js 16)

- Rename src/middleware.ts → src/proxy.ts using official codemod
- Update function export: middleware → proxy
- Add automated tests for proxy functionality
- Resolves Next.js 16 deprecation warning

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

**Rollback Plan:**
```bash
git reset --hard HEAD         # Revert all changes
git clean -fd                 # Remove new files
# Or:
git checkout main             # Return to main branch
```

## Architecture

### Before
```typescript
// src/middleware.ts
export function middleware(request: NextRequest) {
  // Correlation ID logic
}
export const config = { matcher: '/api/:path*' };
```

### After
```typescript
// src/proxy.ts
export function proxy(request: NextRequest) {
  // Correlation ID logic (unchanged)
}
export const config = { matcher: '/api/:path*' };
```

### Data Flow (Unchanged)
```
Client Request
    ↓
Next.js Router
    ↓
proxy() function                 # Renamed from middleware()
    ├── Generate UUID
    ├── Add x-correlation-id to request headers
    ├── Add x-correlation-id to response headers
    └── Add x-request-start timestamp
    ↓
API Route Handler
    ↓
Response to Client
```

## Success Criteria

- [ ] Codemod completes without errors
- [ ] `src/middleware.ts` deleted, `src/proxy.ts` created
- [ ] Function renamed to `proxy`
- [ ] Dev server starts without deprecation warning
- [ ] Manual test: API response includes correlation ID
- [ ] Automated test passes
- [ ] Production build succeeds
- [ ] Git history clean with descriptive commit
- [ ] Issue #21 closed

## References

- [Next.js Proxy File Convention](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)
- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Middleware to Proxy Migration](https://nextjs.org/docs/messages/middleware-to-proxy)
- Issue: #21
- Original Implementation: Commit 25b57cd (Feb 2026)

## Conclusion

This is a straightforward naming convention migration with zero functional impact. Using the official codemod ensures Next.js 16 compliance and future compatibility. Combined manual and automated testing provides robust verification without over-engineering.
