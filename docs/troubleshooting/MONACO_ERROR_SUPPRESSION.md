# Monaco Editor Error Suppression Troubleshooting

**Feature:** Inline script error suppression for Monaco Editor
**Location:** `src/app/layout.tsx`
**Last Updated:** 2026-02-02

## Overview

The Monaco Editor error suppression prevents spurious "[object Object]" errors from appearing in the Next.js dev overlay during development. This document covers how the feature works, how to verify it's functioning, and how to troubleshoot issues.

---

## How It Works

### The Problem
1. Monaco Editor throws error objects (not Error instances) during initialization: `{type: 'cancelation', msg: '...'}`
2. These propagate as unhandled promise rejections
3. Next.js devtools registers its error handler **before React hydration**
4. React components register handlers via `useEffect`, which runs **after hydration** (too late)
5. Next.js `coerceError` calls `.toString()` on the object → "[object Object]"

### The Solution
An **inline script** in `<head>` runs **before any JavaScript**, including Next.js devtools:

```tsx
<head>
  <script dangerouslySetInnerHTML={{ __html: monacoErrorSuppressorScript }} />
</head>
```

**Key mechanisms:**
- **Capture phase** (`true` as 3rd argument) - Runs before other handlers
- **`stopImmediatePropagation()`** - Prevents other handlers from seeing the event
- **No React dependency** - Works regardless of when React hydrates

---

## Verification Steps

### 1. Basic Verification
```bash
# Start dev server
npm run dev

# Open browser to http://localhost:3000
# Open DevTools console
```

**Expected:** No "[object Object]" errors in Next.js dev overlay

### 2. Trigger Monaco Loading
1. Send a chat message that returns code in a tool execution
2. Click to expand a Bash tool execution with output
3. View any page that loads the Monaco editor

**Expected:** Monaco loads without errors in the overlay

### 3. Check Script Injection
View page source (Ctrl+U or Cmd+U):
```html
<html lang="en">
  <head>
    <script>
(function() {
  window.addEventListener('unhandledrejection', function(event) {
    // ... suppression logic ...
  }, true);
})();
    </script>
```

**Expected:** Script appears in `<head>` before other scripts

### 4. Verify Handler Registration
In browser console:
```javascript
// Check if our handler is registered (will show multiple handlers)
getEventListeners(window).unhandledrejection
```

**Expected:** Should see multiple handlers, with our inline script handler first

---

## Troubleshooting

### Issue: "[object Object]" Still Appears

#### Diagnosis Steps
1. **Verify script is injected:**
   ```bash
   # View page source
   curl http://localhost:3000 | grep -A 10 "unhandledrejection"
   ```

   **Expected:** Script should be present in `<head>`

2. **Check error details in console:**
   - Open DevTools
   - Click the error in the overlay
   - Check if it's actually from Monaco or something else

3. **Test error pattern matching:**
   ```javascript
   // In browser console, simulate Monaco error
   Promise.reject({type: 'cancelation', msg: 'test'})
   ```

   **Expected:** Should be suppressed (no overlay)

#### Common Causes

**Cause 1: Error is not from Monaco**
- The suppressor only catches Monaco-related errors
- Check the error message/object structure
- If it's a different error, don't suppress it

**Solution:** Investigate the actual error source

**Cause 2: Script not running in capture phase**
```tsx
// WRONG - missing capture phase
window.addEventListener('unhandledrejection', handler);

// RIGHT - uses capture phase
window.addEventListener('unhandledrejection', handler, true);
```

**Solution:** Verify third parameter is `true` in `src/app/layout.tsx`

**Cause 3: React cleared `<head>` contents**
- Rare, but possible if using custom Document component

**Solution:** Verify script remains in DOM after React hydration:
```javascript
// In browser console
document.head.innerHTML.includes('unhandledrejection')
```

---

### Issue: Monaco Errors No Longer Visible for Debugging

#### Diagnosis
The suppressor is working *too well* - hiding errors you want to see.

