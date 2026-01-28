# Troubleshoot Recorder Data Schema

This document describes the data structures used by the Troubleshoot Recorder v2.0 plugin.

## Storage Files

| File | Format | Purpose |
|------|--------|---------|
| `.claude/troubleshoot/problems.jsonl` | JSONL | All tracked problems (append-only) |
| `.claude/troubleshoot/sessions.jsonl` | JSONL | Session metadata with environment info |
| `docs/troubleshooting/TROUBLESHOOTING_GUIDE.md` | Markdown | Generated documentation (full) |
| `docs/troubleshooting/README.md` | Markdown | Overview with stats and navigation |
| `docs/troubleshooting/by-category/*.md` | Markdown | Category-specific problem views |
| `docs/troubleshooting/_data/*.json` | JSON | Structured data exports for tooling |

## Session Schema

### Complete Structure

```json
{
  "id": "sess_abc123",
  "startedAt": "2026-01-27T10:00:00Z",
  "environment": {
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
      "dependencies": {
        "next": "16.1.6",
        "react": "19.2.4"
      },
      "devDependencies": {
        "typescript": "5.9.3"
      }
    },
    "workingDirectory": "/workspace"
  }
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Session ID from `CLAUDE_SESSION_ID` environment variable |
| `startedAt` | string | ISO8601 timestamp when session started |
| `environment.platform.os` | string | Operating system (linux, darwin, etc.) |
| `environment.platform.osVersion` | string | OS version string |
| `environment.platform.kernel` | string | Kernel version |
| `environment.platform.arch` | string | Architecture (x86_64, arm64, etc.) |
| `environment.runtimes.node` | string\|null | Node.js version (null if not installed) |
| `environment.runtimes.python` | string\|null | Python version (null if not installed) |
| `environment.runtimes.claudeCli` | string | Claude CLI version |
| `environment.git.branch` | string\|null | Git branch name (null if not a git repo) |
| `environment.git.commit` | string\|null | Short commit hash (null if not a git repo) |
| `environment.git.dirty` | boolean\|null | Whether working tree has uncommitted changes |
| `environment.packages.dependencies` | object | Production dependencies from package.json |
| `environment.packages.devDependencies` | object | Development dependencies from package.json |
| `environment.workingDirectory` | string | Current working directory |

## Problem Schema

### Complete Structure

```json
{
  "id": "prob_abc123",
  "title": "Brief descriptive title of the problem",
  "category": "test|build|lint|type-check|runtime|manual",
  "subcategory": "import|syntax|venv|pip|async|attribute|value|file-system|database|network|memory|serialization|null",
  "status": "investigating|solved",

  "error": {
    "command": "npm test",
    "message": "Expected 2 to equal 3",
    "file": "src/utils/helpers.ts",
    "line": 45,
    "stackTrace": "Error: Expected 2 to equal 3\n  at test.ts:45:10\n  at run ()",
    "fullOutput": "Full terminal output for reference..."
  },

  "context": {
    "featureBeingWorked": "Adding user authentication to API routes",
    "recentFilesModified": ["src/utils/helpers.ts", "src/api/auth.ts"],
    "whatWasTried": "Implementing JWT token validation",
    "conversationSummary": "User asked to add auth middleware for protected routes..."
  },

  "occurrences": [
    {
      "timestamp": "2026-01-27T10:30:00Z",
      "sessionId": "sess_001"
    },
    {
      "timestamp": "2026-01-27T10:45:00Z",
      "sessionId": "sess_001"
    }
  ],

  "solution": {
    "description": "Changed return type from number to string in validateToken helper",
    "confirmedAt": "2026-01-27T11:00:00Z",
    "filesModified": ["src/utils/helpers.ts"],
    "whatFixed": "The validateToken helper function was returning a string but was typed as returning a number, causing type mismatch in tests"
  },

  "documentationGenerated": false
}
```

### Field Descriptions

#### Top-level Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique problem ID (format: `prob_<random-6-chars>`) |
| `title` | string | Brief descriptive title extracted from error or user-provided |
| `category` | enum | Problem category: `test`, `build`, `lint`, `type-check`, `runtime`, `manual` |
| `subcategory` | enum\|null | Python-specific subcategory: `import`, `syntax`, `venv`, `pip`, `async`, `attribute`, `value`, `file-system`, `database`, `network`, `memory`, `serialization`, or `null` for non-Python errors |
| `status` | enum | Current status: `investigating`, `solved` |
| `error` | object | Error details (see Error Object below) |
| `context` | object | Contextual information (see Context Object below) |
| `occurrences` | array | List of occurrence records (see Occurrence Object below) |
| `solution` | object\|null | Solution details when solved (see Solution Object below) |
| `documentationGenerated` | boolean | Whether this problem has been included in documentation |

#### Error Object

| Field | Type | Description |
|-------|------|-------------|
| `command` | string | Command that failed (e.g., `npm test`, `npm run build`) |
| `message` | string | Primary error message |
| `file` | string\|null | File path where error occurred (if available) |
| `line` | number\|null | Line number where error occurred (if available) |
| `stackTrace` | string\|null | Stack trace (first few lines for brevity) |
| `fullOutput` | string\|null | Complete terminal output for reference |

#### Context Object

| Field | Type | Description |
|-------|------|-------------|
| `featureBeingWorked` | string | Description of what feature/task was being worked on |
| `recentFilesModified` | array | List of file paths recently modified |
| `whatWasTried` | string | What the developer was attempting to do |
| `conversationSummary` | string | Summary of relevant conversation context |

#### Occurrence Object

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | string | ISO8601 timestamp when error occurred |
| `sessionId` | string | Claude session ID when error occurred |

#### Solution Object

| Field | Type | Description |
|-------|------|-------------|
| `description` | string | Brief description of the solution |
| `confirmedAt` | string | ISO8601 timestamp when solution was confirmed |
| `filesModified` | array | List of files that were modified to fix the issue |
| `whatFixed` | string | Detailed explanation of what was wrong and how it was fixed |

## Category Detection

### Primary Categories

Problems are automatically categorized based on the command that failed:

| Category | Detection Pattern |
|----------|------------------|
| `test` | Commands: `npm test`, `npm run test`, `pytest`, `jest`, `vitest`, `cargo test`, `go test`, `python -m pytest`, `python -m unittest` |
| `build` | Commands: `npm run build`, `tsc`, `cargo build`, `go build` |
| `lint` | Commands: `eslint`, `prettier --check`, `ruff`, `ruff check`, `flake8`, `black --check`, `isort --check`, `pylint`, `cargo clippy` |
| `type-check` | Commands: `mypy`, `pyright`, `python -m mypy` |
| `runtime` | Errors during app execution: `python script.py`, `node app.js`, `cargo run` |
| `manual` | Reported via `/troubleshoot report` command |

### Python Sub-categories

Python errors are further classified with subcategories for more specific prevention tips:

| Subcategory | Detection Pattern |
|-------------|------------------|
| `import` | Error patterns: `ImportError`, `ModuleNotFoundError`, `No module named`, `circular import` |
| `syntax` | Error patterns: `SyntaxError`, `IndentationError`, `TabError`, caret pointer (`^`) |
| `venv` | Error patterns: Virtual environment path issues, "cannot find virtualenv" |
| `pip` | Error patterns: `Could not find a version`, `Failed building wheel`, `conflicting dependencies`, `CondaError` |
| `async` | Error patterns: `event loop is already running`, `coroutine was never awaited`, `asyncio.CancelledError` |
| `attribute` | Error patterns: `AttributeError`, `'NoneType' object has no attribute` |
| `value` | Error patterns: `ValueError`, `KeyError`, `IndexError` |
| `file-system` | Error patterns: `FileNotFoundError`, `PermissionError`, `OSError`, `UnicodeDecodeError` |
| `database` | Error patterns: `OperationalError`, `IntegrityError` (SQLite, PostgreSQL, etc.) |
| `network` | Error patterns: `ConnectionError`, `TimeoutError`, `HTTPError`, `requests.exceptions` |
| `memory` | Error patterns: `MemoryError`, `RecursionError` |
| `serialization` | Error patterns: `JSONDecodeError`, `is not JSON serializable` |

**Note**: Subcategories are only assigned for Python errors. JavaScript/TypeScript, Rust, and Go errors will have `subcategory: null`.

## Status Workflow

```
investigating → solved
      ↓
  (automatic detection)
