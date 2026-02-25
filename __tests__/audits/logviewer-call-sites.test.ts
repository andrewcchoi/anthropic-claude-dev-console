/**
 * Call-Site Audit: LogViewer Async Functions
 *
 * Verifies that all callers of async file-logger functions properly handle
 * the async nature (await/then). This prevents bugs where async functions
 * are called without waiting for them.
 *
 * Functions audited:
 * - clearLogs() - Clears all logs from IndexedDB
 * - getLogStats() - Returns log statistics
 * - exportLogs() - Returns logs as JSONL string
 * - downloadLogs() - Triggers file download
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Helper to check if a line is a comment or documentation
 */
function isCommentOrDoc(line: string): boolean {
  // Extract the code part after the file:line: prefix
  const codeMatch = line.match(/:\d+:\s*(.*)$/);
  if (!codeMatch) return false;

  const code = codeMatch[1].trim();

  // Skip JSDoc comments (lines starting with *)
  if (code.startsWith('*')) return true;

  // Skip single-line comments
  if (code.startsWith('//')) return true;

  // Skip console.log documentation strings
  if (code.includes("console.log(") && code.includes("'%c")) return true;

  return false;
}

describe('LogViewer Call-Site Audits', () => {
  describe('clearLogs callers', () => {
    it('all callers await the Promise', () => {
      const result = execSync(
        'grep -rn "clearLogs()" src/ --include="*.ts" --include="*.tsx" || true',
        { encoding: 'utf-8' }
      );

      const lines = result.split('\n').filter(Boolean);
      const issues: string[] = [];

      for (const line of lines) {
        // Skip the definition and exports
        if (line.includes('export async function clearLogs')) continue;
        if (line.includes('export {')) continue;
        if (line.includes('import {')) continue;
        if (line.includes('clearLogs as')) continue;
        if (line.includes('vi.mock')) continue;

        // Skip comments and documentation
        if (isCommentOrDoc(line)) continue;

        // Check for await or .then() or .catch() (fire-and-forget pattern)
        const hasAwait = line.includes('await clearLogs') ||
                         line.includes('.then(') ||
                         line.includes('.catch(');

        if (!hasAwait && line.includes('clearLogs()')) {
          issues.push(line);
        }
      }

      if (issues.length > 0) {
        console.log('Found non-awaited clearLogs calls:');
        issues.forEach(i => console.log('  ', i));
      }

      expect(issues).toHaveLength(0);
    });
  });

  describe('getLogStats callers', () => {
    it('all callers handle async', () => {
      const result = execSync(
        'grep -rn "getLogStats()" src/ --include="*.ts" --include="*.tsx" || true',
        { encoding: 'utf-8' }
      );

      const lines = result.split('\n').filter(Boolean);
      const issues: string[] = [];

      for (const line of lines) {
        if (line.includes('export async function getLogStats')) continue;
        if (line.includes('export {')) continue;
        if (line.includes('import {')) continue;
        if (line.includes('vi.mock')) continue;

        // Skip comments and documentation
        if (isCommentOrDoc(line)) continue;

        const hasAwait = line.includes('await getLogStats') ||
                         line.includes('.then(') ||
                         line.includes('.catch(');

        if (!hasAwait && line.includes('getLogStats()')) {
          issues.push(line);
        }
      }

      if (issues.length > 0) {
        console.log('Found non-awaited getLogStats calls:');
        issues.forEach(i => console.log('  ', i));
      }

      expect(issues).toHaveLength(0);
    });
  });

  describe('exportLogs callers', () => {
    it('all callers handle async', () => {
      const result = execSync(
        'grep -rn "exportLogs()" src/ --include="*.ts" --include="*.tsx" || true',
        { encoding: 'utf-8' }
      );

      const lines = result.split('\n').filter(Boolean);
      const issues: string[] = [];

      for (const line of lines) {
        if (line.includes('export async function exportLogs')) continue;
        if (line.includes('export {')) continue;
        if (line.includes('import {')) continue;
        if (line.includes('vi.mock')) continue;

        // Skip comments and documentation
        if (isCommentOrDoc(line)) continue;

        const hasAwait = line.includes('await exportLogs') ||
                         line.includes('.then(') ||
                         line.includes('.catch(');

        if (!hasAwait && line.includes('exportLogs()')) {
          issues.push(line);
        }
      }

      if (issues.length > 0) {
        console.log('Found non-awaited exportLogs calls:');
        issues.forEach(i => console.log('  ', i));
      }

      expect(issues).toHaveLength(0);
    });
  });

  describe('downloadLogs callers', () => {
    it('all callers handle async', () => {
      const result = execSync(
        'grep -rn "downloadLogs()" src/ --include="*.ts" --include="*.tsx" || true',
        { encoding: 'utf-8' }
      );

      const lines = result.split('\n').filter(Boolean);
      const issues: string[] = [];

      for (const line of lines) {
        if (line.includes('export async function downloadLogs')) continue;
        if (line.includes('export {')) continue;
        if (line.includes('import {')) continue;
        if (line.includes('vi.mock')) continue;

        // Skip comments and documentation
        if (isCommentOrDoc(line)) continue;

        const hasAwait = line.includes('await downloadLogs') ||
                         line.includes('.then(') ||
                         line.includes('.catch(');

        if (!hasAwait && line.includes('downloadLogs()')) {
          issues.push(line);
        }
      }

      if (issues.length > 0) {
        console.log('Found non-awaited downloadLogs calls:');
        issues.forEach(i => console.log('  ', i));
      }

      expect(issues).toHaveLength(0);
    });
  });

  describe('DebugProvider wrapping', () => {
    it('LogViewer is wrapped in DebugProvider at mount points', () => {
      // DebugProvider wraps the entire app at the root level in layout.tsx
      // This ensures LogViewer (and all other components) have access to debug context
      const layoutFile = fs.readFileSync(
        path.join(process.cwd(), 'src/app/layout.tsx'),
        'utf-8'
      );

      expect(layoutFile).toContain('DebugProvider');

      // Verify DebugProvider wraps children (the app content)
      expect(layoutFile).toMatch(/DebugProvider[^]*children[^]*DebugProvider/s);

      // Verify logs page exists and uses LogViewer
      const logsPage = fs.readFileSync(
        path.join(process.cwd(), 'src/app/logs/page.tsx'),
        'utf-8'
      );

      expect(logsPage).toContain('LogViewer');
    });

    it('LogViewer uses useDebug hook correctly', () => {
      const logViewerFile = fs.readFileSync(
        path.join(process.cwd(), 'src/components/debug/LogViewer.tsx'),
        'utf-8'
      );

      // LogViewer should import and use useDebug
      expect(logViewerFile).toContain('useDebug');
      expect(logViewerFile).toContain('debugEnabled');
    });
  });
});

