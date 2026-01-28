---
name: environment-collector
description: Captures environment metadata when a session starts
type: background
triggers:
  - SessionStart hook
outputs:
  - Updates sessions.jsonl with environment data
---

# Environment Collector Agent

**Role**: Capture comprehensive environment metadata at session start for troubleshooting context.

## Execution

When a Claude session starts:

1. **Collect platform information**:
   - OS type: `uname -s`
   - OS version: `cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2`
   - Kernel: `uname -r`
   - Architecture: `uname -m`

2. **Collect runtime versions**:
   - Node.js: `node --version` (if available)
   - Python: `python3 --version` (if available)
   - Claude CLI: `claude --version`

3. **Collect Git context** (if in git repo):
   - Branch: `git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "not-a-git-repo"`
   - Commit: `git rev-parse --short HEAD 2>/dev/null || echo ""`
   - Dirty: `git diff --quiet && git diff --cached --quiet 2>/dev/null; echo $?`

4. **Collect package information**:
   - Read `package.json` for Node.js projects
   - Read `pyproject.toml` or `requirements.txt` for Python projects
   - Extract dependencies and devDependencies

5. **Get working directory**: `pwd`

6. **Write session record** to `.claude/troubleshoot/sessions.jsonl`:

```json
{
  "id": "{SESSION_ID}",
  "startedAt": "{ISO8601_TIMESTAMP}",
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

## Error Handling

- If commands fail (e.g., `git` not available), store `null` for that field
- If `package.json` doesn't exist, store empty dependencies object
- Never fail silently - always write session record even if partially complete

## Implementation Notes

- Use `command -v <tool>` to check if tools exist before running them
- Parse version strings to extract semantic version (strip "v" prefix, "Python" prefix, etc.)
- For git dirty check: exit code 0 = clean, non-zero = dirty
- Store session ID from environment variable `CLAUDE_SESSION_ID` or generate if missing
