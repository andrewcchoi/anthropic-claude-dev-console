# Claude CLI Telemetry Data

## Overview

The Claude Code CLI outputs telemetry data at the end of each session in JavaScript object format (not JSON). This data tracks usage metrics for analytics and billing purposes.

## Data Structure

The telemetry consists of multiple metric objects, each following this structure:

```javascript
{
  descriptor: {
    name: 'metric_name',
    type: 'COUNTER',
    description: 'Human-readable description',
    unit: 'unit_of_measurement',
    valueType: 1,  // Number type
    advice: {}
  },
  dataPointType: 3,
  dataPoints: [
    {
      attributes: { /* metric attributes */ },
      startTime: [ seconds, nanoseconds ],
      endTime: [ seconds, nanoseconds ],
      value: numeric_value
    }
  ]
}
```

## Metrics Collected

### 1. Cost Usage (`claude_code.cost.usage`)
- **Unit**: USD (dollars)
- **Purpose**: Track the cost of API calls
- **Attributes**:
  - `user.id`: Hashed user identifier
  - `session.id`: Unique session UUID
  - `terminal.type`: Terminal type (e.g., "vscode")
  - `model`: Model used (e.g., "claude-sonnet-4-5")
- **Example**: `value: 0.0092643` ($0.0093)

### 2. Token Usage (`claude_code.token.usage`)
- **Unit**: tokens
- **Purpose**: Track token consumption
- **Data Points** (broken down by type):

  #### Input Tokens
  - Tokens in the prompt/request
  - Example: `value: 2`

  #### Output Tokens
  - Tokens in the response
  - Example: `value: 125`

  #### Cache Read Tokens
  - Tokens read from prompt cache (cheaper)
  - Example: `value: 24611`

  #### Cache Creation Tokens
  - Tokens written to prompt cache
  - Example: `value: 0`

### 3. Session Duration (`claude_code.session.duration`)
- **Unit**: milliseconds
- **Purpose**: Track session length
- **Attributes**: Similar to above

### 4. API Call Count (`claude_code.api.calls`)
- **Unit**: count
- **Purpose**: Track number of API requests
- **Attributes**: Similar to above

## Privacy & Data

### User ID
```javascript
'user.id': 'c326a92f7bdc36b0585854424e1f44b1e90592088b876925c4317fc471ea384d'
```
- This is a **SHA-256 hash**, not your actual user identifier
- Anonymized for privacy
- Used to aggregate metrics per user

### Session ID
```javascript
'session.id': 'cceb1911-52de-4abd-bcf3-4585dcc4f765'
```
- UUID for the specific conversation session
- Changes each session or when you use `--session-id`

### Terminal Type
```javascript
'terminal.type': 'vscode'
```
- Identifies the environment (VS Code, terminal, etc.)

## Time Format

Times are stored as high-resolution timestamps:
```javascript
startTime: [ 1769568247, 667000000 ]
         // [ seconds,    nanoseconds ]
```

This is a Node.js `process.hrtime()` format for precise timing.

## Example Full Output

```javascript
{
  descriptor: {
    name: 'claude_code.cost.usage',
    type: 'COUNTER',
    description: 'Cost of the Claude Code session',
    unit: 'USD',
    valueType: 1,
    advice: {}
  },
  dataPointType: 3,
  dataPoints: [
    {
      attributes: {
        'user.id': 'c326a92f7bdc36b0585854424e1f44b1e90592088b876925c4317fc471ea384d',
        'session.id': 'cceb1911-52de-4abd-bcf3-4585dcc4f765',
        'terminal.type': 'vscode',
        model: 'claude-sonnet-4-5'
      },
      startTime: [ 1769568247, 667000000 ],
      endTime: [ 1769568247, 728000000 ],
      value: 0.0092643
    }
  ]
}
```

## Why It's Not JSON

The telemetry uses **JavaScript object notation** with:
- Unquoted keys (`descriptor:` instead of `"descriptor":`)
- No outer array wrapper
- Multiple top-level objects

This is likely for:
1. **Console logging** - easier to read in terminal
2. **Internal tooling** - may be consumed by Node.js directly
3. **Size** - slightly more compact without quotes

## What We Do With It

In our UI implementation, we **filter this out** because:
1. It's not part of the JSON stream format
2. It appears after the session completes
3. The cost/usage data is already in the `result` message

The filtering logic skips:
- Lines containing `descriptor:`
- Lines containing `valueType:`
- Standalone braces `{` or `}`
- Invalid JSON that can't be parsed

This allows our UI to work cleanly without being confused by telemetry output.
