/**
 * Call-Site Audit: switchSession
 *
 * THIS IS THE TEST THAT WOULD HAVE CAUGHT THE BUG
 *
 * v1.0: Parameter COUNT validation
 * The projectId bug happened because switchSession() was called without
 * the projectId parameter in 5 locations. This test would have caught all 5.
 *
 * v1.1: Parameter TYPE validation (NEW)
 * The UUID vs projectId bug happened because workspace UUID was passed where
 * project ID (encoded path) was expected. Now we validate parameter TYPES too.
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';
import {
  findCallSites,
  readCallSiteContext,
  checkTypePatterns,
  SWITCH_SESSION_TYPE_PATTERNS,
} from './type-validators';

/**
 * Helper: Recursively find all TS/TSX files
 */
async function findFiles(dir: string, pattern: RegExp): Promise<string[]> {
  const results: string[] = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '__tests__' && entry.name !== 'dist') {
        results.push(...await findFiles(fullPath, pattern));
      } else if (entry.isFile() && pattern.test(entry.name) && !entry.name.includes('.test.')) {
        results.push(fullPath);
      }
    }
  } catch (error) {
    // Skip directories we can't read
  }

  return results;
}

/**
 * Helper: Find all call sites of switchSession in the codebase
 */
async function findSwitchSessionCallSites(): Promise<
  Array<{ file: string; line: number; code: string }>
> {
  const files = await findFiles('src', /\.(ts|tsx)$/);

  const callSites: Array<{ file: string; line: number; code: string }> = [];

  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Look for switchSession calls (not definitions)
      if (
        line.includes('switchSession(') &&
        !line.includes('function switchSession') &&
        !line.includes('const switchSession') &&
        !line.includes('switchSession:') &&
        !line.trim().startsWith('//')
      ) {
        callSites.push({
          file: file.replace(process.cwd() + '/', ''),
          line: i + 1,
          code: line.trim(),
        });
      }
    }
  }

  return callSites;
}

/**
 * Helper: Extract parameters from a function call
 */
function extractParameters(code: string): number {
  const match = code.match(/switchSession\s*\(([^)]*)\)/);
  if (!match) return 0;

  const params = match[1];
  if (params.trim() === '') return 0;

  // Count parameters (simple comma split, doesn't handle nested parens perfectly)
  return params.split(',').filter(p => p.trim()).length;
}

