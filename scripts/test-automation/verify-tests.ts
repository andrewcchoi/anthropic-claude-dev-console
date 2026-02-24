#!/usr/bin/env ts-node
/**
 * Test Verification Script
 * Verifies that all checklist items are complete before allowing PR
 *
 * Usage:
 *   npm run verify-tests
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { glob } from 'glob';

interface VerificationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    checklistComplete: boolean;
    coveragePass: boolean;
    callSiteAuditsExist: boolean;
    integrationTestsExist: boolean;
  };
}

/**
 * Check if test checklist exists and is complete
 */
async function verifyChecklist(): Promise<{ passed: boolean; errors: string[] }> {
  const checklistPath = join(process.cwd(), '.test-checklist.md');
  const errors: string[] = [];

  try {
    const content = await fs.readFile(checklistPath, 'utf-8');

    // Count unchecked items
    const uncheckedRequired = content.match(/- \[ \].*🔴 REQUIRED/g);

    if (uncheckedRequired && uncheckedRequired.length > 0) {
      errors.push(`${uncheckedRequired.length} required checklist items are incomplete`);
      errors.push(`Run: cat .test-checklist.md | grep "\\[ \\].*🔴 REQUIRED"`);
    }

    return {
      passed: errors.length === 0,
      errors,
    };
  } catch (error) {
    return {
      passed: false,
      errors: ['No test checklist found. Run: npm run generate-checklist'],
    };
  }
}

/**
 * Verify coverage thresholds
 */
