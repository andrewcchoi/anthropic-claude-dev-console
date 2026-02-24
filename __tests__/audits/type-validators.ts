/**
 * Shared audit helpers for type-aware call-site validation
 *
 * These helpers are used by call-site audit tests to verify that:
 * 1. Function parameters have correct count
 * 2. Function parameters have correct types (e.g., projectId vs workspaceId)
 *
 * The UUID vs encoded path bug showed that checking parameter COUNT is not enough.
 * We also need to check parameter TYPE.
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { UUID_REGEX, PROJECT_ID_REGEX, isUUID, isProjectId } from '../../src/lib/utils/typeValidators';

export interface CallSite {
  file: string;
  line: number;
  code: string;
}

export interface CallSiteWithContext extends CallSite {
  contextBefore: string[];
  contextAfter: string[];
}

/**
 * Recursively find all TypeScript/TSX files in a directory
 * Excludes node_modules, __tests__, and dist directories
 */
export async function findSourceFiles(dir: string, pattern: RegExp = /\.(ts|tsx)$/): Promise<string[]> {
  const results: string[] = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip non-source directories
        if (['node_modules', '__tests__', 'dist', '.next', '.git'].includes(entry.name)) {
          continue;
        }
        results.push(...await findSourceFiles(fullPath, pattern));
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
 * Find all call sites of a function in the codebase
 * @param functionName - Name of the function to find
 * @param srcDir - Source directory to search (default: 'src')
 */
export async function findCallSites(functionName: string, srcDir: string = 'src'): Promise<CallSite[]> {
  const files = await findSourceFiles(srcDir);
  const callSites: CallSite[] = [];

  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Look for function calls (not definitions)
      const callPattern = new RegExp(`${functionName}\\s*\\(`);
      const definitionPatterns = [
        new RegExp(`function\\s+${functionName}`),
        new RegExp(`const\\s+${functionName}\\s*=`),
        new RegExp(`${functionName}\\s*:`),  // Object property
      ];

      if (callPattern.test(line)) {
        // Exclude definitions
        const isDefinition = definitionPatterns.some(p => p.test(line));
        // Exclude comments
        const isComment = line.trim().startsWith('//') || line.trim().startsWith('*');

        if (!isDefinition && !isComment) {
          callSites.push({
            file: file.replace(process.cwd() + '/', ''),
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
 * Read context around a call site
 * @param file - File path
 * @param lineNumber - Line number (1-indexed)
 * @param contextLines - Number of lines before/after to include
 */
export async function readCallSiteContext(
  file: string,
  lineNumber: number,
  contextLines: number = 10
): Promise<CallSiteWithContext> {
  const content = await fs.readFile(file, 'utf-8');
  const lines = content.split('\n');

  const startLine = Math.max(0, lineNumber - 1 - contextLines);
  const endLine = Math.min(lines.length, lineNumber + contextLines);

  return {
    file,
    line: lineNumber,
    code: lines[lineNumber - 1]?.trim() || '',
    contextBefore: lines.slice(startLine, lineNumber - 1),
    contextAfter: lines.slice(lineNumber, endLine),
  };
}

/**
 * Extract the full function call, handling multi-line calls
 * @param lines - All lines of the file
 * @param startLine - Line where the call starts (0-indexed)
 */
export function extractFullCall(lines: string[], startLine: number): string {
  let call = '';
  let parenDepth = 0;
  let started = false;

  for (let i = startLine; i < lines.length && i < startLine + 20; i++) {
    const line = lines[i];

    for (const char of line) {
      if (char === '(') {
        started = true;
        parenDepth++;
      }
      if (started) {
        call += char;
      }
      if (char === ')') {
        parenDepth--;
        if (parenDepth === 0 && started) {
          return call;
        }
      }
    }
    if (started) {
      call += '\n';
    }
  }

  return call;
}

/**
 * Check if code contains a UUID literal
 * Used to detect when a workspace ID (UUID) is passed where a project ID is expected
 */
export function containsUUIDLiteral(code: string): boolean {
  // Look for UUID pattern in string literals or variable references that look like UUIDs
  return UUID_REGEX.test(code);
}

/**
 * Check if code contains a project ID literal
 */
export function containsProjectIdLiteral(code: string): boolean {
  // Look for project ID pattern (starts with - but not a UUID)
  const projectIdMatch = code.match(/['"](-[\w-]+)['"]/);
  if (!projectIdMatch) return false;
  // Make sure it's not a UUID
  return !UUID_REGEX.test(projectIdMatch[1]);
}

/**
 * Analyze a switchSession call to detect type mismatches
 * Returns issues found in the call
 */
export interface CallSiteIssue {
  type: 'uuid_as_projectId' | 'missing_parameter' | 'hardcoded_value';
  description: string;
  suggestion: string;
}

export function analyzeSwitchSessionCall(code: string, context: string): CallSiteIssue[] {
  const issues: CallSiteIssue[] = [];

  // Extract the parameters from switchSession call
  const match = code.match(/switchSession\s*\(\s*([^,)]+)\s*(?:,\s*([^)]+))?\s*\)/);

  if (!match) return issues;

  const [, firstParam, secondParam] = match;

  // Check if second parameter is missing
  if (!secondParam || secondParam.trim() === '') {
    issues.push({
      type: 'missing_parameter',
      description: 'Missing projectId parameter',
      suggestion: 'Add projectId as second parameter: switchSession(sessionId, projectId)',
    });
    return issues;
  }

  // Check if second parameter looks like a UUID (workspaceId) instead of projectId
  const secondParamTrimmed = secondParam.trim();

  // Direct UUID check
  if (UUID_REGEX.test(secondParamTrimmed.replace(/['"]/g, ''))) {
    issues.push({
      type: 'uuid_as_projectId',
      description: `UUID passed as projectId: ${secondParamTrimmed}`,
      suggestion: 'Use getProjectIdFromWorkspace() to convert workspace UUID to project ID',
    });
  }

  // Check context for variable definitions that might reveal the type
  const uuidVariablePattern = /(?:workspaceId|workspace\.id)\s*$/;
  if (uuidVariablePattern.test(secondParamTrimmed)) {
    issues.push({
      type: 'uuid_as_projectId',
      description: `Workspace ID variable passed as projectId: ${secondParamTrimmed}`,
      suggestion: 'Use getProjectIdFromWorkspace() to convert workspace UUID to project ID',
    });
  }

  return issues;
}

/**
 * Detect common type confusion patterns in code
 */
export interface TypeConfusionPattern {
  pattern: RegExp;
  paramIndex: number;  // 0-indexed parameter that should NOT match this pattern
  expectedType: string;
  actualType: string;
  suggestion: string;
}

export const SWITCH_SESSION_TYPE_PATTERNS: TypeConfusionPattern[] = [
  {
    // workspaceId or workspace.id passed as second param
    pattern: /switchSession\([^,]+,\s*(?:workspaceId|workspace\.id|w\.id)/,
    paramIndex: 1,
    expectedType: 'projectId (encoded path)',
    actualType: 'workspaceId (UUID)',
    suggestion: 'Use getProjectIdFromWorkspace(workspaceId, workspaces) or project.id',
  },
  {
    // Variable ending in WorkspaceId passed as second param
    pattern: /switchSession\([^,]+,\s*\w*WorkspaceId/,
    paramIndex: 1,
    expectedType: 'projectId (encoded path)',
    actualType: 'workspaceId (UUID)',
    suggestion: 'Use getProjectIdFromWorkspace(workspaceId, workspaces) or project.id',
  },
];

/**
 * Check code against type confusion patterns
 */
export function checkTypePatterns(
  code: string,
  patterns: TypeConfusionPattern[]
): TypeConfusionPattern[] {
  return patterns.filter(p => p.pattern.test(code));
}
