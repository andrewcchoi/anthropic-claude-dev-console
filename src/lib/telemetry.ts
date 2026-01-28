/**
 * Convert JavaScript object notation to JSON
 * Handles unquoted keys like: { descriptor: { name: 'foo' } }
 */
export function jsToJson(jsObjectStr: string): string {
  return jsObjectStr
    // Add quotes around unquoted keys
    .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
    // Convert single quotes to double quotes for string values
    .replace(/'([^'\\]*(\\.[^'\\]*)*)'/g, '"$1"');
}

/**
 * Parse telemetry buffer into array of metric objects
 */
export function parseTelemetry(buffer: string): any[] {
  const entries: any[] = [];

  // Split on top-level objects (each starts with { on its own line)
  const objectMatches = buffer.match(/\{[\s\S]*?^\}/gm);

  if (objectMatches) {
    for (const match of objectMatches) {
      try {
        const json = jsToJson(match);
        const parsed = JSON.parse(json);
        entries.push(parsed);
      } catch (e) {
        // Skip malformed entries
      }
    }
  }

  return entries;
}
