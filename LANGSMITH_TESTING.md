# LangSmith Tracing - Testing Guide

## Overview

LangSmith tracing provides observability for pr-virtual-helmet-80 workflows:
- Phase transitions
- Subagent dispatches  
- Review iterations
- Token usage

## Setup

### 1. Get LangSmith API Key

Sign up at https://smith.langchain.com and get your API key.

### 2. Configure Environment Variables

```bash
# In .env or export directly
export LANGSMITH_API_KEY="your-api-key-here"
export LANGSMITH_PROJECT="pr-virtual-helmet-80"  # Optional, defaults to "pr-virtual-helmet-80"
export LANGSMITH_TRACING="true"             # Enable tracing
export LANGSMITH_TRACING="true"             # Optional, for debug logs
```

### 3. Verify Configuration

```bash
cd .worktrees/langsmith-tracing
npm test -- __tests__/lib/tracing/langsmith.test.ts
```

## Usage Example

```typescript
import {
  startWorkflowTrace,
  startPhaseTrace,
  traceSubagent,
  endPhaseTrace,
  endWorkflowTrace,
  isTracingEnabled,
} from '@/lib/tracing';

// Check if tracing is enabled
if (isTracingEnabled()) {
  console.log('✅ LangSmith tracing active');
}

// 1. Start workflow trace
await startWorkflowTrace({
  workflowId: 'workflow-123',
  taskDescription: 'Implement user authentication',
  startedAt: new Date(),
});

// 2. Start phase trace
await startPhaseTrace({
  workflowId: 'workflow-123',
  phase: 'A',
  phaseName: 'Architecture Analysis',
  subagentType: 'general-purpose',
  focusArea: 'Requirements',
});

// 3. Trace a subagent
const result = await traceSubagent(
  {
    workflowId: 'workflow-123',
    phase: 'A',
    subagentId: 'arch-1',
    subagentType: 'general-purpose',
    focusArea: 'Architecture',
    prompt: 'Analyze authentication patterns',
  },
  async () => {
    // Your subagent work here
    return {
      success: true,
      output: 'OAuth2 recommended',
      tokensUsed: 1500,
    };
  }
);

// 4. End phase
await endPhaseTrace('workflow-123', 'A', true);

// 5. End workflow
await endWorkflowTrace('workflow-123', true);
```

## Testing Locally

### Run Unit Tests

```bash
cd .worktrees/langsmith-tracing
npm test -- __tests__/lib/tracing/langsmith.test.ts --run
```

### Manual Integration Test

Create a test file `test-langsmith.ts`:

```typescript
import {
  startWorkflowTrace,
  traceSubagent,
  endWorkflowTrace,
  isTracingEnabled,
  getTracingConfig,
} from './src/lib/tracing';

async function testLangSmith() {
  console.log('LangSmith Config:', getTracingConfig());
  console.log('Tracing Enabled:', isTracingEnabled());

  if (!isTracingEnabled()) {
    console.error('❌ Tracing not enabled. Set LANGSMITH_API_KEY and LANGSMITH_TRACING=true');
    return;
  }

  const workflowId = `test-${Date.now()}`;

  // Start workflow
  await startWorkflowTrace({
    workflowId,
    taskDescription: 'Test workflow',
    startedAt: new Date(),
  });

  // Trace a simple subagent
  const result = await traceSubagent(
    {
      workflowId,
      phase: 'test',
      subagentId: 'test-sub-1',
      subagentType: 'general-purpose',
      focusArea: 'Testing',
      prompt: 'Simple test',
    },
    async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return { success: true, output: 'Test complete' };
    }
  );

  console.log('Subagent Result:', result);

  // End workflow
  await endWorkflowTrace(workflowId, true);

  console.log('✅ Test complete! Check LangSmith dashboard:');
  console.log(`   https://smith.langchain.com/o/YOUR_ORG/projects/p/pr-virtual-helmet-80`);
}

testLangSmith().catch(console.error);
```

Run it:
```bash
npx tsx test-langsmith.ts
```

## View Traces in LangSmith

1. Go to https://smith.langchain.com
2. Navigate to your project (default: "pr-virtual-helmet-80")
3. View traces in the "Traces" tab

You'll see:
- Workflow hierarchy
- Phase durations
- Subagent execution details
- Token usage
- Error traces

## Environment Variable Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LANGSMITH_API_KEY` | Yes | - | Your LangSmith API key |
| `LANGSMITH_TRACING` | Yes | `false` | Enable/disable tracing |
| `LANGSMITH_PROJECT` | No | `pr-virtual-helmet-80` | Project name in LangSmith |
| `LANGSMITH_TRACING` | No | `false` | Enable debug logging |

## Troubleshooting

### "Tracing not enabled"
Check:
```bash
echo $LANGSMITH_API_KEY  # Should show your key
echo $LANGSMITH_TRACING     # Should be "true"
```

### "API key invalid"
Verify at https://smith.langchain.com/settings

### No traces appearing
1. Check network requests in browser DevTools (should see calls to api.smith.langchain.com)
2. Enable debug mode: `LANGSMITH_TRACING=true`
3. Check console for LangSmith client errors

## Integration with pr-virtual-helmet-80

The LangSmith tracing is designed to work with pr-virtual-helmet-80 workflows automatically. When running ultrathink:

1. Workflow trace starts at the beginning
2. Each phase (A, B, C, D, E) gets traced
3. Subagents are traced individually
4. Review iterations are logged
5. Workflow ends with success/failure status

All tracing is **non-blocking** - if LangSmith is down or misconfigured, the workflow continues normally.
