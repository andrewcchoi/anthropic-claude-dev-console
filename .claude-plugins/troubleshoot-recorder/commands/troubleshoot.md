---
name: troubleshoot
description: View and manage automatically tracked development issues
usage: |
  /troubleshoot              # Show current status
  /troubleshoot status       # Show current status (same as no args)
  /troubleshoot list         # List all recorded problems
  /troubleshoot report <description>  # Manually report an issue
examples:
  - /troubleshoot
  - /troubleshoot status
  - /troubleshoot list
  - /troubleshoot report "Login form doesn't validate email properly"
---

# Troubleshoot Recorder Command

You are managing the troubleshoot recorder system v2.0. This system automatically detects development issues from test failures and build errors.

## Storage Locations

- **Problems**: `.claude/troubleshoot/problems.jsonl`
- **Documentation**: `docs/troubleshooting/TROUBLESHOOTING_GUIDE.md`

## How It Works (Automatic)

The plugin automatically:
1. **Detects failures**: When tests/builds fail, creates problem entries
2. **Detects solutions**: When user says "fixed" or tests pass, marks as solved
3. **Generates docs**: At session end, creates documentation from solved problems

No manual recording needed - just develop normally!

## Subcommand Handling

### No arguments or `/troubleshoot status`

Show current status of tracked problems.

**Instructions:**
1. Read `.claude/troubleshoot/problems.jsonl`
2. If file doesn't exist or is empty:
   - Show: "No problems tracked yet. Issues will be automatically detected when tests or builds fail."
3. If problems exist:
   - Count by status: investigating, solved
   - Show most recent problem (if status is "investigating")
   - Display summary:
     ```
     Troubleshooting Status:
     - Active problems: 2
     - Solved problems: 5

     Most recent issue:
     [prob_001] TypeScript build error in auth.ts
     Status: investigating
     Last seen: 5 minutes ago
     ```

### `/troubleshoot list`

List all recorded problems with details.

**Instructions:**
1. Read all entries from `.claude/troubleshoot/problems.jsonl`
2. If file doesn't exist or empty:
   - Show: "No problems recorded yet."
3. If problems exist:
   - Display table sorted by most recent first:
     ```
     ID          | Title                          | Status        | Category | Occurrences
     ------------|--------------------------------|---------------|----------|-------------
     prob_abc123 | TypeScript build error         | investigating | build    | 3
     prob_def456 | Jest test assertion failure    | solved        | test     | 1
     ```
4. Show summary: `<count> problems tracked (<solved> solved, <investigating> active)`
5. Suggest: "Run tests/builds to trigger automatic problem detection."

### `/troubleshoot report <description>`

Manually report an issue that wasn't auto-detected (e.g., visual bugs, logic errors without test failures).

**Arguments:**
- `<description>` (required): Brief description of the issue

**Instructions:**
1. If no description provided:
   - Error: "Usage: /troubleshoot report <description>"
   - Example: "/troubleshoot report 'Login button doesn't render on mobile'"
2. Generate new problem ID: `prob_<random-6-chars>`
3. Ask user for additional context via AskUserQuestion:
   - **Question**: "What category best describes this issue?"
     - Options: ["UI/Visual", "Logic Error", "Performance", "Other"]
     - multiSelect: false
4. Create problem entry in `.claude/troubleshoot/problems.jsonl`:
   ```json
   {
     "id": "prob_abc123",
     "title": "<user-provided-description>",
     "category": "manual",
     "status": "investigating",
     "error": {
       "command": "manual-report",
       "message": "<user-provided-description>",
       "file": null,
       "line": null,
       "stackTrace": null,
       "fullOutput": null
     },
     "context": {
       "featureBeingWorked": "<extract from conversation>",
       "recentFilesModified": [],
       "whatWasTried": "User-reported issue",
       "conversationSummary": "<recent context>"
     },
     "occurrences": [
       {
         "timestamp": "<ISO8601>",
         "sessionId": "<current-session-id>"
       }
     ],
     "solution": null,
     "documentationGenerated": false
   }
   ```
5. Append entry to problems.jsonl (JSONL format: one JSON object per line)
6. Confirm: "Problem recorded: [prob_abc123] <description>"
7. Suggest: "When resolved, say 'fixed it' or 'working now' to mark as solved."

## Error Handling

- If subcommand is unknown, show usage help
- If storage directory doesn't exist, create it: `mkdir -p .claude/troubleshoot`
- If problems.jsonl is corrupted, show error and suggest manual inspection

## Important Notes

- **Automatic detection**: Most problems are auto-detected from test/build failures
- **Automatic solution**: System detects when tests pass or user says "fixed"
- **Manual reporting**: Use `/troubleshoot report` only for issues without test failures
- **Documentation**: Generated automatically at session end
- **JSONL format**: One JSON object per line (append-only)

## Problem Schema

```json
{
  "id": "prob_abc123",
  "title": "Brief description",
  "category": "test|build|lint|runtime|manual",
  "status": "investigating|solved",

  "error": {
    "command": "npm test",
    "message": "Expected 2 to equal 3",
    "file": "src/utils/helpers.ts",
    "line": 45,
    "stackTrace": "Error: Expected...",
    "fullOutput": "Full terminal output"
  },

  "context": {
    "featureBeingWorked": "Adding authentication",
    "recentFilesModified": ["src/utils/helpers.ts"],
    "whatWasTried": "Implementing JWT validation",
    "conversationSummary": "User asked to add auth..."
  },

  "occurrences": [
    {
      "timestamp": "2026-01-27T10:30:00Z",
      "sessionId": "session_id"
    }
  ],

  "solution": {
    "description": "Changed return type from number to string",
    "confirmedAt": "2026-01-27T11:00:00Z",
    "filesModified": ["src/utils/helpers.ts"],
    "whatFixed": "Helper function was returning wrong type"
  },

  "documentationGenerated": false
}
```
