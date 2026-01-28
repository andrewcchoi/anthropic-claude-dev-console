# Quick Start Guide - Troubleshoot Recorder v2.0

Get started with automatic development troubleshooting in 2 minutes.

## Installation

1. **Enable the plugin** in `.claude/settings.local.json`:

```json
{
  "plugins": {
    "enabled": ["troubleshoot-recorder"]
  }
}
```

2. **Restart Claude Code** (if already running)

That's it! The plugin will auto-initialize storage on first use.

## How to Use

### The Automatic Way (Recommended)

Just develop normally - the plugin works in the background:

```bash
# 1. Run your test
npm test
# ❌ Test fails → Problem automatically captured

# 2. Fix the issue
# ... edit your code ...

# 3. Verify the fix
npm test
# ✅ Test passes → Problem automatically marked as solved

# 4. End your session
# Documentation automatically generated
```

### Check What's Tracked

```
/troubleshoot status
```

Shows active and solved problems.

```
/troubleshoot list
```

Displays all tracked problems.

### Manual Reporting (Optional)

For issues without test failures:

```
/troubleshoot report "Login button doesn't render on mobile"
```

## What Gets Auto-Detected

| Command Pattern | Category |
|----------------|----------|
| `npm test`, `pytest`, `jest`, `vitest` | test |
| `npm run build`, `tsc`, `cargo build` | build |
| `eslint`, `prettier --check`, `ruff` | lint |

## Solution Detection

The plugin detects when issues are resolved:

**Method 1: Context phrases**
Say any of these after fixing:
- "fixed it"
- "working now"
- "tests pass"
- "solved"

**Method 2: Test success**
Run the same test command that previously failed:
```bash
npm test  # Failed before → succeeds now → marked as solved
```

## Output

Documentation is auto-generated at session end:
```
docs/troubleshooting/TROUBLESHOOTING_GUIDE.md
```

## Example Output

```markdown
## Problem: Test failure in authentication

**Category**: test
**Date Solved**: 2026-01-27

### Error
Expected 2 to equal 3

**File**: `src/utils/helpers.ts:45`
**Command**: `npm test`

### Solution
The validateToken helper function was returning a string but was typed as number.

**Changed Files**: src/utils/helpers.ts

### Prevention Tips
- Add test for this specific case
- Review test assertions
```

## Tips

1. **No manual tracking needed** - Just develop normally
2. **Use solution phrases** - Say "fixed it" after resolving issues
3. **Check status anytime** - Run `/troubleshoot status`
4. **Cross-session support** - Problems persist across sessions

## Troubleshooting

**No problems detected?**
- Ensure test/build commands fail with exit code ≠ 0
- Check if command matches patterns (npm test, etc.)

**Solution not detected?**
- Use phrases: "fixed it", "working now", "tests pass"
- Or rerun the same test command that succeeded

## Next Steps

- Read the full [README.md](README.md) for advanced features
- Check [references/schema.md](references/schema.md) for data structure
- Explore the agent implementations in `agents/`
