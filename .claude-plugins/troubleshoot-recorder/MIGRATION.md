# Migration Guide: v1.0 → v2.0

This guide helps you migrate from Troubleshoot Recorder v1.0 to v2.0.

## What Changed

### Architecture

| Aspect | v1.0 | v2.0 |
|--------|------|------|
| **Purpose** | Track tool failures | Track development issues (tests, builds) |
| **Detection** | Manual commands | Automatic from bash output |
| **Solution tracking** | Manual `/solve` | Context-based + test success |
| **Implementation** | Bash scripts + Python | Agent-only (no scripts) |
| **User interaction** | High (many commands) | Minimal (3 commands) |

### Removed Features

#### Commands Removed
- ❌ `/troubleshoot record` - Replaced by automatic detection
- ❌ `/troubleshoot attempt` - Tracked automatically
- ❌ `/troubleshoot solve` - Detected automatically
- ❌ `/troubleshoot generate` - Runs at session end automatically
- ❌ `/troubleshoot test` - Test generation feature removed

#### Scripts Removed
- `scripts/init-storage.sh`
- `scripts/capture-event.sh`
- `scripts/aggregate-problems.py`
- `scripts/generate-docs.py`
- `scripts/generate-tests.py`

### New Features

#### Automatic Detection
- Test failures detected from bash output
- Build errors detected automatically
- Lint errors captured
- No manual recording needed

#### Context-Based Solution Detection
- Recognizes phrases: "fixed it", "working now", "tests pass"
- Detects when previously failing tests pass
- Auto-marks problems as solved

#### Agent-Based Hooks
- `failure-detector` - Detects test/build failures
- `solution-detector` - Detects solutions
- `doc-generator` - Generates docs at session end

### Commands That Stayed

✅ `/troubleshoot status` - Shows current problems
✅ `/troubleshoot list` - Lists all problems
✅ `/troubleshoot report <desc>` - Manual issue reporting (NEW)

## Migration Steps

### 1. Backup Old Data (Optional)

If you have existing v1.0 data:

```bash
# Backup v1.0 storage
cp -r .claude/troubleshoot .claude/troubleshoot-v1-backup
```

### 2. Clean Up Old Storage

Remove v1.0 data structures (incompatible with v2.0):

```bash
rm -f .claude/troubleshoot/events.jsonl
rm -f .claude/troubleshoot/sessions.jsonl
rm -f .claude/troubleshoot/active-problem.json
```

Keep only:
```bash
# Keep problems.jsonl if you want to manually migrate
# Or delete it to start fresh
rm .claude/troubleshoot/problems.jsonl  # Optional: start fresh
```

### 3. Update Plugin Configuration

No changes needed - plugin manifest updated automatically.

### 4. Restart Claude Code

If already running, restart to load v2.0.

## Data Migration

### Option 1: Start Fresh (Recommended)

Delete all old data and let v2.0 build new documentation:

```bash
rm -rf .claude/troubleshoot
mkdir -p .claude/troubleshoot
```

### Option 2: Manual Migration

If you have valuable v1.0 data, manually convert `problems.jsonl`:

**v1.0 Schema:**
```json
{
  "id": "prob_001",
  "title": "...",
  "status": "solved",
  "errorSignature": {...},
  "attempts": [...],
  "rootCause": "...",
  "lessonLearned": {...}
}
```

**v2.0 Schema:**
```json
{
  "id": "prob_001",
  "title": "...",
  "category": "test",
  "status": "solved",
  "error": {
    "command": "npm test",
    "message": "...",
    "file": null,
    "line": null,
    "stackTrace": null,
    "fullOutput": null
  },
  "context": {
    "featureBeingWorked": "...",
    "recentFilesModified": [],
    "whatWasTried": "...",
    "conversationSummary": ""
  },
  "occurrences": [{
    "timestamp": "2026-01-27T10:00:00Z",
    "sessionId": "sess_001"
  }],
  "solution": {
    "description": "...",
    "confirmedAt": "2026-01-27T11:00:00Z",
    "filesModified": [],
    "whatFixed": "..."
  },
  "documentationGenerated": false
}
```

## Workflow Changes

### v1.0 Workflow
```
1. Tool fails → captured by hook
2. /troubleshoot record "Title"
3. /troubleshoot attempt (manual logging)
4. Fix code
5. /troubleshoot attempt (log result)
6. /troubleshoot solve (manual entry)
7. /troubleshoot generate (manual doc generation)
```

### v2.0 Workflow
```
1. npm test fails → automatic capture
2. Fix code
3. npm test passes → automatic solution detection
4. Session ends → automatic doc generation
```

**OR with manual reporting:**
```
1. /troubleshoot report "Issue description"
2. Fix issue
3. "fixed it" → automatic solution detection
4. Session ends → automatic doc generation
```

## Testing the Migration

### 1. Trigger Automatic Detection

```bash
# Create a failing test
npm test  # Should auto-detect failure

# Check status
/troubleshoot status
```

### 2. Test Solution Detection

```bash
# Fix the test, then:
npm test  # Should pass

# Or say:
"Tests are passing now"

# Check status
/troubleshoot status  # Should show solved
```

### 3. Generate Documentation

```bash
# End your session (or wait for Stop hook)
# Check output:
cat docs/troubleshooting/TROUBLESHOOTING_GUIDE.md
```

## FAQ

**Q: Can I keep using v1.0 commands?**
A: No, v1.0 commands are removed. Use automatic detection or `/troubleshoot report`.

**Q: Will my old documentation be lost?**
A: Backup `docs/troubleshooting/` before upgrading. v2.0 generates fresh docs.

**Q: How do I manually record problems now?**
A: Use `/troubleshoot report <description>` for issues without test failures.

**Q: What about test generation?**
A: Test generation feature was removed. Focus on automatic troubleshooting documentation.

**Q: Can I use both v1.0 and v2.0?**
A: No, v2.0 completely replaces v1.0. Data structures are incompatible.

## Rollback to v1.0

If you need to rollback:

1. Restore v1.0 plugin files (if backed up)
2. Restore v1.0 data:
   ```bash
   rm -rf .claude/troubleshoot
   cp -r .claude/troubleshoot-v1-backup .claude/troubleshoot
   ```
3. Restart Claude Code

## Getting Help

- Read [README.md](README.md) for v2.0 features
- Check [QUICK_START.md](QUICK_START.md) for usage guide
- See [references/schema.md](references/schema.md) for data structure
- Review agent implementations in `agents/` directory

## Summary

**Key Changes:**
- ✅ Automatic detection replaces manual commands
- ✅ Context-based solution detection
- ✅ Agent-based architecture (no scripts)
- ✅ Minimal user interaction needed
- ❌ Manual tracking commands removed
- ❌ Test generation feature removed

**Recommended Approach:**
Start fresh with v2.0 - let it build new documentation automatically as you develop.
