#!/usr/bin/env ts-node
/**
 * Test Strategy Report Generator
 * Generates a report showing test coverage metrics and strategy compliance
 *
 * Usage:
 *   npm run test:report
 */

import { promises as fs } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

interface TestMetrics {
  timestamp: string;
  coverage: {
    lines: number;
    branches: number;
    functions: number;
    statements: number;
  };
  testCounts: {
    store: number;
    hooks: number;
    components: number;
    integration: number;
    audits: number;
    total: number;
  };
  strategyCompliance: {
    checklistComplete: boolean;
    allLayersCovered: boolean;
    callSiteAuditsExist: boolean;
    coverageThresholdsMet: boolean;
  };
}

/**
 * Run tests and collect coverage
 */
async function collectCoverage(): Promise<any> {
  try {
    execSync('npm test -- --coverage --silent', { encoding: 'utf-8' });

    // Read coverage report
    const coveragePath = join(process.cwd(), 'coverage', 'coverage-summary.json');
    const coverageData = await fs.readFile(coveragePath, 'utf-8');
    return JSON.parse(coverageData);
  } catch (error) {
    console.error('Failed to collect coverage:', error);
    return null;
  }
}

/**
 * Count test files by layer
 */
async function countTests(): Promise<TestMetrics['testCounts']> {
  const countInDir = async (pattern: string): Promise<number> => {
    try {
      const output = execSync(`find . -path "${pattern}" -name "*.test.*" | wc -l`, {
        encoding: 'utf-8',
      });
      return parseInt(output.trim(), 10);
    } catch {
      return 0;
    }
  };

  const [store, hooks, components, integration, audits] = await Promise.all([
    countInDir('./src/lib/store/__tests__'),
    countInDir('./src/hooks/__tests__'),
    countInDir('./src/components/**/__tests__'),
    countInDir('./__tests__/integration'),
    countInDir('./__tests__/audits'),
  ]);

  return {
    store,
    hooks,
    components,
    integration,
    audits,
    total: store + hooks + components + integration + audits,
  };
}

/**
 * Check strategy compliance
 */
async function checkCompliance(): Promise<TestMetrics['strategyCompliance']> {
  let checklistComplete = false;
  let allLayersCovered = false;
  let callSiteAuditsExist = false;

  // Check if checklist exists and is complete
  try {
    const checklist = await fs.readFile('.test-checklist.md', 'utf-8');
    const unchecked = (checklist.match(/- \[ \].*🔴 REQUIRED/g) || []).length;
    checklistComplete = unchecked === 0;
  } catch {
    checklistComplete = false;
  }

  // Check if all layers have tests
  const counts = await countTests();
  allLayersCovered = counts.store > 0 && counts.hooks > 0 && counts.components > 0 && counts.integration > 0;

  // Check if call-site audits exist
  callSiteAuditsExist = counts.audits > 0;

  // Check coverage thresholds
  const coverage = await collectCoverage();
  const coverageThresholdsMet =
    coverage &&
    coverage.total.lines.pct >= 90 &&
    coverage.total.branches.pct >= 90 &&
    coverage.total.functions.pct >= 90 &&
    coverage.total.statements.pct >= 90;

  return {
    checklistComplete,
    allLayersCovered,
    callSiteAuditsExist,
    coverageThresholdsMet,
  };
}

/**
 * Generate report
 */