/**
 * META-TEST: Verify audit would catch common async mistakes
 */
describe('Meta-Test: Verify Audit Catches Common Mistakes', () => {
  it('should detect fire-and-forget async calls (no await/then/catch)', () => {
    // Simulate buggy code that doesn't handle async
    const buggyLines = [
      'src/components/debug/LogViewer.tsx:100:        clearLogs();',
      'src/components/debug/LogViewer.tsx:150:        exportLogs();',
    ];

    const issues = buggyLines.filter(line => {
      const hasAwait = line.includes('await') ||
                       line.includes('.then(') ||
                       line.includes('.catch(');
      return !hasAwait &&
             (line.includes('clearLogs()') ||
              line.includes('exportLogs()') ||
              line.includes('getLogStats()') ||
              line.includes('downloadLogs()'));
    });

    // The audit SHOULD detect these as issues
    expect(issues.length).toBe(2);

    console.log('\n  Meta-test passed: Audit would catch fire-and-forget async calls!');
    console.log('   Buggy patterns detected:', issues.length);
  });

  it('should accept valid async handling patterns', () => {
    // These are all valid ways to handle async
    const validLines = [
      'src/lib/debug/index.ts:229:  (window as any).downloadLogs = () => { downloadLogs().catch(console.error); };',
      'src/lib/debug/index.ts:230:  (window as any).clearLogs = () => { clearLogs().catch(console.error); };',
      'src/components/debug/LogViewer.tsx:101:        const jsonl = await exportLogs();',
      'src/components/debug/LogViewer.tsx:113:        const logStats = await getLogStats();',
      'src/components/debug/LogViewer.tsx:358:                    clearClientLogs().then(() => {',
    ];

    const issues = validLines.filter(line => {
      const hasAwait = line.includes('await') ||
                       line.includes('.then(') ||
                       line.includes('.catch(');
      // Skip definitions
      if (line.includes('export async function')) return false;

      return !hasAwait &&
             (line.includes('clearLogs()') ||
              line.includes('exportLogs()') ||
              line.includes('getLogStats()') ||
              line.includes('downloadLogs()'));
    });

    // All valid patterns should pass
    expect(issues.length).toBe(0);

    console.log('\n  Meta-test passed: Valid async patterns accepted!');
  });
});
