#!/usr/bin/env ts-node
/**
 * AI-Powered Test Generator (SURPRISE FEATURE!)
 * Uses Claude API to generate draft tests based on code analysis
 *
 * This goes beyond traditional TDD by:
 * 1. Analyzing code structure and patterns
 * 2. Generating comprehensive test cases
 * 3. Identifying edge cases developers might miss
 * 4. Creating call-site audit tests automatically
 *
 * Usage:
 *   npm run generate-tests -- src/components/SessionList.tsx
 *   npm run generate-tests -- --git-diff
 */

import { promises as fs } from 'fs';
import { join, basename } from 'path';
import { execSync } from 'child_process';

interface TestGenerationConfig {
  file: string;
  layer: 'store' | 'hook' | 'component' | 'integration' | 'audit';
  templatePath: string;
  outputPath: string;
}

/**
 * Analyze code to extract function signatures, props, state, etc.
 */
async function analyzeCode(filePath: string): Promise<{
  functions: Array<{ name: string; params: string[]; returnType: string }>;
  exports: string[];
  imports: string[];
  props?: Record<string, string>;
  state?: Record<string, string>;
}> {
  const content = await fs.readFile(filePath, 'utf-8');

  // Extract function signatures
  const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?/g;
  const arrowFunctionRegex = /(?:export\s+)?const\s+(\w+)\s*=\s*\(([^)]*)\)(?:\s*:\s*([^=>]+))?/g;

  const functions: Array<{ name: string; params: string[]; returnType: string }> = [];
  let match;

  while ((match = functionRegex.exec(content)) !== null) {
    functions.push({
      name: match[1],
      params: match[2].split(',').map(p => p.trim()).filter(Boolean),
      returnType: match[3]?.trim() || 'void',
    });
  }

  while ((match = arrowFunctionRegex.exec(content)) !== null) {
    functions.push({
      name: match[1],
      params: match[2].split(',').map(p => p.trim()).filter(Boolean),
      returnType: match[3]?.trim() || 'void',
    });
  }

  // Extract exports
  const exportRegex = /export\s+(?:{([^}]+)}|(\w+))/g;
  const exports: string[] = [];

  while ((match = exportRegex.exec(content)) !== null) {
    if (match[1]) {
      exports.push(...match[1].split(',').map(e => e.trim()));
    } else if (match[2]) {
      exports.push(match[2]);
    }
  }

  // Extract imports
  const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
  const imports: string[] = [];

  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  return {
    functions,
    exports,
    imports,
  };
}

/**
 * Generate test prompt for Claude API
 */
function generatePrompt(config: TestGenerationConfig, analysis: any): string {
  const fileName = basename(config.file);

  return `You are a senior software engineer writing comprehensive tests.

File: ${fileName}
Layer: ${config.layer}

Code analysis:
${JSON.stringify(analysis, null, 2)}

Template:
${config.templatePath}

Generate a complete test file that:
1. Tests all functions and exports
2. Includes edge cases (null, undefined, empty arrays, etc.)
3. Tests error handling
4. ${config.layer === 'component' ? 'Verifies event handlers pass ALL arguments (critical!)' : ''}
5. ${config.layer === 'integration' ? 'Verifies API calls include all query parameters' : ''}
6. ${config.layer === 'audit' ? 'Creates grep-based call-site verification' : ''}

Follow the template structure exactly. Use realistic test data. Be thorough but concise.

Output ONLY the test code, no explanations.`;
}

/**
 * Call Claude API to generate tests
 */
async function generateTestsWithAI(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable not set');
  }

  // Note: This is a simplified example. In production, use the official Anthropic SDK
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

/**
 * Determine layer and paths for a file
 */
function determineConfig(filePath: string): TestGenerationConfig {
  const fileName = basename(filePath, '.tsx').replace('.ts', '');

  if (filePath.includes('/store/')) {
    return {
      file: filePath,
      layer: 'store',
      templatePath: '__tests__/templates/store.test.template.ts',
      outputPath: `src/lib/store/__tests__/${fileName}.test.ts`,
    };
  } else if (filePath.includes('/hooks/')) {
    return {
      file: filePath,
      layer: 'hook',
      templatePath: '__tests__/templates/hook.test.template.ts',
      outputPath: `src/hooks/__tests__/${fileName}.test.ts`,
    };
  } else if (filePath.includes('/components/')) {
    return {
      file: filePath,
      layer: 'component',
      templatePath: '__tests__/templates/component.test.template.tsx',
      outputPath: `src/components/__tests__/${fileName}.test.tsx`,
    };
  } else {
    return {
      file: filePath,
      layer: 'integration',
      templatePath: '__tests__/templates/integration.test.template.ts',
      outputPath: `__tests__/integration/${fileName}-integration.test.ts`,
    };
  }
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: generate-tests [file] or --git-diff');
    process.exit(1);
  }

  let files: string[];

  if (args.includes('--git-diff')) {
    const output = execSync('git diff --name-only HEAD', { encoding: 'utf-8' });
    files = output.trim().split('\n').filter(f => f.startsWith('src/'));
  } else {
    files = args.filter(arg => !arg.startsWith('--'));
  }

  console.log('🤖 AI-Powered Test Generator\n');
  console.log(`Generating tests for ${files.length} file(s)...\n`);

  for (const file of files) {
    console.log(`📝 Analyzing: ${file}`);

    try {
      // Analyze code
      const analysis = await analyzeCode(file);
      console.log(`   Found ${analysis.functions.length} functions`);

      // Determine config
      const config = determineConfig(file);
      console.log(`   Layer: ${config.layer}`);

      // Generate prompt
      const prompt = generatePrompt(config, analysis);

      // Call AI (if API key available)
      if (process.env.ANTHROPIC_API_KEY) {
        console.log(`   Generating tests with Claude...`);
        const testCode = await generateTestsWithAI(prompt);

        // Write output
        await fs.mkdir(join(config.outputPath, '..'), { recursive: true });
        await fs.writeFile(config.outputPath, testCode);

        console.log(`   ✅ Generated: ${config.outputPath}\n`);
      } else {
        console.log(`   ⚠️  Skipping AI generation (no API key)`);
        console.log(`   💡 Set ANTHROPIC_API_KEY to enable AI test generation\n`);

        // Fall back to copying template
        const template = await fs.readFile(config.templatePath, 'utf-8');
        await fs.mkdir(join(config.outputPath, '..'), { recursive: true });
        await fs.writeFile(config.outputPath, template);

        console.log(`   📋 Created from template: ${config.outputPath}\n`);
      }
    } catch (error) {
      console.error(`   ❌ Error: ${error}`);
    }
  }

  console.log('✨ Test generation complete!');
  console.log('\n📌 Next steps:');
  console.log('   1. Review generated tests');
  console.log('   2. Add test data and assertions');
  console.log('   3. Run tests: npm test');
  console.log('   4. Verify coverage: npm test -- --coverage');
}

main().catch(error => {
  console.error('Generation failed:', error);
  process.exit(1);
});