#### Solution: Temporary Disable

**Option 1: Comment out script in layout**
```tsx
// src/app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Temporarily disabled for debugging */}
        {/* <script dangerouslySetInnerHTML={{ __html: monacoErrorSuppressorScript }} /> */}
      </head>
      <body className={inter.className}>
```

**Option 2: Add console logging**
```tsx
const monacoErrorSuppressorScript = `
(function() {
  window.addEventListener('unhandledrejection', function(event) {
    var reason = event.reason;
    console.log('Suppressor caught:', reason); // ADD THIS
    if (reason && typeof reason === 'object') {
      // ... rest of logic
    }
  }, true);
})();
`;
```

**Option 3: Selective suppression**
```tsx
const monacoErrorSuppressorScript = `
(function() {
  window.addEventListener('unhandledrejection', function(event) {
    var reason = event.reason;

    // Only suppress cancelation errors, let others through
    if (reason && typeof reason === 'object' && reason.type === 'cancelation') {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    // Let all other errors display normally
  }, true);
})();
`;
```

---

### Issue: Performance Concerns

#### Diagnosis
Handler runs on every unhandled rejection across the entire app.

#### Analysis
**Overhead:** Minimal
- Simple object property checks
- No async operations
- Runs in capture phase (early, but fast)
- Only affects unhandled rejections (rare in normal operation)

**Measurement:**
```javascript
// In browser console
let count = 0;
let start = performance.now();
window.addEventListener('unhandledrejection', () => {
  count++;
  console.log(`Handler called ${count} times in ${performance.now() - start}ms`);
}, true);
```

**Expected:** < 5 calls during normal page load, < 1ms total overhead

#### Solution
No action needed unless measurements show actual performance impact.

---

### Issue: Suppressor Blocks Legitimate Errors

#### Diagnosis Steps
1. Check what's being suppressed:
   ```tsx
   // Add logging to see what's caught
   if (reason.type === 'cancelation') {
     console.debug('Suppressed Monaco cancelation:', reason);
     event.preventDefault();
     event.stopImmediatePropagation();
     return;
   }
   ```

2. Review suppression conditions in `src/app/layout.tsx`:
   ```javascript
   // Current conditions
   reason.type === 'cancelation'  // Monaco-specific
   message.indexOf('monaco') !== -1
   message.indexOf('Monaco') !== -1
   message.indexOf('editor') !== -1
   message.indexOf('Loading chunk') !== -1
   ```

#### Solutions

**Solution 1: Narrow the pattern matching**
```javascript
// More specific pattern
if (reason.type === 'cancelation' &&
    reason.msg &&
    reason.msg.indexOf('monaco') !== -1) {
  // Only suppress Monaco-specific cancelations
}
```

**Solution 2: Whitelist specific error messages**
```javascript
const SUPPRESSED_MONACO_MESSAGES = [
  'CancellationToken',
  'Monaco Editor disposed',
  'Loading chunk for monaco failed'
];

const message = reason.message || reason.msg || '';
if (SUPPRESSED_MONACO_MESSAGES.some(msg => message.includes(msg))) {
  event.preventDefault();
  event.stopImmediatePropagation();
  return;
}
```

---

## Testing

### Manual Test Suite

**Test 1: Basic Suppression**
```bash
# 1. Start dev server
npm run dev

# 2. Open http://localhost:3000
# 3. Open DevTools console
# 4. Trigger Monaco load (send chat message with code)
# 5. Check: No "[object Object]" in overlay
```

**Test 2: Error Object Format**
```javascript
// In browser console
// Should be suppressed
Promise.reject({type: 'cancelation', msg: 'Monaco disposed'})

// Should NOT be suppressed
Promise.reject({type: 'other', msg: 'Some other error'})
Promise.reject(new Error('Regular error'))
```

**Test 3: Monaco Functionality**
```bash
# 1. Send message: "write a hello world function in python"
# 2. Verify Monaco editor loads in tool execution
# 3. Check syntax highlighting works
# 4. Check: No errors in overlay
```

**Test 4: Production Build**
```bash
# Suppressor should not interfere with production
npm run build
npm start

# Test Monaco loading in production
# Should work identically to dev
```

---

## Known Limitations

### 1. Development Only
The suppressor targets Next.js **dev overlay** errors. In production:
- No dev overlay exists
- Monaco errors still occur but don't surface to users
- Consider proper error boundaries for production

### 2. Pattern Matching Limitations
Current patterns may be too broad or too narrow:
- **Too broad:** May catch non-Monaco errors mentioning "editor"
- **Too narrow:** May miss Monaco errors with unexpected formats

**Mitigation:** Monitor console and adjust patterns as needed

### 3. No Error Recovery
Suppressing errors doesn't fix the underlying issue:
- Monaco still encounters initialization problems
- Errors are hidden, not resolved
- Monitor if suppressed errors correlate with Monaco failures

### 4. Turbopack-Specific
The "[object Object]" issue is specific to:
- Next.js 15+ with Turbopack
- Development mode
- Monaco's self-hosted setup

**In Webpack:** May not occur or may present differently

---

## Integration with Error Boundaries

### Current Architecture
```
Inline Script (layout.tsx)
    ↓ [catches unhandled rejections]
ErrorBoundary (React)
    ↓ [catches render errors]
Application Components
    ↓
Monaco Editor
```

### Recommended Error Handling Strategy

**For Monaco-Specific Errors:**
```tsx
// src/components/editor/EditorErrorBoundary.tsx
class EditorErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    // Only log Monaco errors, don't display to user
    if (error.message?.includes('monaco')) {
      console.debug('Monaco error caught:', error);
      return;
    }

    // Display other errors
    this.setState({ hasError: true, error });
  }
}
```

**For Application Errors:**
```tsx
// src/components/error/ErrorBoundary.tsx
// Let all non-Monaco errors through for proper handling
```

---

## File Reference

| File | Purpose |
|------|---------|
| `src/app/layout.tsx` | Contains inline suppression script |
| `docs/troubleshooting/MONACO_ERROR_SUPPRESSION.md` | This document |

**Related Components (removed):**
- ~~`src/components/editor/MonacoErrorSuppressor.tsx`~~ - Deleted (React-based approach didn't work)

---

## Change Log

| Date | Change | Reason |
|------|--------|--------|
| 2026-02-02 | Created inline script approach | React useEffect too late to catch errors |
| 2026-02-02 | Deleted MonacoErrorSuppressor.tsx | Replaced by inline script |
| 2026-02-02 | Added troubleshooting documentation | Document the feature for future debugging |

---

## References

- [Next.js Dev Overlay](https://nextjs.org/docs/app/building-your-application/configuring/error-handling#development-overlay)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [React Strict Mode](https://react.dev/reference/react/StrictMode)
- [MDN: PromiseRejectionEvent](https://developer.mozilla.org/en-US/docs/Web/API/PromiseRejectionEvent)

---

## Questions & Answers

**Q: Why inline script instead of external file?**
**A:** Must run before Next.js devtools initializes, which happens before any external scripts load.

**Q: Why not just fix Monaco errors?**
**A:** Monaco errors are from initialization timing/cancelation, not bugs. Suppression is appropriate for dev experience.

**Q: Will this hide real Monaco bugs?**
**A:** Only hides specific error patterns. Monaco will still log errors to console, and functionality failures will be visible.

**Q: Does this affect production?**
**A:** No. The dev overlay doesn't exist in production, so the suppressor has no effect.

**Q: Can I add my own error patterns?**
**A:** Yes, edit `monacoErrorSuppressorScript` in `src/app/layout.tsx` to add patterns to suppress.

---

## Support

If issues persist after following this guide:
1. Check browser console for errors
2. Review Next.js version (Turbopack behavior may change)
3. Test with Monaco errors disabled to isolate the issue
4. Check if error is actually from Monaco or another source
