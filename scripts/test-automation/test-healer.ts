#!/usr/bin/env ts-node
/**
 * AI-Powered Test Healer 🔮
 *
 * THE SURPRISE FEATURE!
 *
 * When tests fail, this tool uses Claude API to analyze the failure,
 * understand what changed in the code, and suggest how to fix the test.
 *
 * This goes beyond test generation - it's test HEALING.
 *
 * Usage:
 *   npm run test:heal
 *   npm run test:heal -- [specific test file]
 */

import { promises as fs } from 'fs';
import { exec Sync } from 'child_process';

interface TestFailure {
  testFile: string;
  testName: string;
  error: string;
  stackTrace: string;
}

interface HealingSuggestion {
  problem: string;
  likelyСause: string;
  suggestedFix: string;
  confidence: 'high' | 'medium' | 'low';
  codeChanges?: Array<{
    file: string;
    before: string;
    after: string;
  }>;
}

/**
 * Run tests and capture failures
 */
async function runTestsAndCaptureFailures(testFile?: string): Promise<TestFailure[]> {
  const command = testFile
    ? `npm test -- ${testFile} --reporter=json`
    : `npm test -- --reporter=json`;

  try {
    const output = execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
    // If tests pass, return empty array
    return [];
  } catch (error: any) {
    // Parse JSON output to extract failures
    const output = error.stdout || error.stderr;

    try {
      const results = JSON.parse(output);
      return extractFailures(results);
    } catch {
      console.error('Failed to parse test output');
      return [];
    }
  }
}

/**
 * Extract test failures from Vitest JSON output
 */
function extractFailures(results: any): TestFailure[] {
  const failures: TestFailure[] = [];

  // Navigate Vitest JSON structure to find failed tests
  if (results.testResults) {
    for (const testResult of results.testResults) {
      if (testResult.status === 'failed') {
        for (const assertionResult of testResult.assertionResults || []) {
          if (assertionResult.status === 'failed') {
            failures.push({
              testFile: testResult.name,
              testName: assertionResult.title,
              error: assertionResult.failureMessages?.[0] || 'Unknown error',
              stackTrace: assertionResult.failureMessages?.join('\n') || '',
            });
          }
        }
      }
    }
  }

  return failures;
}

/**
 * Analyze test failure with git diff to understand what changed
 */
async function analyzeFailureContext(failure: TestFailure): Promise<string> {
  // Get recent changes to the test file
  let testChanges = '';
  try {
    testChanges = execSync(`git diff HEAD~5 -- ${failure.testFile}`, { encoding: 'utf-8' });
  } catch {
    testChanges = 'No recent changes to test file';
  }

  // Get recent changes to source files that the test might cover
  const testFileName = failure.testFile.replace(/\.test\.(ts|tsx)$/, '.$1');
  const sourceFile = testFileName.replace('__tests__/', '');

  let sourceChanges = '';
  try {
    sourceChanges = execSync(`git diff HEAD~5 -- ${sourceFile}`, { encoding: 'utf-8' });
  } catch {
    sourceChanges = 'No recent changes to source file';
  }

  return `
# Test Failure Analysis

## Failed Test
File: ${failure.testFile}
Test: ${failure.testName}

## Error
\`\`\`
${failure.error}
\`\`\`

## Stack Trace
\`\`\`
${failure.stackTrace}
\`\`\`

## Recent Changes to Test
\`\`\`diff
${testChanges}
\`\`\`

## Recent Changes to Source Code
\`\`\`diff
${sourceChanges}
\`\`\`
`;
}

/**
 * Use Claude API to generate healing suggestions
 */
async function generateHealingSuggestion(
  failure: TestFailure,
  context: string
): Promise<HealingSuggestion> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return {
      problem: failure.error,
      likelyCause: 'Cannot analyze without ANTHROPIC_API_KEY',
      suggestedFix: 'Set ANTHROPIC_API_KEY environment variable to enable AI-powered test healing',
      confidence: 'low',
    };
  }

  const prompt = `You are a senior software engineer analyzing a test failure.

${context}

Based on the error, stack trace, and recent code changes:

1. What is the root cause of this test failure?
2. Did the test break because:
   - The code changed and the test needs updating?
   - The test itself has a bug?
   - The test expectations are outdated?
3. Provide specific code changes to fix the test.

Format your response as JSON:
{
  "problem": "Brief description of the issue",
  "likelyCause": "Root cause analysis",
  "suggestedFix": "Step-by-step fix instructions",
  "confidence": "high|medium|low",
  "codeChanges": [
    {
      "file": "path/to/file",
      "before": "old code",
      "after": "new code"
    }
  ]
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    const suggestion = JSON.parse(data.content[0].text);
    return suggestion;
  } catch (error) {
    console.error('Failed to generate suggestion:', error);
    return {
      problem: failure.error,
      likelyCause: 'Failed to analyze with AI',
      suggestedFix: 'Review the error manually',
      confidence: 'low',
    };
  }
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const testFile = args.find(arg => !arg.startsWith('--'));

  console.log('🔮 AI-Powered Test Healer\n');
  console.log('Analyzing test failures...\n');

  // Run tests and capture failures
  const failures = await runTestsAndCaptureFailures(testFile);

  if (failures.length === 0) {
    console.log('✅ All tests passing! No healing needed.\n');
    return;
  }

  console.log(`Found ${failures.length} test failure(s)\n`);
  console.log('='.repeat(60));

  // Analyze each failure
  for (let i = 0; i < failures.length; i++) {
    const failure = failures[i];

    console.log(`\n🔍 Analyzing Failure ${i + 1}/${failures.length}`);
    console.log(`   Test: ${failure.testName}`);
    console.log(`   File: ${failure.testFile}\n`);

    // Get context
    const context = await analyzeFailureContext(failure);

    // Generate suggestion
    console.log('   🤖 Consulting AI...');
    const suggestion = await generateHealingSuggestion(failure, context);

    // Print suggestion
    console.log('\n   📋 Healing Suggestion:');
    console.log(`   Confidence: ${suggestion.confidence.toUpperCase()}`);
    console.log(`\n   Problem:\n      ${suggestion.problem}`);
    console.log(`\n   Likely Cause:\n      ${suggestion.likelyCause}`);
    console.log(`\n   Suggested Fix:\n      ${suggestion.suggestedFix}`);

    if (suggestion.codeChanges && suggestion.codeChanges.length > 0) {
      console.log('\n   💊 Proposed Code Changes:');
      for (const change of suggestion.codeChanges) {
        console.log(`\n      File: ${change.file}`);
        console.log(`      Before:\n      ${change.before}`);
        console.log(`      After:\n      ${change.after}`);
      }
    }

    console.log('\n' + '='.repeat(60));
  }

  console.log('\n✨ Healing suggestions complete!\n');
  console.log('💡 Tips:');
  console.log('   - Review each suggestion carefully before applying');
  console.log('   - Run tests after each fix to verify');
  console.log('   - If confidence is LOW, manual review recommended');
  console.log('   - Commit fixes with descriptive messages\n');
}

main().catch(error => {
  console.error('Test healer failed:', error);
  process.exit(1);
});