describe('switchSession Call-Site Audit', () => {
  it('should find all switchSession call sites in the codebase', async () => {
    const callSites = await findSwitchSessionCallSites();

    // Log all call sites for review
    console.log('\n📋 switchSession Call Sites Found:');
    console.log('='.repeat(60));

    for (const site of callSites) {
      const paramCount = extractParameters(site.code);
      const status = paramCount >= 2 ? '✅' : '❌';
      console.log(`${status} ${site.file}:${site.line}`);
      console.log(`   ${site.code}`);
      console.log(`   Parameters: ${paramCount}\n`);
    }

    console.log('='.repeat(60));
    console.log(`Total call sites: ${callSites.length}\n`);

    // Must have at least some call sites
    expect(callSites.length).toBeGreaterThan(0);
  });

  it('should verify all call sites pass BOTH parameters (sessionId AND projectId)', async () => {
    const callSites = await findSwitchSessionCallSites();

    const failures: Array<{ file: string; line: number; code: string; reason: string }> = [];

    for (const site of callSites) {
      const paramCount = extractParameters(site.code);

      // switchSession requires 2 parameters: (sessionId, projectId)
      if (paramCount < 2) {
        failures.push({
          ...site,
          reason: `Missing parameter - found ${paramCount}, expected 2`,
        });
      }

      // Check for explicit undefined or null as second parameter
      if (site.code.includes('switchSession(') && site.code.match(/switchSession\([^,]+,\s*(undefined|null)\s*\)/)) {
        failures.push({
          ...site,
          reason: 'Second parameter is undefined or null',
        });
      }
    }

    // Report failures
    if (failures.length > 0) {
      console.error('\n❌ Call-Site Audit FAILED\n');
      console.error('The following call sites are missing the projectId parameter:\n');

      for (const failure of failures) {
        console.error(`  ${failure.file}:${failure.line}`);
        console.error(`    ${failure.code}`);
        console.error(`    ⚠️  ${failure.reason}\n`);
      }

      console.error('To fix:');
      console.error('  1. Add projectId as second parameter to each call');
      console.error('  2. Example: switchSession(sessionId, session.workspaceId)');
      console.error('  3. Or: switchSession(sessionId, project.id)\n');
    }

    // Assert no failures
    expect(failures).toHaveLength(0);
  });

  it('should verify no call sites use hardcoded workspace IDs', async () => {
    const callSites = await findSwitchSessionCallSites();

    const hardcodedCalls = callSites.filter(site =>
      site.code.match(/switchSession\([^,]+,\s*['"]-workspace['"]\s*\)/)
    );

    if (hardcodedCalls.length > 0) {
      console.error('\n⚠️  Warning: Hardcoded workspace IDs found:\n');
      for (const call of hardcodedCalls) {
        console.error(`  ${call.file}:${call.line}`);
        console.error(`    ${call.code}\n`);
      }
    }

    expect(hardcodedCalls).toHaveLength(0);
  });

  it('should document expected call sites for regression tracking', async () => {
    const callSites = await findSwitchSessionCallSites();

    // Known call sites (update this list when adding new callers)
    const knownFiles = [
      'src/components/sidebar/SessionList.tsx',
      'src/components/sidebar/SessionItem.tsx',
      'src/components/sidebar/UISessionItem.tsx',
      'src/components/sidebar/ProjectList.tsx',
    ];

    const foundFiles = new Set(callSites.map(site => site.file));

    // Check if we have calls from expected files
    for (const expectedFile of knownFiles) {
      if (!foundFiles.has(expectedFile)) {
        console.warn(`⚠️  Expected call site not found: ${expectedFile}`);
      }
    }

    // Check if we have NEW call sites not in the known list
    for (const foundFile of foundFiles) {
      if (!knownFiles.includes(foundFile)) {
        console.log(`ℹ️  New call site detected: ${foundFile}`);
        console.log('   Consider adding to knownFiles list for tracking');
      }
    }

    // This test documents call sites, doesn't fail
    expect(callSites.length).toBeGreaterThan(0);
  });
});

/**
 * META-TEST: Verify this audit would have caught the original bug
 *
 * This test simulates the bug scenario to prove the audit works
 */
describe('Meta-Test: Verify Audit Catches The Bug', () => {
  it('should catch missing projectId parameter (the actual bug)', () => {
    // Simulate the buggy code that was committed
    const buggyCallSites = [
      {
        file: 'src/components/sidebar/SessionList.tsx',
        line: 259,
        code: 'onClick={() => switchSession(session.id)}',
      },
      {
        file: 'src/components/sidebar/SessionList.tsx',
        line: 76,
        code: 'switchSession(session.id);',
      },
    ];

    const failures = buggyCallSites.filter(site => {
      const paramCount = extractParameters(site.code);
      return paramCount < 2;
    });

    // The audit SHOULD detect these as failures
    expect(failures.length).toBe(2);

    console.log('\n✅ Meta-test passed: Audit would have caught the bug!');
    console.log('   Original bug: 5 call sites missing projectId');
    console.log('   This audit detected: 2 example call sites\n');
  });
});

/**
 * TYPE VALIDATION AUDIT (v1.1)
 *
 * These tests catch parameter TYPE mismatches, not just count.
 * The UUID vs projectId bug would have been caught by these tests.
 */
describe('switchSession Type Validation Audit', () => {
  it('should detect no UUID passed as projectId parameter', async () => {
    const callSites = await findCallSites('switchSession');

    const typeIssues: Array<{
      file: string;
      line: number;
      code: string;
      pattern: string;
      suggestion: string;
    }> = [];

    for (const site of callSites) {
      // Get more context to understand the call better
      const context = await readCallSiteContext(site.file, site.line, 5);
      const fullContext = [
        ...context.contextBefore,
        context.code,
        ...context.contextAfter,
      ].join('\n');

      // Check for type confusion patterns
      const matchedPatterns = checkTypePatterns(site.code, SWITCH_SESSION_TYPE_PATTERNS);

      for (const pattern of matchedPatterns) {
        typeIssues.push({
          file: site.file,
          line: site.line,
          code: site.code,
          pattern: `Expected ${pattern.expectedType}, found ${pattern.actualType}`,
          suggestion: pattern.suggestion,
        });
      }
    }

    // Report issues
    if (typeIssues.length > 0) {
      console.error('\n❌ TYPE AUDIT FAILED\n');
      console.error('The following call sites have parameter TYPE mismatches:\n');

      for (const issue of typeIssues) {
        console.error(`  ${issue.file}:${issue.line}`);
        console.error(`    ${issue.code}`);
        console.error(`    ⚠️  ${issue.pattern}`);
        console.error(`    💡 ${issue.suggestion}\n`);
      }

      console.error('Common fix:');
      console.error('  Use getProjectIdFromWorkspace(workspaceId, workspaces) to convert UUID to project ID');
      console.error('  Or use project.id directly if available\n');
    }

    expect(typeIssues).toHaveLength(0);
  });

  it('should verify projectId parameter looks like encoded path, not UUID', async () => {
    const callSites = await findCallSites('switchSession');

    // UUID pattern to detect
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

    const uuidAsProjectId: Array<{
      file: string;
      line: number;
      code: string;
      context: string;
    }> = [];

    for (const site of callSites) {
      // Extract second parameter
      const match = site.code.match(/switchSession\s*\(\s*[^,]+,\s*([^)]+)\s*\)/);
      if (!match) continue;

      const secondParam = match[1].trim();

      // Check if it's a string literal that looks like a UUID
      const stringMatch = secondParam.match(/['"]([^'"]+)['"]/);
      if (stringMatch && uuidPattern.test(stringMatch[1])) {
        uuidAsProjectId.push({
          file: site.file,
          line: site.line,
          code: site.code,
          context: `Literal UUID in code: ${stringMatch[1]}`,
        });
      }
    }

    if (uuidAsProjectId.length > 0) {
      console.error('\n❌ UUID AS PROJECT ID DETECTED\n');
      for (const issue of uuidAsProjectId) {
        console.error(`  ${issue.file}:${issue.line}`);
        console.error(`    ${issue.code}`);
        console.error(`    ⚠️  ${issue.context}\n`);
      }
    }

    expect(uuidAsProjectId).toHaveLength(0);
  });
});

/**
 * META-TEST: Verify type audit would have caught the UUID bug
 */
describe('Meta-Test: Verify Type Audit Catches UUID Bug', () => {
  it('should catch workspaceId passed as projectId (the UUID bug)', () => {
    // Simulate the buggy code that was committed
    const buggyCallSites = [
      {
        file: 'src/components/sidebar/SessionList.tsx',
        line: 132,
        code: 'switchSession(session.id, workspaceId);',
      },
      {
        file: 'src/components/sidebar/UISessionItem.tsx',
        line: 49,
        code: 'await switchSession(session.id, workspace.id)',
      },
    ];

    const typeIssues = buggyCallSites.filter(site =>
      checkTypePatterns(site.code, SWITCH_SESSION_TYPE_PATTERNS).length > 0
    );

    // The audit SHOULD detect these as failures
    expect(typeIssues.length).toBe(2);

    console.log('\n✅ Meta-test passed: Type audit would have caught the UUID bug!');
    console.log('   Original bug: workspace UUID passed instead of project ID');
    console.log('   This audit detected: 2 example call sites with type mismatch\n');
  });

  it('should NOT flag correct usage with project.id', () => {
    // These are correct - using project.id (encoded path)
    const correctCallSites = [
      {
        file: 'src/components/sidebar/SessionList.tsx',
        line: 132,
        code: 'switchSession(session.id, project.id);',
      },
      {
        file: 'src/components/sidebar/ProjectList.tsx',
        line: 109,
        code: 'await switchSession(sessionToActivate, project.id);',
      },
    ];

    const typeIssues = correctCallSites.filter(site =>
      checkTypePatterns(site.code, SWITCH_SESSION_TYPE_PATTERNS).length > 0
    );

    // Should NOT detect any issues
    expect(typeIssues).toHaveLength(0);

    console.log('\n✅ Meta-test passed: Correct usage not flagged as error\n');
  });
});
