---
name: fast-path-development
description: Skip full review process for trivial changes (typos, single-line fixes, comment updates). Use when ALL criteria are met - 1-2 files, <20 lines, no risky patterns.
fast-path: true
---

# Fast Path Development

## When to Use This Skill

Use fast path for trivial changes that don't need full subagent review cycles.

**ALL criteria must be true:**
- 1-2 files modified
- < 20 lines changed total
- One of these change types:
  - Typo fix
  - Comment update
  - Single variable/function rename (within same file)
  - Test-only changes (no production code)
  - Logging addition (console.log, logger.*)
- **NO** function signature changes
- **NO** API changes (routes, endpoints, request/response shapes)
- **NO** cross-file refactors
- **NO** type definition changes (interfaces, types)
- **NO** export statement changes

## How to Check Eligibility

Before using fast path, run:

```bash
./scripts/check-fast-path-eligible.sh
```

This will check your staged changes and tell you if they qualify.

**Output:**
- `Eligible for fast path` - Proceed with fast path
- `Not eligible: [reason]` - Use full review process

## Fast Path Workflow

If eligible, follow this streamlined process:

### 1. Stage Changes
```bash
git add [files]
```

### 2. Verify Eligibility
```bash
./scripts/check-fast-path-eligible.sh
```

### 3. Self-Review (30 seconds)
Quick mental checklist:
- [ ] Change does what I intended
- [ ] No accidental modifications
- [ ] Build passes: `npm run build`

### 4. Commit
```bash
git commit -m "fix: [brief description]"
```

No subagent review needed.

## What This Skips

Fast path skips:
- Multi-subagent review (Stage A-E from ultrathink)
- 5-layer test strategy
- Call-site audits
- Devil's advocate evaluation
- Ralph Loop critical review

## What This Keeps

Even on fast path:
- Build verification (`npm run build`)
- Pre-commit hooks (linting, type-check)
- Self-review (you still look at the diff)

## Red Flags (Do NOT Use Fast Path)

If you see any of these, use full process:

| Pattern | Why It's Risky |
|---------|----------------|
| `function ` or `const x = (` | Function signature change |
| `interface ` or `type ` | Type definition change |
| `export ` | Export surface change |
| `API`, `route`, `endpoint` | API surface change |
| Multiple file imports | Cross-file refactor |
| Test + production files | Not test-only |

## Examples

### Eligible (Use Fast Path)

**Typo fix:**
```diff
- // This functin handles user input
+ // This function handles user input
```

**Comment update:**
```diff
+ // TODO: Add error handling for edge case
```

**Single rename (same file):**
```diff
- const oldName = 'value';
- console.log(oldName);
+ const newName = 'value';
+ console.log(newName);
```

**Test-only:**
```diff
// __tests__/example.test.ts
- expect(result).toBe(5);
+ expect(result).toBe(6);
```

**Logging addition:**
```diff
+ log.debug('Processing user request', { userId });
```

### NOT Eligible (Use Full Process)

**Function signature change:**
```diff
- function process(data) {
+ function process(data, options = {}) {
```

**API change:**
```diff
- return { success: true };
+ return { success: true, data: result };
```

**Cross-file refactor:**
```diff
// File A
- import { helper } from './utils';
+ import { helper } from './helpers';
// File B (also modified)
```

## Metrics

**Success metric:** 30% of changes use fast path with 0% post-merge bugs

Track by tagging commits:
```bash
git commit -m "fix: typo in readme [fast-path]"
```

Query later:
```bash
git log --oneline --grep="fast-path" | wc -l
```

## Integration with Other Skills

- **ultrathink**: Fast path is the "skip" path - if not eligible, use ultrathink
- **comprehensive-testing**: Fast path skips 5-layer testing (only trivial changes)
- **brainstorming**: No brainstorming needed for fast path

## Troubleshooting

### "Not eligible" but change seems trivial?

Check what the script detected:
```bash
./scripts/check-fast-path-eligible.sh --verbose
```

Common false positives:
- String containing "function" in comment → add to allowlist
- Variable named "interface" → rename or use full process

### Build fails on "trivial" change

The change wasn't trivial. Use full process.

---

**Remember**: When in doubt, use the full process. Fast path saves 10 minutes; catching a bug saves hours.
