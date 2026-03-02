# LangSmith Tracing - Setup Guide

## Quick Setup

Your worktree is already configured! Tracing is controlled by settings in `.claude/settings.local.json`.

## Configuration

### Turn Tracing ON/OFF

Edit `.claude/settings.local.json`:

```json
{
  "tracing": {
    "langsmith": {
      "enabled": true,           // Set to false to disable
      "project": "pr-virtual-helmet-80",
      "captureSessionEnd": true,  // Trace session completion
      "captureSubagents": true,   // Trace subagent execution
      "captureWorkflows": true    // Trace ultrathink workflows
    }
  }
}
```

**Toggle tracing:**
- `"enabled": true` - ✅ Send traces to LangSmith
- `"enabled": false` - ❌ Tracing disabled

Similar to provider settings (Amazon, Google, Azure), this is a simple flag you can toggle.

## Environment Variables (Already Set)

```json
{
  "env": {
    "LANGSMITH_API_KEY": "lsv2_pt_...",
    "LANGSMITH_PROJECT": "pr-virtual-helmet-80",
    "LANGSMITH_TRACING": "true"
  }
}
```

These are set in your `.env` and `.claude/settings.local.json`.

## What Gets Traced

### Automatic (via Stop Hook)
When you exit a Claude Code session:
- Session ID
- Session duration
- Working directory
- Timestamp

The Stop hook runs automatically and sends this to LangSmith.

### Manual (via Code)
You can also trace specific operations by calling the API:

```typescript
import { startWorkflowTrace, traceSubagent } from '@/lib/tracing';

// Trace a workflow
await startWorkflowTrace({
  workflowId: 'my-workflow',
  taskDescription: 'Implement feature X',
  startedAt: new Date(),
});

// Trace a subagent
await traceSubagent(metadata, async () => {
  // Your work here
});
```

## Test It

```bash
cd .worktrees/langsmith-tracing
./run-langsmith-test.sh
```

Then check: https://smith.langchain.com (Project: pr-virtual-helmet-80)

## Toggle Tracing Without Editing JSON

You can override via environment variable:

```bash
# Disable tracing for this session
LANGSMITH_TRACING=false claude

# Enable tracing for this session
LANGSMITH_TRACING=true claude
```

The environment variable takes precedence over the settings file.

## View Traces

1. Go to https://smith.langchain.com
2. Select project: **pr-virtual-helmet-80**
3. Click "Traces" tab
4. See your session data

## Troubleshooting

**No traces appearing?**
1. Check `tracing.langsmith.enabled` is `true`
2. Verify `LANGSMITH_API_KEY` is set
3. Run the test: `./run-langsmith-test.sh`
4. Check LangSmith API key is valid

**Traces for wrong project?**
- Update `tracing.langsmith.project` in settings
- Or set `LANGSMITH_PROJECT` environment variable
