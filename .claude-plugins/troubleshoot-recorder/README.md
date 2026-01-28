# Troubleshoot Recorder Plugin v2.0

**Hands-off development troubleshooting** - Automatically detects test failures and build errors, then generates documentation from your fixes.

## What's New in v2.0

Complete redesign focused on **automatic detection** of development issues:

| v1.0 | v2.0 |
|------|------|
| Track tool failures | Track development issues (tests, builds) |
| Manual commands to record | Auto-detect from bash output |
| Manual `/solve` command | Context-based detection |
| Shell scripts + Python | Agent-only (no scripts) |
| High user interaction | Minimal interaction |

## How It Works

The plugin automatically:

1. **Detects failures** when tests/builds fail (via bash command monitoring)
2. **Detects solutions** when you say "fixed it" or tests pass
3. **Generates docs** at session end from solved problems

**No manual tracking needed - just develop normally!**

## Features

- **Automatic failure detection**: Monitors test/build commands for failures
- **Context-based solution detection**: Knows when issues are resolved
- **Cross-session tracking**: Problems persist across Claude sessions
- **Smart deduplication**: Groups similar errors together
- **Automatic documentation**: Generates guides at session end
- **Minimal commands**: Only 3 commands (status, list, report)

## Installation

### Enable the Plugin

Add to `.claude/settings.local.json`:

```json
{
  "plugins": {
    "enabled": ["troubleshoot-recorder"]
  }
}
```

The plugin will auto-initialize storage on first use.

## Usage

### Automatic Detection (Primary Workflow)

**Just develop normally - the plugin handles the rest:**

```bash
# Run your test
npm test  # Fails with error → automatically captured

# Fix the issue
# ... make code changes ...

# Verify the fix
npm test  # Passes → automatically marked as solved

# At session end → documentation generated
```

**Solution phrases** the plugin recognizes:
- "fixed", "fixed it", "that fixed it"
- "working now", "it works now"
- "tests pass", "tests are passing"
- "solved", "resolved"

### Manual Commands

#### Check Status

```
/troubleshoot status
```

Shows active and solved problems.

#### List All Problems

```
/troubleshoot list
```

Displays table of all tracked problems with status.

#### Manual Issue Reporting

For issues without test failures (visual bugs, logic errors):

```
/troubleshoot report "Login button doesn't render on mobile"
```

## What Gets Tracked

| Event Type | Example | Detection Method |
|------------|---------|------------------|
| Test failure | `npm test` or `pytest` fails with assertion error | Automatic (bash output) |
| Build error | `npm run build` fails with TypeScript error | Automatic (bash output) |
| Lint error | `eslint` or `ruff check` fails with style errors | Automatic (bash output) |
| Type check | `mypy` fails with type errors | Automatic (bash output) |
| Runtime error | `python script.py` fails with ImportError | Automatic (bash output) |
| Manual issue | "Button doesn't render correctly" | Manual (`/troubleshoot report`) |

## Data Storage

All data stored in `.claude/troubleshoot/`:

- `problems.jsonl` - All tracked problems (JSONL format)

Generated documentation:
- `docs/troubleshooting/TROUBLESHOOTING_GUIDE.md`

## Architecture

**Agent-based hook system:**

| Hook Event | Agent | Purpose |
|------------|-------|---------|
| PostToolUse (Bash) | failure-detector | Detect test/build failures |
| UserPromptSubmit | solution-detector | Detect solution phrases |
| PostToolUse (Bash) | solution-detector | Detect test success |
| Stop | doc-generator | Generate documentation |

## Example Workflows

### Test Failure → Fix → Document

```
Developer runs test → Test fails → Problem captured
       ↓
Developer debugs → Fixes code → Runs test again
       ↓
Test passes → Problem marked as solved
       ↓
Session ends → Documentation generated
```

### Manual Issue Reporting

```
/troubleshoot report "User profile page loads slowly"
# ... investigate and fix performance issue ...
"Fixed it by adding database index"
# Problem marked as solved automatically
```

### Cross-Session Troubleshooting

**Session 1:**
```
npm test  # Fails → problem captured
# ... try fix ...
npm test  # Still fails → occurrence logged
# Session ends
```

