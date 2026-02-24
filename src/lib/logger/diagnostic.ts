/**
 * Diagnostic Logger - Self-documenting errors with resolution guidance
 *
 * Features:
 * - Automatic stack traces
 * - Context capture (component state, props, etc.)
 * - Resolution suggestions
 * - Error categorization
 * - Regression test generation hints
 */

import { createLogger } from './index';

// Error categories with resolution guidance
const ERROR_CATEGORIES = {
  TYPE_MISMATCH: {
    code: 'E001',
    description: 'Type mismatch between expected and actual value',
    commonCauses: [
      'UUID used where encoded path expected (or vice versa)',
      'String used where number expected',
      'Object property missing or renamed',
    ],
    resolutionSteps: [
      'Check the types of both values being compared',
      'Use typeof or instanceof to verify types',
      'Check if a conversion function is needed (e.g., encodeProjectPath)',
    ],
  },
  NOT_FOUND: {
    code: 'E002',
    description: 'Expected item not found in collection',
    commonCauses: [
      'Item was deleted or never created',
      'Wrong ID used for lookup',
      'Collection not yet populated (race condition)',
    ],
    resolutionSteps: [
      'Log the collection contents and the lookup key',
      'Check if the item exists with a different ID format',
      'Verify the collection is populated before lookup',
    ],
  },
  STATE_INVALID: {
    code: 'E003',
    description: 'Component or store in invalid state',
    commonCauses: [
      'State updated out of order',
      'Missing initialization',
      'Stale closure capturing old state',
    ],
    resolutionSteps: [
      'Add state validation at entry points',
      'Check useEffect dependency arrays',
      'Use functional updates for state that depends on previous state',
    ],
  },
  NETWORK_ERROR: {
    code: 'E004',
    description: 'Network request failed',
    commonCauses: [
      'Server not running',
      'Wrong endpoint URL',
      'CORS issue',
      'Request timeout',
    ],
    resolutionSteps: [
      'Check if server is running (npm run dev)',
      'Verify the endpoint URL is correct',
      'Check browser Network tab for details',
      'Look for CORS errors in console',
    ],
  },
  RENDER_ERROR: {
    code: 'E005',
    description: 'Component failed to render',
    commonCauses: [
      'Undefined prop accessed',
      'Hook called conditionally',
      'Infinite re-render loop',
    ],
    resolutionSteps: [
      'Check all props are defined before use',
      'Verify hooks are called unconditionally',
      'Check useEffect dependencies for missing items',
    ],
  },
};

type ErrorCategory = keyof typeof ERROR_CATEGORIES;

interface DiagnosticContext {
  component?: string;
  action?: string;
  props?: Record<string, unknown>;
  state?: Record<string, unknown>;
  expected?: unknown;
  actual?: unknown;
  [key: string]: unknown;
}

interface DiagnosticError {
  category: ErrorCategory;
  message: string;
  context: DiagnosticContext;
  timestamp: string;
  stackTrace: string;
  resolution: typeof ERROR_CATEGORIES[ErrorCategory];
  testHint: string;
}

/**
 * Create a diagnostic error with full context and resolution guidance
 */
export function createDiagnosticError(
  category: ErrorCategory,
  message: string,
  context: DiagnosticContext = {}
): DiagnosticError {
  const error = new Error(message);
  const stackTrace = error.stack || 'No stack trace available';

  const resolution = ERROR_CATEGORIES[category];

  // Generate test hint based on context
  const testHint = generateTestHint(category, message, context);

  return {
    category,
    message,
    context,
    timestamp: new Date().toISOString(),
    stackTrace,
    resolution,
    testHint,
  };
}

/**
 * Generate a hint for creating a regression test
 */
function generateTestHint(
  category: ErrorCategory,
  message: string,
  context: DiagnosticContext
): string {
  const hints: string[] = [
    `// Regression test for: ${message}`,
    `// Category: ${category} (${ERROR_CATEGORIES[category].code})`,
    '',
    `it('should not regress: ${message}', () => {`,
  ];

  if (context.expected !== undefined && context.actual !== undefined) {
    hints.push(`  // Expected: ${JSON.stringify(context.expected)}`);
    hints.push(`  // Actual: ${JSON.stringify(context.actual)}`);
    hints.push(`  expect(actualValue).toBe(expectedValue);`);
  }

  if (context.component) {
    hints.push(`  // Component: ${context.component}`);
  }

  if (context.action) {
    hints.push(`  // Action that triggered: ${context.action}`);
  }

  hints.push(`});`);

  return hints.join('\n');
}

/**
 * Log a diagnostic error with full context
 */
export function logDiagnosticError(
  module: string,
  category: ErrorCategory,
  message: string,
  context: DiagnosticContext = {}
): DiagnosticError {
  const log = createLogger(module);
  const diagnostic = createDiagnosticError(category, message, context);

  // Log the error with full details
  console.error('\n' + '='.repeat(70));
  console.error(`🔴 DIAGNOSTIC ERROR [${diagnostic.resolution.code}]`);
  console.error('='.repeat(70));
  console.error(`Category: ${category}`);
  console.error(`Message: ${message}`);
  console.error(`Time: ${diagnostic.timestamp}`);
  console.error('');

  // Log context
  if (Object.keys(context).length > 0) {
    console.error('📋 Context:');
    Object.entries(context).forEach(([key, value]) => {
      console.error(`  ${key}: ${JSON.stringify(value, null, 2)}`);
    });
    console.error('');
  }

  // Log resolution guidance
  console.error('🔧 Resolution Guidance:');
  console.error(`  Description: ${diagnostic.resolution.description}`);
  console.error('');
  console.error('  Common Causes:');
  diagnostic.resolution.commonCauses.forEach((cause, i) => {
    console.error(`    ${i + 1}. ${cause}`);
  });
  console.error('');
  console.error('  Resolution Steps:');
  diagnostic.resolution.resolutionSteps.forEach((step, i) => {
    console.error(`    ${i + 1}. ${step}`);
  });
  console.error('');

  // Log stack trace
  console.error('📍 Stack Trace:');
  console.error(diagnostic.stackTrace.split('\n').slice(0, 10).join('\n'));
  console.error('');

  // Log test hint
  console.error('🧪 Regression Test Hint:');
  console.error(diagnostic.testHint);
  console.error('');
  console.error('='.repeat(70) + '\n');

  // Also log to structured logger
  log.error(message, {
    category,
    code: diagnostic.resolution.code,
    context,
  });

  return diagnostic;
}

/**
 * Assert with diagnostic logging on failure
 */
export function diagnosticAssert(
  condition: boolean,
  module: string,
  category: ErrorCategory,
  message: string,
  context: DiagnosticContext = {}
): void {
  if (!condition) {
    logDiagnosticError(module, category, message, context);
  }
}

/**
 * Wrap a function with diagnostic error handling
 */
export function withDiagnostics<T extends (...args: unknown[]) => unknown>(
  fn: T,
  module: string,
  context: DiagnosticContext = {}
): T {
  return ((...args: unknown[]) => {
    try {
      return fn(...args);
    } catch (error) {
      logDiagnosticError(module, 'STATE_INVALID', String(error), {
        ...context,
        args,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }) as T;
}

// Export error categories for external use
export { ERROR_CATEGORIES };
export type { ErrorCategory, DiagnosticContext, DiagnosticError };