```

- **investigating**: Problem detected, not yet solved
- **solved**: Problem resolved (detected via context or test success)

## JSONL Format

The `problems.jsonl` file uses JSONL (JSON Lines) format:
- One JSON object per line
- No commas between objects
- Append-only (new entries added to end of file)
- Each line is a complete, valid JSON object

Example:
```
{"id":"prob_abc123","title":"Test failure","status":"investigating",...}
{"id":"prob_def456","title":"Build error","status":"solved",...}
```

## Error Signature Normalization

For duplicate detection, error signatures are normalized by:
1. Removing absolute file paths (keep relative paths)
2. Removing UUIDs and random IDs
3. Removing timestamps
4. Removing line/column numbers (keep file names)
5. Converting to lowercase for comparison

Example:
```
Original: "/workspace/src/utils/helpers.ts:45:10 - Type 'string' is not assignable"
Normalized: "src/utils/helpers.ts - type <str> is not assignable"
```

## Documentation Output

Generated documentation follows this structure:

```markdown
# Troubleshooting Guide

This document contains solutions to common development issues encountered in this project.

**Last Updated**: 2026-01-27

---

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

### Solution

The validateToken helper function was returning a string but was typed as returning a number, causing type mismatch in tests.

**Changed Files**: src/utils/helpers.ts

### Prevention Tips

- Add test for this specific case
- Review test assertions
- Check mock data matches expectations

---
```

## Index Schema (JSON Export)

The `docs/troubleshooting/_data/index.json` file provides searchable metadata:

```json
{
  "version": "1.0",
  "generatedAt": "2026-01-27T10:00:00Z",
  "stats": {
    "totalProblems": 25,
    "solved": 22,
    "investigating": 3,
    "byCategory": {
      "test": 10,
      "build": 8,
      "runtime": 4,
      "lint": 2,
      "type-check": 1
    }
  },
  "problems": [
    {
      "id": "prob_abc123",
      "title": "Test failure in authentication",
      "category": "test",
      "subcategory": null,
      "status": "solved",
      "solvedAt": "2026-01-27T11:00:00Z",
      "file": "src/utils/helpers.ts",
      "line": 45
    }
  ]
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | Index schema version |
| `generatedAt` | string | ISO8601 timestamp of generation |
| `stats.totalProblems` | number | Total number of tracked problems |
| `stats.solved` | number | Number of solved problems |
| `stats.investigating` | number | Number of unsolved problems |
| `stats.byCategory` | object | Problem counts by category |
| `problems[]` | array | Searchable problem summaries |

## Version History

- **v2.0** (2026-01-27): Complete redesign for automatic detection
  - Agent-based hook system
  - Automatic failure detection from bash output
  - Context-based solution detection
  - Removed manual tracking commands
- **v1.0** (2026-01-27): Initial release with manual tracking