**Session 2:**
```
/troubleshoot status  # Shows active problem from Session 1
# ... try different approach ...
npm test  # Passes → problem marked as solved
# Session ends → documentation generated
```

## Problem Categories

Automatically categorized:

| Category | Detection Pattern |
|----------|------------------|
| `test` | npm test, pytest, jest, vitest, cargo test, go test, python -m pytest |
| `build` | npm run build, tsc, cargo build, go build |
| `lint` | eslint, prettier, ruff check, flake8, black --check, clippy |
| `type-check` | mypy, pyright, python -m mypy |
| `runtime` | Errors during app execution (python script.py, node app.js) |
| `manual` | User-reported via command |

## Python Support

The plugin provides comprehensive Python development support with specialized error detection and prevention tips.

### Detected Python Commands

| Command Type | Examples |
|--------------|----------|
| **Testing** | pytest, python -m pytest, python -m unittest |
| **Script Execution** | python, python3, python -c, python -m module |
| **Package Management** | pip install, pip check, uv pip, uv add, poetry install, conda install |
| **Virtual Environment** | python -m venv, virtualenv, uv venv |
| **Type Checking** | mypy, pyright, python -m mypy |
| **Linting** | ruff, ruff check, flake8, black --check, isort --check, pylint |

### Detected Python Error Types

Python errors are automatically categorized with subcategories for specific prevention tips:

| Subcategory | Error Patterns |
|-------------|----------------|
| **import** | ImportError, ModuleNotFoundError, "No module named" |
| **syntax** | SyntaxError, IndentationError, TabError |
| **venv** | Virtual environment configuration issues |
| **pip** | Package installation/dependency conflicts |
| **async** | Event loop issues, unawaited coroutines |
| **attribute** | AttributeError, NoneType attribute access |
| **value** | ValueError, KeyError, IndexError |
| **file-system** | FileNotFoundError, PermissionError, OSError |
| **database** | OperationalError, IntegrityError |
| **network** | ConnectionError, TimeoutError, HTTPError |
| **memory** | MemoryError, RecursionError |
| **serialization** | JSONDecodeError, serialization errors |

### Python Workflow Example

```bash
# Run pytest - fails with ImportError
pytest tests/test_api.py
# → Captured with category: test, subcategory: import

# Fix import issue
# ... add missing __init__.py ...

# Verify fix
pytest tests/test_api.py  # Passes
# → Problem marked as solved automatically

# At session end → docs generated with import-specific prevention tips
```

## Documentation Format

Generated markdown includes:

- Problem title and category
- Error message and location
- Context (what was being worked on)
- Solution description
- Prevention tips

See `references/schema.md` for complete data structure.

## Comparison: v1.0 vs v2.0

### v1.0 (Manual Tracking)
```
User: /troubleshoot record "Error in auth"
User: /troubleshoot attempt
User: /troubleshoot solve
User: /troubleshoot generate
```

### v2.0 (Automatic Detection)
```
User: npm test  # Automatic detection
User: [fixes code]
User: "fixed it"  # Automatic solution detection
# Auto-generated docs at session end
```

## Advanced Features

### Smart Deduplication

Similar errors are grouped together:
- Normalizes file paths, timestamps, UUIDs
- Uses fuzzy matching (80%+ similarity)
- Tracks occurrences per problem

### Context Capture

Each problem includes:
- What feature was being worked on
- Recently modified files
- Conversation summary
- Full error output for reference

## Troubleshooting the Plugin

**No problems detected:**
- Ensure test/build commands fail with non-zero exit code
- Check if command matches detection patterns (npm test, npm run build, etc.)

**Solution not detected:**
- Use solution phrases: "fixed it", "working now", "tests pass"
- Or manually run same test command that succeeded

**Documentation not generated:**
- Documentation generates at session end (Stop hook)
- Check `.claude/troubleshoot/problems.jsonl` for solved problems

## Schema Reference

See `references/schema.md` for:
- Complete problem data structure
- Field descriptions
- JSONL format details
- Error signature normalization

## License

Part of the Claude Code project.
