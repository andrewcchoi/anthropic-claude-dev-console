#!/usr/bin/env ts-node
/**
 * Test Checklist Generator
 * Analyzes modified files and generates a checklist of required tests
 *
 * Usage:
 *   npm run generate-checklist -- src/components/SessionList.tsx
 *   npm run generate-checklist -- --git-diff
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';

interface TestChecklist {
  file: string;
  layers: {
    store?: ChecklistItem[];
    hooks?: ChecklistItem[];
    components?: ChecklistItem[];
    integration: ChecklistItem[];
    callSiteAudits?: string[];
  };
  estimatedTests: number;
}

interface ChecklistItem {
  description: string;
  required: boolean;
  rationale?: string;
}

const STORE_CHECKLIST: ChecklistItem[] = [
  { description: 'Test all store actions', required: true },
  { description: 'Test all selectors/getters', required: true },
  { description: 'Test state transitions', required: true },
  { description: 'Test edge cases (empty, null, invalid)', required: true },
  { description: 'Test cross-store coordination', required: false, rationale: 'Only if store updates another store' },
  { description: 'Test localStorage persistence', required: false, rationale: 'Only if store persists data' },
];

const HOOK_CHECKLIST: ChecklistItem[] = [
  { description: 'Test hook return values', required: true },
  { description: 'Test API calls (URL, params, body)', required: true, rationale: 'Critical for catching integration bugs' },
  { description: 'Test cleanup functions', required: true },
  { description: 'Test error handling', required: true },
  { description: 'Test loading states', required: false },
];

const COMPONENT_CHECKLIST: ChecklistItem[] = [
  { description: 'Test rendering with props', required: true },
  { description: 'Test user interactions (click, type, submit)', required: true },
  { description: 'Test event handlers pass correct arguments', required: true, rationale: 'This is where the projectId bug was' },
  { description: 'Test conditional rendering', required: false },
  { description: 'Test loading/error states', required: false },
];

const INTEGRATION_CHECKLIST: ChecklistItem[] = [
  { description: 'Test full data flow (Component → Store → API)', required: true, rationale: 'Would have caught 404 error' },
  { description: 'Verify API calls include all query parameters', required: true, rationale: 'Critical for catching missing params' },
  { description: 'Test response handling', required: true },
  { description: 'Test error propagation', required: true },
  { description: 'Test cross-store coordination', required: false, rationale: 'Only if feature spans multiple stores' },
];

/**
 * Analyze a file to determine which layers it touches
 */
function analyzeFile(filePath: string): string[] {
  const layers: string[] = [];

  if (filePath.includes('/store/')) layers.push('store');
  if (filePath.includes('/hooks/')) layers.push('hooks');
  if (filePath.includes('/components/')) layers.push('components');

  // Always require integration tests
  layers.push('integration');

  return layers;
}

/**
 * Detect function signature changes that need call-site audits
 */
async function detectFunctionChanges(filePath: string): Promise<string[]> {
  try {
    // Get git diff for the file
    const diff = execSync(`git diff HEAD ${filePath}`, { encoding: 'utf-8' });

    // Look for function signature changes
    const functionRegex = /^[+-]\s*(export\s+)?(async\s+)?function\s+(\w+)\s*\(/gm;
    const arrowFunctionRegex = /^[+-]\s*(export\s+)?const\s+(\w+)\s*=\s*\([^)]*\)\s*=>/gm;

    const functions = new Set<string>();

    let match;
    while ((match = functionRegex.exec(diff)) !== null) {
      functions.add(match[3]);
    }
    while ((match = arrowFunctionRegex.exec(diff)) !== null) {
      functions.add(match[2]);
    }

    return Array.from(functions);
  } catch (error) {
    // File not in git or no changes
    return [];
  }
}

/**
 * Generate test checklist for a file
 */
async function generateChecklistForFile(filePath: string): Promise<TestChecklist> {
  const layers = analyzeFile(filePath);
  const functionChanges = await detectFunctionChanges(filePath);

  const checklist: TestChecklist = {
    file: filePath,
    layers: {
      integration: INTEGRATION_CHECKLIST,
    },
    estimatedTests: 0,
  };

  if (layers.includes('store')) {
    checklist.layers.store = STORE_CHECKLIST;
    checklist.estimatedTests += STORE_CHECKLIST.filter(item => item.required).length;
  }

  if (layers.includes('hooks')) {
    checklist.layers.hooks = HOOK_CHECKLIST;
    checklist.estimatedTests += HOOK_CHECKLIST.filter(item => item.required).length;
  }

  if (layers.includes('components')) {
    checklist.layers.components = COMPONENT_CHECKLIST;
    checklist.estimatedTests += COMPONENT_CHECKLIST.filter(item => item.required).length;
  }

  checklist.estimatedTests += INTEGRATION_CHECKLIST.filter(item => item.required).length;

  if (functionChanges.length > 0) {
    checklist.layers.callSiteAudits = functionChanges;
    checklist.estimatedTests += functionChanges.length * 3; // 3 tests per function audit
  }

  return checklist;
}