async function generateReport(): Promise<void> {
  console.log('📊 Generating Test Strategy Report...\n');

  // Collect metrics
  const coverage = await collectCoverage();
  const testCounts = await countTests();
  const compliance = await checkCompliance();

  const metrics: TestMetrics = {
    timestamp: new Date().toISOString(),
    coverage: coverage
      ? {
          lines: coverage.total.lines.pct,
          branches: coverage.total.branches.pct,
          functions: coverage.total.functions.pct,
          statements: coverage.total.statements.pct,
        }
      : { lines: 0, branches: 0, functions: 0, statements: 0 },
    testCounts,
    strategyCompliance: compliance,
  };

  // Generate markdown report
  let report = `# Test Strategy Report\n\n`;
  report += `**Generated**: ${new Date().toLocaleString()}\n\n`;
  report += `---\n\n`;

  // Coverage section
  report += `## Coverage\n\n`;
  report += `| Metric | Value | Threshold | Status |\n`;
  report += `|--------|-------|-----------|--------|\n`;
  report += `| Lines | ${metrics.coverage.lines.toFixed(2)}% | 90% | ${metrics.coverage.lines >= 90 ? '✅' : '❌'} |\n`;
  report += `| Branches | ${metrics.coverage.branches.toFixed(2)}% | 90% | ${metrics.coverage.branches >= 90 ? '✅' : '❌'} |\n`;
  report += `| Functions | ${metrics.coverage.functions.toFixed(2)}% | 90% | ${metrics.coverage.functions >= 90 ? '✅' : '❌'} |\n`;
  report += `| Statements | ${metrics.coverage.statements.toFixed(2)}% | 90% | ${metrics.coverage.statements >= 90 ? '✅' : '❌'} |\n\n`;

  // Test counts section
  report += `## Test Distribution\n\n`;
  report += `| Layer | Count |\n`;
  report += `|-------|-------|\n`;
  report += `| Store Tests | ${metrics.testCounts.store} |\n`;
  report += `| Hook Tests | ${metrics.testCounts.hooks} |\n`;
  report += `| Component Tests | ${metrics.testCounts.components} |\n`;
  report += `| Integration Tests | ${metrics.testCounts.integration} |\n`;
  report += `| Call-Site Audits | ${metrics.testCounts.audits} |\n`;
  report += `| **Total** | **${metrics.testCounts.total}** |\n\n`;

  // Strategy compliance section
  report += `## Strategy Compliance\n\n`;
  report += `| Requirement | Status |\n`;
  report += `|-------------|--------|\n`;
  report += `| Checklist Complete | ${metrics.strategyCompliance.checklistComplete ? '✅' : '❌'} |\n`;
  report += `| All Layers Covered | ${metrics.strategyCompliance.allLayersCovered ? '✅' : '❌'} |\n`;
  report += `| Call-Site Audits Exist | ${metrics.strategyCompliance.callSiteAuditsExist ? '✅' : '❌'} |\n`;
  report += `| Coverage Thresholds Met | ${metrics.strategyCompliance.coverageThresholdsMet ? '✅' : '❌'} |\n\n`;

  // Overall status
  const allPassed =
    metrics.strategyCompliance.checklistComplete &&
    metrics.strategyCompliance.allLayersCovered &&
    metrics.strategyCompliance.callSiteAuditsExist &&
    metrics.strategyCompliance.coverageThresholdsMet;

  report += `## Overall Status: ${allPassed ? '✅ PASS' : '❌ FAIL'}\n\n`;

  if (!allPassed) {
    report += `### Actions Required:\n\n`;
    if (!metrics.strategyCompliance.checklistComplete) {
      report += `- [ ] Complete test checklist: \`cat .test-checklist.md | grep '\\[ \\].*🔴 REQUIRED'\`\n`;
    }
    if (!metrics.strategyCompliance.allLayersCovered) {
      report += `- [ ] Add tests for missing layers\n`;
    }
    if (!metrics.strategyCompliance.callSiteAuditsExist) {
      report += `- [ ] Create call-site audit tests: \`npm run generate-tests -- [file]\`\n`;
    }
    if (!metrics.strategyCompliance.coverageThresholdsMet) {
      report += `- [ ] Increase test coverage to meet 90% threshold\n`;
    }
  }

  // Write report
  await fs.writeFile('test-strategy-report.md', report);

  // Also save metrics as JSON for historical tracking
  const metricsHistory = [];
  try {
    const existingHistory = await fs.readFile('.test-metrics-history.json', 'utf-8');
    metricsHistory.push(...JSON.parse(existingHistory));
  } catch {
    // No history yet
  }

  metricsHistory.push(metrics);

  // Keep last 30 reports
  if (metricsHistory.length > 30) {
    metricsHistory.splice(0, metricsHistory.length - 30);
  }

  await fs.writeFile('.test-metrics-history.json', JSON.stringify(metricsHistory, null, 2));

  // Print summary
  console.log('✅ Report generated: test-strategy-report.md');
  console.log('\n📊 Summary:');
  console.log(`   Tests: ${metrics.testCounts.total}`);
  console.log(`   Coverage: ${metrics.coverage.lines.toFixed(2)}%`);
  console.log(`   Status: ${allPassed ? '✅ PASS' : '❌ FAIL'}\n`);
}

generateReport().catch(error => {
  console.error('Failed to generate report:', error);
  process.exit(1);
});
