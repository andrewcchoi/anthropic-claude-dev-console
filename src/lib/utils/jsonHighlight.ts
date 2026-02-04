/**
 * JSON syntax highlighting utilities for terminal output
 * Adds ANSI color codes to JSON strings for xterm.js rendering
 */

// Use String.fromCharCode to ensure actual ESC byte (0x1B) at runtime
// Avoids bundler issues with \x1b escape sequences
const ESC = String.fromCharCode(0x1b);

const ANSI = {
  key: `${ESC}[36m`,      // cyan for keys
  string: `${ESC}[32m`,   // green for strings
  number: `${ESC}[33m`,   // yellow for numbers
  boolean: `${ESC}[35m`,  // magenta for booleans
  null: `${ESC}[90m`,     // gray for null
  bracket: `${ESC}[37m`,  // white for brackets
  reset: `${ESC}[0m`,
};

/**
 * Check if a string contains valid JSON
 */
export function isValidJson(str: string): boolean {
  if (!str || typeof str !== 'string') return false;

  const trimmed = str.trim();
  if (!trimmed) return false;

  // Quick check: must start with { or [
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return false;
  }

  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}

/**
 * Format JSON string with ANSI color codes for terminal highlighting
 * @param json - Valid JSON string
 * @returns JSON string with ANSI color codes
 */
export function formatJsonWithAnsi(json: string): string {
  if (!isValidJson(json)) {
    return json;
  }

  try {
    // Parse and re-stringify for consistent formatting
    const parsed = JSON.parse(json);
    const formatted = JSON.stringify(parsed, null, 2);

    // Apply ANSI color codes
    let result = formatted;

    // FIRST: Highlight brackets and braces (must be first to avoid corrupting other ANSI codes)
    result = result.replace(/([{}[\],])/g, `${ANSI.bracket}$1${ANSI.reset}`);

    // Highlight property keys (including quotes)
    result = result.replace(/"([^"]+)"(\s*):/g, (match, key, space) => {
      return `${ANSI.key}"${key}"${ANSI.reset}${space}:`;
    });

    // Highlight string values (excluding keys we already handled)
    result = result.replace(/:\s*"([^"]*)"/g, (match, value) => {
      return `: ${ANSI.string}"${value}"${ANSI.reset}`;
    });

    // Highlight numbers
    result = result.replace(/:\s*(-?\d+\.?\d*)/g, (match, num) => {
      return `: ${ANSI.number}${num}${ANSI.reset}`;
    });

    // Highlight booleans
    result = result.replace(/:\s*(true|false)/g, (match, bool) => {
      return `: ${ANSI.boolean}${bool}${ANSI.reset}`;
    });

    // Highlight null
    result = result.replace(/:\s*(null)/g, (match, nullVal) => {
      return `: ${ANSI.null}${nullVal}${ANSI.reset}`;
    });

    return result;
  } catch (error) {
    // Fallback to original if highlighting fails
    return json;
  }
}

/**
 * Check if content should be highlighted as JSON
 * Adds size check to avoid performance issues with very large JSON
 */
export function shouldHighlightAsJson(content: string, maxSize = 100 * 1024): boolean {
  if (!content || content.length > maxSize) {
    return false;
  }
  return isValidJson(content);
}
