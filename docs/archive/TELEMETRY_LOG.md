# Telemetry Logging Implementation

## Overview

Implemented automatic logging of Claude CLI telemetry data to a JSONL file at `/workspace/logs/telemetry.jsonl`.

## Implementation Details

### Files Created/Modified

1. **`/workspace/src/lib/telemetry.ts`** (new)
   - `jsToJson()`: Converts JavaScript object notation to valid JSON
   - `parseTelemetry()`: Parses telemetry buffer into structured objects

2. **`/workspace/src/app/api/claude/route.ts`** (modified)
   - Added telemetry buffer to capture non-JSON output
   - Detects telemetry blocks by keywords: `descriptor:`, `dataPointType:`, `dataPoints:`, etc.
   - Tracks bracket depth to identify complete telemetry objects
   - Logs telemetry to JSONL file on process close

### Telemetry Capture Logic

The CLI outputs telemetry in JavaScript object notation (unquoted keys) at the end of each session:

```javascript
{
  descriptor: {
    name: 'claude_code.cost.usage',
    type: 'COUNTER',
    unit: 'USD'
  },
  dataPoints: [{ value: 0.017 }]
}
```

The implementation:
1. Buffers lines containing telemetry keywords
2. Tracks `{` and `}` to identify complete objects
3. Converts JS notation to JSON using regex
4. Appends each entry with timestamp to JSONL file

## Telemetry Metrics

Each telemetry object includes:

- **Descriptor**: Metric name, type, unit, description
- **Data Points**: Array of measurements with:
  - `value`: The metric value (cost in USD, token count, etc.)
  - `attributes`: Session ID, user ID, model, type (input/output/cacheRead/cacheCreation)
  - `startTime` / `endTime`: High-resolution timestamps

## Usage

Telemetry is automatically logged to `/workspace/logs/telemetry.jsonl` for every API request. Each line is a complete JSON object.

### View Recent Telemetry

```bash
# View all metrics
tail -10 /workspace/logs/telemetry.jsonl | jq .

# View cost metrics only
jq 'select(.descriptor.name == "claude_code.cost.usage")' /workspace/logs/telemetry.jsonl

# Summarize costs by session
jq -s 'group_by(.dataPoints[0].attributes."session.id") |
  map({session: .[0].dataPoints[0].attributes."session.id",
       total_cost: map(.dataPoints[0].value) | add})' \
  /workspace/logs/telemetry.jsonl
```

## Example Output

```json
{
  "timestamp": "2026-01-28T02:53:30.185Z",
  "descriptor": {
    "name": "claude_code.cost.usage",
    "type": "COUNTER",
    "description": "Cost of the Claude Code session",
    "unit": "USD"
  },
  "dataPoints": [
    {
      "attributes": {
        "user.id": "c326a92f7bdc36b0585854424e1f44b1e90592088b876925c4317fc471ea384d",
        "session.id": "8101480c-261b-4b11-bfba-b4f0cdd05c05",
        "model": "claude-sonnet-4-5"
      },
      "value": 0.01700295
    }
  ]
}
```

## Testing

```bash
# Send a test request
curl -X POST http://localhost:3000/api/claude \
  -H "Content-Type: application/json" \
  -d '{"prompt":"What is 2+2?"}'

# View logged telemetry
tail -5 /workspace/logs/telemetry.jsonl | jq .
```

## Notes

- Telemetry logging failures are silently caught to not disrupt API responses
- The log directory is created automatically if it doesn't exist
- Each API request generates 2+ telemetry entries (cost, token usage, cache metrics)