/**
 * Format checklist as markdown
 */
function formatChecklist(checklist: TestChecklist): string {
  let markdown = `# Test Checklist: ${checklist.file}\n\n`;
  markdown += `**Estimated tests**: ~${checklist.estimatedTests}\n\n`;
  markdown += `---\n\n`;

  const formatItems = (title: string, items: ChecklistItem[]) => {
    markdown += `## ${title}\n\n`;
    for (const item of items) {
      const required = item.required ? '🔴 REQUIRED' : '🟡 Optional';
      markdown += `- [ ] ${item.description} **(${required})**\n`;
      if (item.rationale) {
        markdown += `  - *${item.rationale}*\n`;
      }
    }
    markdown += `\n`;
  };

  if (checklist.layers.store) {
    formatItems('Layer 1: Store Tests', checklist.layers.store);
  }

  if (checklist.layers.hooks) {
    formatItems('Layer 2: Hook Tests', checklist.layers.hooks);
  }

  if (checklist.layers.components) {
    formatItems('Layer 3: Component Tests', checklist.layers.components);
  }

  formatItems('Layer 4: Integration Tests', checklist.layers.integration);

  if (checklist.layers.callSiteAudits && checklist.layers.callSiteAudits.length > 0) {
    markdown += `## Layer 5: Call-Site Audits\n\n`;
    markdown += `**Functions with signature changes**: ${checklist.layers.callSiteAudits.length}\n\n`;
    for (const func of checklist.layers.callSiteAudits) {
      markdown += `- [ ] 🔴 Audit all call sites of \`${func}()\`\n`;
      markdown += `  - [ ] Find all callers with grep\n`;
      markdown += `  - [ ] Verify parameter count\n`;
      markdown += `  - [ ] Verify parameter types\n`;
    }
    markdown += `\n`;
  }

  markdown += `---\n\n`;
  markdown += `## Templates\n\n`;
  markdown += `Use these templates to write tests:\n\n`;
  if (checklist.layers.store) markdown += `- \`__tests__/templates/store.test.template.ts\`\n`;
  if (checklist.layers.hooks) markdown += `- \`__tests__/templates/hook.test.template.ts\`\n`;
  if (checklist.layers.components) markdown += `- \`__tests__/templates/component.test.template.tsx\`\n`;
  markdown += `- \`__tests__/templates/integration.test.template.ts\`\n`;
  if (checklist.layers.callSiteAudits && checklist.layers.callSiteAudits.length > 0) {
    markdown += `- \`__tests__/templates/call-site-audit.test.template.ts\`\n`;
  }

  markdown += `\n---\n\n`;
  markdown += `## Verification\n\n`;
  markdown += `After writing tests, run:\n\n`;
  markdown += `\`\`\`bash\n`;
  markdown += `npm run verify-tests\n`;
  markdown += `npm test -- --coverage\n`;
  markdown += `\`\`\`\n`;

  return markdown;
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);

  let files: string[];

  if (args.includes('--git-diff')) {
    // Get files from git diff
    const output = execSync('git diff --name-only HEAD', { encoding: 'utf-8' });
    files = output.trim().split('\n').filter(f => f.startsWith('src/'));
  } else if (args.length > 0) {
    // Use provided files
    files = args.filter(arg => !arg.startsWith('--'));
  } else {
    console.error('Usage: generate-checklist [files...] or --git-diff');
    process.exit(1);
  }

  if (files.length === 0) {
    console.log('No files to analyze');
    process.exit(0);
  }

  console.log(`📋 Generating test checklist for ${files.length} file(s)...\n`);

  const checklists = await Promise.all(
    files.map(file => generateChecklistForFile(file))
  );

  // Combine all checklists
  let combinedMarkdown = `# Test Checklist\n\n`;
  combinedMarkdown += `**Generated**: ${new Date().toISOString()}\n`;
  combinedMarkdown += `**Files**: ${files.length}\n`;
  combinedMarkdown += `**Total estimated tests**: ${checklists.reduce((sum, c) => sum + c.estimatedTests, 0)}\n\n`;
  combinedMarkdown += `---\n\n`;

  for (const checklist of checklists) {
    combinedMarkdown += formatChecklist(checklist);
    combinedMarkdown += `\n---\n\n`;
  }

  // Write to file
  const outputPath = join(process.cwd(), '.test-checklist.md');
  await fs.writeFile(outputPath, combinedMarkdown);

  console.log(`✅ Checklist written to: .test-checklist.md`);
  console.log(`\n📊 Summary:`);
  console.log(`   Files: ${files.length}`);
  console.log(`   Estimated tests: ${checklists.reduce((sum, c) => sum + c.estimatedTests, 0)}`);
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