async function verifyCoverage(): Promise<{ passed: boolean; errors: string[] }> {
  const errors: string[] = [];

  try {
    // Run tests with coverage
    const output = execSync('npm test -- --coverage --silent', {
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    // Parse coverage output (this is jest-specific, adjust for your test runner)
    const lineMatch = output.match(/All files\s+\|\s+([\d.]+)/);
    const branchMatch = output.match(/All files\s+\|[^|]+\|[^|]+\|\s+([\d.]+)/);

    const lineCoverage = lineMatch ? parseFloat(lineMatch[1]) : 0;
    const branchCoverage = branchMatch ? parseFloat(branchMatch[1]) : 0;

    if (lineCoverage < 90) {
      errors.push(`Line coverage ${lineCoverage}% is below 90% threshold`);
    }

    if (branchCoverage < 90) {
      errors.push(`Branch coverage ${branchCoverage}% is below 90% threshold`);
    }

    return {
      passed: errors.length === 0,
      errors,
    };
  } catch (error) {
    return {
      passed: false,
      errors: ['Coverage check failed. Run: npm test -- --coverage'],
    };
  }
}

/**
 * Verify call-site audits exist for modified functions
 */
async function verifyCallSiteAudits(): Promise<{ passed: boolean; errors: string[] }> {
  const errors: string[] = [];

  try {
    // Check if checklist mentions call-site audits
    const checklistPath = join(process.cwd(), '.test-checklist.md');
    const checklist = await fs.readFile(checklistPath, 'utf-8');

    if (checklist.includes('Layer 5: Call-Site Audits')) {
      // Extract function names from checklist
      const functionMatches = checklist.matchAll(/Audit all call sites of `(\w+)\(\)`/g);
      const functions = Array.from(functionMatches).map(m => m[1]);

      if (functions.length > 0) {
        // Check if audit tests exist
        const auditFiles = await glob('__tests__/audits/*-call-sites.test.{ts,tsx}');

        for (const func of functions) {
          const expectedFile = `__tests__/audits/${func}-call-sites.test.ts`;
          const exists = auditFiles.some(f => f.includes(func));

          if (!exists) {
            errors.push(`Missing call-site audit for ${func}(). Expected: ${expectedFile}`);
          }
        }
      }
    }

    return {
      passed: errors.length === 0,
      errors,
    };
  } catch (error) {
    // No checklist or no audits needed
    return { passed: true, errors: [] };
  }
}

/**
 * Verify integration tests exist for modified files
 */
async function verifyIntegrationTests(): Promise<{ passed: boolean; errors: string[] }> {
  const errors: string[] = [];

  try {
    // Get modified files
    const output = execSync('git diff --name-only HEAD', { encoding: 'utf-8' });
    const modifiedFiles = output.trim().split('\n').filter(f => f.startsWith('src/'));

    // For each modified file, check if integration test exists
    const integrationTests = await glob('__tests__/integration/*.test.{ts,tsx}');

    for (const file of modifiedFiles) {
      // Extract component/feature name
      const match = file.match(/\/([^/]+)\.(tsx?|js)$/);
      if (match) {
        const name = match[1];

        // Check if integration test exists (loose matching)
        const hasIntegrationTest = integrationTests.some(test =>
          test.toLowerCase().includes(name.toLowerCase())
        );

        if (!hasIntegrationTest) {
          errors.push(`No integration test found for ${file}`);
        }
      }
    }

    return {
      passed: errors.length === 0,
      errors,
    };
  } catch (error) {
    // No git or no changes
    return { passed: true, errors: [] };
  }
}

/**
 * Main verification
 */
async function main() {
  console.log('🔍 Verifying test completeness...\n');

  const result: VerificationResult = {
    passed: true,
    errors: [],
    warnings: [],
    summary: {
      checklistComplete: false,
      coveragePass: false,
      callSiteAuditsExist: false,
      integrationTestsExist: false,
    },
  };

  // Check 1: Checklist
  console.log('✓ Checking test checklist...');
  const checklistResult = await verifyChecklist();
  result.summary.checklistComplete = checklistResult.passed;
  if (!checklistResult.passed) {
    result.passed = false;
    result.errors.push(...checklistResult.errors);
  }

  // Check 2: Coverage
  console.log('✓ Checking coverage thresholds...');
  const coverageResult = await verifyCoverage();
  result.summary.coveragePass = coverageResult.passed;
  if (!coverageResult.passed) {
    result.passed = false;
    result.errors.push(...coverageResult.errors);
  }

  // Check 3: Call-site audits
  console.log('✓ Checking call-site audits...');
  const auditResult = await verifyCallSiteAudits();
  result.summary.callSiteAuditsExist = auditResult.passed;
  if (!auditResult.passed) {
    result.passed = false;
    result.errors.push(...auditResult.errors);
  }

  // Check 4: Integration tests
  console.log('✓ Checking integration tests...');
  const integrationResult = await verifyIntegrationTests();
  result.summary.integrationTestsExist = integrationResult.passed;
  if (!integrationResult.passed) {
    result.warnings.push(...integrationResult.errors);
    // Warnings don't fail the build
  }

  // Print results
  console.log('\n' + '='.repeat(60));
  console.log('📊 Verification Results');
  console.log('='.repeat(60));

  const status = (passed: boolean) => (passed ? '✅ PASS' : '❌ FAIL');

  console.log(`\nChecklist complete: ${status(result.summary.checklistComplete)}`);
  console.log(`Coverage thresholds: ${status(result.summary.coveragePass)}`);
  console.log(`Call-site audits: ${status(result.summary.callSiteAuditsExist)}`);
  console.log(`Integration tests: ${status(result.summary.integrationTestsExist)}`);

  if (result.errors.length > 0) {
    console.log(`\n❌ Errors (${result.errors.length}):`);
    result.errors.forEach(err => console.log(`   - ${err}`));
  }

  if (result.warnings.length > 0) {
    console.log(`\n⚠️  Warnings (${result.warnings.length}):`);
    result.warnings.forEach(warn => console.log(`   - ${warn}`));
  }

  console.log('\n' + '='.repeat(60));

  if (result.passed) {
    console.log('✅ All checks passed! Safe to create PR.');
    process.exit(0);
  } else {
    console.log('❌ Some checks failed. Fix errors before creating PR.');
    await fs.writeFile('.test-checklist-failures', result.errors.join('\n'));
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Verification failed:', error);
  process.exit(1);
});
