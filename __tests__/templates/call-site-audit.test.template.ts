/**
 * Call-Site Audit Test Template
 * Layer 5: Automated verification that all callers of modified functions are updated
 *
 * THIS IS THE MISSING TEST THAT WOULD HAVE CAUGHT THE BUG
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { glob } from 'glob';

/**
 * Helper: Find all call sites of a function in the codebase
 */
async function grepCallSites(
  functionName: string,
  options: {
    exclude?: string[];
    includeTests?: boolean;
  } = {}
): Promise<Array<{ file: string; line: number; code: string }>> {
  const { exclude = ['node_modules', '.git', 'dist', 'build'], includeTests = false } = options;

  // Find all TypeScript/TSX files
  const pattern = includeTests
    ? 'src/**/*.{ts,tsx}'
    : 'src/**/!(*test|*spec).{ts,tsx}';

  const files = await glob(pattern, {
    ignore: exclude.map(dir => `**/${dir}/**`),
    cwd: process.cwd(),
    absolute: true,
  });

  const callSites: Array<{ file: string; line: number; code: string }> = [];

  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Look for function calls (not definitions)
      const callRegex = new RegExp(`${functionName}\\s*\\(`);

      if (callRegex.test(line)) {
        // Exclude function definitions
        if (!line.includes('function ') && !line.includes('const ') && !line.includes('export ')) {
          callSites.push({
            file: file.replace(process.cwd(), ''),
            line: i + 1,
            code: line.trim(),
          });
        }
      }
    }
  }

  return callSites;
}

/**
 * Helper: Read code around a call site for context
 */
async function readCallSiteContext(
  file: string,
  line: number,
  contextLines: number = 2
): Promise<string> {
  const content = await fs.readFile(join(process.cwd(), file), 'utf-8');
  const lines = content.split('\n');

  const start = Math.max(0, line - contextLines - 1);
  const end = Math.min(lines.length, line + contextLines);

  return lines.slice(start, end).join('\n');
}

describe('[FunctionName] Call-Site Audit (Layer 5)', () => {
  it('should find all call sites in the codebase', async () => {
    const callSites = await grepCallSites('[functionName]');

    // Expected call sites (update this list when adding new callers)
    const expectedFiles = [
      '/src/components/[Component1].tsx',
      '/src/components/[Component2].tsx',
      '/src/hooks/[Hook].ts',
      // ... list all files that call this function
    ];

    // Verify we found all expected files
    const foundFiles = callSites.map(site => site.file);
    for (const expected of expectedFiles) {
      expect(foundFiles).toContain(expected);
    }

    // Verify we didn't miss any new callers
    expect(callSites).toHaveLength(expectedFiles.length);
  });

  it('should verify all call sites pass required parameters', async () => {
    const callSites = await grepCallSites('[functionName]');

    for (const site of callSites) {
      const context = await readCallSiteContext(site.file, site.line);

      // CRITICAL: Verify parameter count
      // Adjust regex based on expected parameter count
      const twoParamRegex = /[functionName]\s*\(\s*[^,)]+\s*,\s*[^)]+\s*\)/;

      expect(context).toMatch(twoParamRegex);
      // ↑ This would have caught the missing projectId parameter!
    }
  });

  it('should verify parameter types are correct', async () => {
    const callSites = await grepCallSites('[functionName]');

    for (const site of callSites) {
      const context = await readCallSiteContext(site.file, site.line, 5);

      // Look for type hints or variable declarations
      // Example: session.workspaceId should be passed as second param

      if (context.includes('.workspaceId')) {
        // Verify workspaceId is passed to the function
        expect(site.code).toMatch(/[functionName]\([^,]+,\s*\w+\.workspaceId/);
      }
    }
  });

  it('should verify no call sites use hardcoded defaults', async () => {
    const callSites = await grepCallSites('[functionName]');

    for (const site of callSites) {
      // Check for anti-patterns like:
      // - switchSession(id, undefined)
      // - switchSession(id, null)
      // - switchSession(id, '-workspace') // hardcoded default

      expect(site.code).not.toMatch(/[functionName]\([^,]+,\s*(undefined|null)\s*\)/);
      expect(site.code).not.toMatch(/[functionName]\([^,]+,\s*['"]-workspace['"]\s*\)/);
    }
  });

  it('should document all call sites for manual review', async () => {
    const callSites = await grepCallSites('[functionName]');

    console.log('\n📋 Call-Site Audit Report');
    console.log('='.repeat(60));
    console.log(`Function: [functionName]`);
    console.log(`Call sites found: ${callSites.length}\n`);

    for (const site of callSites) {
      console.log(`📄 ${site.file}:${site.line}`);
      console.log(`   ${site.code}\n`);
    }

    // This test always passes - it's for documentation
    expect(callSites.length).toBeGreaterThan(0);
  });
});

/**
 * REAL EXAMPLE: The Bug That Motivated This
 *
 * This is what the actual test would have looked like:
 */
describe('switchSession Call-Site Audit (Real Example)', () => {
  it('should verify all switchSession calls pass projectId', async () => {
    const callSites = await grepCallSites('switchSession', {
      exclude: ['node_modules', '__tests__'],
    });

    // Expected call sites
    const expected = [
      '/src/components/sidebar/SessionList.tsx',
      '/src/components/sidebar/UISessionItem.tsx',
      '/src/components/sidebar/ProjectList.tsx',
      '/src/components/sidebar/SessionItem.tsx',
    ];

    expect(callSites.length).toBeGreaterThanOrEqual(expected.length);

    // Verify each call passes TWO parameters
    for (const site of callSites) {
      const context = await readCallSiteContext(site.file, site.line, 3);

      // Should match: switchSession(arg1, arg2)
      // NOT: switchSession(arg1)
      expect(context).toMatch(/switchSession\s*\(\s*[^,)]+\s*,\s*[^)]+\s*\)/);

      // If we're in a component with session.workspaceId, it should be passed
      if (context.includes('session.workspaceId')) {
        expect(site.code).toMatch(/switchSession\([^,]+,\s*session\.workspaceId/);
      }

      // If we're in a component with project.id, it should be passed
      if (context.includes('project.id')) {
        expect(site.code).toMatch(/switchSession\([^,]+,\s*project\.id/);
      }
    }
  });
});
