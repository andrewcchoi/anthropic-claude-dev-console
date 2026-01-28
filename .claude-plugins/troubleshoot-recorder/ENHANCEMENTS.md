# Troubleshoot Recorder Enhancements

## Version 2.1 - Environment Metadata & Scalable Output

### Overview

Two major enhancements to the troubleshoot recorder plugin:

1. **Environment Metadata Capture** - Automatically captures system, runtime, and project context when sessions start
2. **Scalable Output Architecture** - Generates multiple documentation views optimized for different use cases

---

## Enhancement 1: Environment Metadata Capture

### What It Does

Captures comprehensive environment information at the start of each Claude session, providing crucial context for troubleshooting.

### Captured Information

```json
{
  "platform": {
    "os": "linux",
    "osVersion": "Debian GNU/Linux 12",
    "kernel": "6.6.87.2-microsoft-standard-WSL2",
    "arch": "x86_64"
  },
  "runtimes": {
    "node": "v20.19.6",
    "python": "3.12.0",
    "claudeCli": "1.2.3"
  },
  "git": {
    "branch": "feature/auth",
    "commit": "a1b2c3d",
    "dirty": false
  },
  "packages": {
    "dependencies": { "next": "16.1.6", "react": "19.2.4" },
    "devDependencies": { "typescript": "5.9.3" }
  },
  "workingDirectory": "/workspace"
}
```

### Storage

Environment data is stored in `.claude/troubleshoot/sessions.jsonl`, one record per session.

### Implementation

- **Agent**: `environment-collector`
- **Hook**: SessionStart
- **Execution**: Synchronous (runs immediately on session start)

---

## Enhancement 2: Scalable Output Architecture

### What It Does

Generates multiple documentation views from problem data, optimized for different audiences and use cases.

### Output Structure

```
docs/troubleshooting/
├── README.md                    # Navigation hub with stats
├── TROUBLESHOOTING_GUIDE.md     # Full guide (backward compatible)
├── recent.md                    # Last 20 solved problems
├── by-category/
│   ├── test.md                  # Test failures only
│   ├── build.md                 # Build errors only
│   ├── runtime.md               # Runtime errors only
│   └── lint.md                  # Lint issues only
└── _data/
    ├── problems.json            # All problems as JSON array
    └── index.json               # Searchable index with stats
```

### Benefits

| View | Audience | Benefit |
|------|----------|---------|
| README.md | All users | Quick navigation and statistics |
| by-category/*.md | Developers | Focused problem browsing |
| recent.md | Active developers | Latest solutions at a glance |
| TROUBLESHOOTING_GUIDE.md | Legacy users | Backward compatibility |
| _data/*.json | Tools/Scripts | Programmatic access to problem data |

### Git-Friendly

Category files only change when relevant problems are added, reducing merge conflicts and improving git diffs.

---

## Updated Problem Documentation Template

Problems now include environment context:

```markdown
## Problem: Test failure in authentication

**Category**: test
**Date Solved**: 2026-01-27

### Error

```
Expected 2 to equal 3
```

**File**: `src/utils/helpers.ts:45`
**Command**: `npm test`

### Context

- **Feature**: Adding user authentication to API routes
- **Files Modified**: src/utils/helpers.ts, src/api/auth.ts
- **What Was Tried**: Implementing JWT token validation

### Environment

- **OS**: linux Debian GNU/Linux 12
- **Node.js**: v20.19.6
- **Python**: 3.12.0
- **Git Branch**: feature/auth (a1b2c3d)

### Solution

The validateToken helper function was returning a string but was typed as returning a number, causing type mismatch in tests.

**Changed Files**: src/utils/helpers.ts

### Prevention Tips

- Add test for this specific case
- Review test assertions
- Check mock data matches expectations
```

---

## Migration Notes

### Backward Compatibility

- **Existing sessions**: Will have `environment: null` in problems
- **New sessions**: Automatically capture environment data
- **Documentation**: Full guide (TROUBLESHOOTING_GUIDE.md) still generated
- **No action required**: Plugin works with existing data

### Gradual Enrichment

As new sessions occur, environment data accumulates. Older problems without environment data continue to work normally.

---

## Verification

Run the test suite to verify enhancements:

```bash
/workspace/.claude-plugins/troubleshoot-recorder/test-enhancements.sh
```

Expected output: All tests pass with green checkmarks.

---

## Technical Details

### Modified Files

| File | Change |
|------|--------|
| `plugin.json` | Added SessionStart hook and environment-collector agent |
| `hooks.json` | Added SessionStart hook configuration |
| `agents/environment-collector.md` | New agent for environment capture |
| `agents/doc-generator.md` | Updated to generate multi-view output |
| `references/schema.md` | Documented session and index schemas |

### Storage Schema

#### sessions.jsonl

One line per session with environment metadata.

#### _data/index.json

Searchable index with statistics:

```json
{
  "version": "1.0",
  "generatedAt": "2026-01-27T10:00:00Z",
  "stats": {
    "totalProblems": 25,
    "solved": 22,
    "investigating": 3,
    "byCategory": { "test": 10, "build": 8, "runtime": 4 }
  },
  "problems": [
    { "id": "prob_001", "title": "...", "category": "test", "status": "solved" }
  ]
}
```

---

## Use Cases

### For Developers

- Browse problems by category: `docs/troubleshooting/by-category/test.md`
- Check recent solutions: `docs/troubleshooting/recent.md`
- Quick navigation: `docs/troubleshooting/README.md`

### For Tools

- Search problems: Read `_data/index.json`
- Process all problems: Read `_data/problems.json`
- Build custom views: Parse JSONL directly

### For CI/CD

- Detect environment-specific issues by comparing session metadata
- Track problem trends across different Git branches
- Identify runtime version dependencies

---

## Future Enhancements

Potential future additions:

1. **Problem search endpoint** - MCP server for searching problems
2. **Trend analysis** - Track problem frequency over time
3. **Environment correlation** - Identify environment-specific issues
4. **Custom views** - User-defined problem filters and groupings
5. **Export formats** - PDF, CSV, or API responses

---

## Version History

- **v2.1** (2026-01-27): Environment metadata capture and scalable output architecture
- **v2.0** (2026-01-27): Complete redesign for automatic detection
- **v1.0** (2026-01-27): Initial release with manual tracking
