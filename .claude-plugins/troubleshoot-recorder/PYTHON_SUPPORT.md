# Python Support Verification

This document verifies the Python support implementation for the troubleshoot-recorder plugin.

## Implementation Summary

The plugin has been expanded to comprehensively support Python development with:

1. **Python command detection** - pytest, mypy, ruff, pip, venv, etc.
2. **Python error patterns** - ImportError, SyntaxError, TypeError, async errors, etc.
3. **Subcategories** - 12 Python-specific subcategories for targeted prevention tips
4. **Type-check category** - New category for mypy/pyright
5. **Prevention tips** - Python-specific tips for each subcategory

## Files Modified

| File | Changes |
|------|---------|
| `agents/failure-detector.md` | Added Python commands, error patterns, subcategory detection logic |
| `agents/solution-detector.md` | Added Python test success patterns (pytest, unittest, mypy) |
| `agents/doc-generator.md` | Added Python-specific prevention tips for 12 subcategories |
| `references/schema.md` | Added `type-check` category, `subcategory` field, Python documentation |
| `README.md` | Added Python Support section with command table, error types, example workflow |

## Python Command Detection

### Testing
- `pytest`, `python -m pytest`, `python -m unittest`
- Success pattern: "passed" at end, no "FAILED" or "ERROR"

### Type Checking
- `mypy`, `pyright`, `python -m mypy`
- Success pattern: "Success: no issues found", exit code 0

### Linting
- `ruff`, `ruff check`, `flake8`, `black --check`, `isort --check`, `pylint`

### Package Management
- `pip install`, `pip check`, `uv pip`, `uv add`, `uv sync`, `poetry install`, `conda install`

### Virtual Environment
- `python -m venv`, `virtualenv`, `uv venv`

### Script Execution
- `python`, `python3`, `python -c`, `python -m module`

## Python Error Categories

### Primary Categories
- `test` - pytest, python -m unittest failures
- `type-check` - mypy, pyright type errors
- `lint` - ruff, flake8, pylint errors
- `runtime` - python script.py failures

### Subcategories (Python-specific)

| Subcategory | Error Patterns | Prevention Tips |
|-------------|----------------|-----------------|
| `import` | ImportError, ModuleNotFoundError | Use absolute imports, check __init__.py, verify package installed |
| `syntax` | SyntaxError, IndentationError, TabError | Use IDE highlighting, run py_compile, use 4 spaces |
| `venv` | Venv path issues | Always use venv, pin Python version, document setup |
| `pip` | Dependency conflicts, build failures | Pin versions, use pip-compile, check compatibility |
| `type-check` | Mypy/pyright type errors | Add annotations, install type stubs, run in CI |
| `async` | Event loop errors, unawaited coroutines | Use asyncio.run(), await all, don't mix sync/async |
| `attribute` | AttributeError, NoneType access | Check type first, use getattr(), initialize in __init__ |
| `value` | ValueError, KeyError, IndexError | Validate inputs, use .get() for dicts, check length |
| `file-system` | FileNotFoundError, PermissionError | Check Path.exists(), use context managers, specify encoding |
| `database` | OperationalError, IntegrityError | Use parameterized queries, wrap in transactions |
| `network` | ConnectionError, TimeoutError | Set timeouts, implement retry, handle errors |
| `memory` | MemoryError, RecursionError | Use generators, process line-by-line, profile memory |
| `serialization` | JSONDecodeError | Validate JSON, use default=str, use pydantic |

## Test Scenarios

### Scenario 1: Import Error Detection

**Command**: `pytest tests/test_api.py`

**Output**:
```
Traceback (most recent call last):
  File "tests/test_api.py", line 5, in <module>
    import nonexistent_module
ModuleNotFoundError: No module named 'nonexistent_module'
```

**Expected Detection**:
- Category: `test`
- Subcategory: `import`
- Error message: "No module named 'nonexistent_module'"
- Prevention tips: Import-specific (absolute imports, check __init__.py, verify package)

### Scenario 2: Type Check Error

**Command**: `mypy src/`

**Output**:
```
src/utils.py:10: error: Incompatible return value type (got "str", expected "int")
Found 1 error in 1 file (checked 5 source files)
```

**Expected Detection**:
- Category: `type-check`
- Subcategory: null (not a runtime error)
- Error message: "Incompatible return value type"
- Prevention tips: Type-check category tips (add annotations, install stubs)

### Scenario 3: Async Error

**Command**: `python app.py`

**Output**:
```
RuntimeError: asyncio.run() cannot be called from a running event loop
```

**Expected Detection**:
- Category: `runtime`
- Subcategory: `async`
- Error message: "asyncio.run() cannot be called from a running event loop"
- Prevention tips: Async-specific (use asyncio.run() as entry, await all coroutines)

### Scenario 4: Test Success

**Command**: `pytest tests/`

**Output**:
```
======================== test session starts ========================
collected 5 items

tests/test_api.py .....                                        [100%]

========================= 5 passed in 0.42s =========================
```

**Expected Detection**:
- Previous problem with same command marked as `solved`
- Solution confirmed by test success

## Backward Compatibility

JavaScript/TypeScript, Rust, and Go errors continue to work as before:
- No subcategory field (null)
- Primary category detection unchanged
- Prevention tips based on category only

## Verification Checklist

- [x] Python commands added to failure-detector.md
- [x] Python error patterns documented
- [x] Subcategory detection logic added
- [x] type-check category added
- [x] Python test success patterns added to solution-detector.md
- [x] Python prevention tips added to doc-generator.md (12 subcategories)
- [x] Schema updated with subcategory field
- [x] README updated with Python Support section
- [x] Backward compatibility maintained for non-Python languages

## Next Steps

To test the Python support:

1. Enable the plugin in `.claude/settings.local.json`
2. Run a Python test that fails:
   ```bash
   /usr/bin/python3.11 test_python_error.py
   ```
3. Check `.claude/troubleshoot/problems.jsonl` for captured problem with subcategory
4. Fix the error and say "fixed it"
5. End session and verify documentation includes Python-specific tips

## Example Generated Documentation

For an import error problem, the generated documentation would include:

```markdown
## Problem: ModuleNotFoundError in test suite

**Category**: test
**Subcategory**: import
**Date Solved**: 2026-01-27

### Error

```
ModuleNotFoundError: No module named 'nonexistent_module'
```

**File**: `tests/test_api.py:5`
**Command**: `pytest tests/test_api.py`

### Solution

Added missing __init__.py file to package directory.

### Prevention Tips

- Use absolute imports where possible
- Check `__init__.py` exists in package directories
- Verify package installed: `pip list | grep package-name`
- Add test for this specific case
- Review test assertions
- Check mock data matches expectations
```

Notice the prevention tips include both:
1. Subcategory-specific tips (import)
2. Category-specific tips (test)
