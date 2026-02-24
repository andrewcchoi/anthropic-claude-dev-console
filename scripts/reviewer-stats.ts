#!/usr/bin/env npx tsx
/**
 * Reviewer Accuracy Statistics Calculator
 *
 * Analyzes reviewer decisions and post-merge bugs to calculate accuracy metrics.
 * Use this script to calibrate reviewers over time.
 *
 * Usage:
 *   npx tsx scripts/reviewer-stats.ts [--json] [--days=30] [--reviewer=spec]
 *
 * Options:
 *   --json         Output in JSON format
 *   --days=N       Only analyze last N days (default: all)
 *   --reviewer=X   Filter to specific reviewer type
 *   --help         Show help
 */

import * as fs from 'fs';
import * as path from 'path';

// Types
interface ReviewerDecision {
  timestamp: string;
  task: string;
  reviewer: string;
  decision: 'approved' | 'fixes_needed' | 'rejected';
  issues_found: number;
  severity?: 'critical' | 'medium' | 'low' | 'none';
  confidence?: number;
  notes?: string;
}

interface PostMergeBug {
  timestamp: string;
  task: string;
  bug_id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  description: string;
  reviewers_involved: string[];
  should_have_caught: string;
  root_cause: string;
  time_to_discovery: string;
}

interface ReviewerStats {
  reviewer: string;
  total_reviews: number;
  approvals: number;
  rejections: number;
  fixes_needed: number;
  total_issues_found: number;
  avg_issues_per_review: number;
  avg_confidence: number;
  true_positives: number;  // Correctly identified issues (fixes_needed/rejected and bug found)
  false_positives: number; // Flagged issues that weren't real bugs
  false_negatives: number; // Approved but had bugs (bugs they should have caught)
  accuracy: number;        // TP / (TP + FP + FN)
  precision: number;       // TP / (TP + FP)
  recall: number;          // TP / (TP + FN)
  f1_score: number;        // 2 * (precision * recall) / (precision + recall)
  calibration_status: 'well_calibrated' | 'too_strict' | 'too_lenient' | 'unknown';
  recommendations: string[];
}

// Parse command line arguments
function parseArgs(): { json: boolean; days?: number; reviewer?: string; help: boolean } {
  const args = process.argv.slice(2);
  const result = { json: false, days: undefined as number | undefined, reviewer: undefined as string | undefined, help: false };

  for (const arg of args) {
    if (arg === '--json') result.json = true;
    else if (arg === '--help') result.help = true;
    else if (arg.startsWith('--days=')) result.days = parseInt(arg.split('=')[1], 10);
    else if (arg.startsWith('--reviewer=')) result.reviewer = arg.split('=')[1];
  }

  return result;
}

// Parse JSONL file (skip comments)
function parseJsonl<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const items: T[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    try {
      items.push(JSON.parse(trimmed) as T);
    } catch {
      // Skip invalid JSON lines
    }
  }

  return items;
}

// Filter by date range
function filterByDays<T extends { timestamp: string }>(items: T[], days?: number): T[] {
  if (!days) return items;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return items.filter(item => new Date(item.timestamp) >= cutoff);
}

// Calculate reviewer statistics
function calculateStats(
  decisions: ReviewerDecision[],
  bugs: PostMergeBug[],
  filterReviewer?: string
): ReviewerStats[] {
  // Group decisions by reviewer
  const reviewerGroups = new Map<string, ReviewerDecision[]>();
  for (const d of decisions) {
    if (filterReviewer && d.reviewer !== filterReviewer) continue;
    if (!reviewerGroups.has(d.reviewer)) {
      reviewerGroups.set(d.reviewer, []);
    }
    reviewerGroups.get(d.reviewer)!.push(d);
  }

  // Create a map of tasks to bugs that should have been caught by each reviewer
  const bugsByTask = new Map<string, PostMergeBug[]>();
  for (const bug of bugs) {
    if (!bugsByTask.has(bug.task)) {
      bugsByTask.set(bug.task, []);
    }
    bugsByTask.get(bug.task)!.push(bug);
  }

  const stats: ReviewerStats[] = [];

  for (const [reviewer, reviews] of reviewerGroups) {
    const approvals = reviews.filter(r => r.decision === 'approved').length;
    const rejections = reviews.filter(r => r.decision === 'rejected').length;
    const fixes_needed = reviews.filter(r => r.decision === 'fixes_needed').length;
    const total_issues_found = reviews.reduce((sum, r) => sum + r.issues_found, 0);
    const confidences = reviews.filter(r => r.confidence !== undefined).map(r => r.confidence!);
    const avg_confidence = confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 0;

    // Calculate true positives, false positives, false negatives
    let true_positives = 0;
    let false_positives = 0;
    let false_negatives = 0;

    // Get unique tasks reviewed by this reviewer
    const tasksReviewed = new Set(reviews.map(r => r.task));

    for (const task of tasksReviewed) {
      const taskReviews = reviews.filter(r => r.task === task);
      const taskBugs = bugsByTask.get(task) || [];

      // Bugs this reviewer should have caught
      const missedBugs = taskBugs.filter(b =>
        b.should_have_caught === reviewer || b.reviewers_involved.includes(reviewer)
      );

      // Final decision for this task (use the last review)
      const lastReview = taskReviews[taskReviews.length - 1];
      const wasApproved = lastReview.decision === 'approved';
      const hadIssues = taskReviews.some(r => r.issues_found > 0);

      if (missedBugs.length > 0) {
        if (wasApproved) {
          // Approved but had bugs - false negative
          false_negatives += missedBugs.length;
        } else if (hadIssues) {
          // Caught issues AND there were bugs - some true positives
          // But if we still approved after fixes, that's complex
          true_positives += Math.min(taskReviews.reduce((s, r) => s + r.issues_found, 0), missedBugs.length);
        }
      } else {
        // No bugs found for this task
        if (!wasApproved || hadIssues) {
          // Flagged issues but no bugs were found - false positive
          // However, this could also mean they caught actual issues that were fixed
          // For now, we count issues found on approved-after-fixes as valid catches
          const firstReview = taskReviews[0];
          if (firstReview.decision !== 'approved' && wasApproved) {
            // Issues were found and fixed - count as true positive
            true_positives += firstReview.issues_found;
          } else if (!wasApproved) {
            // Rejected/fixes needed but no bug was ever found - false positive
            false_positives += lastReview.issues_found || 1;
          }
        }
      }
    }

    // Calculate metrics
    const total = true_positives + false_positives + false_negatives;
    const accuracy = total > 0 ? true_positives / total : 0;
    const precision = (true_positives + false_positives) > 0
      ? true_positives / (true_positives + false_positives)
      : 0;
    const recall = (true_positives + false_negatives) > 0
      ? true_positives / (true_positives + false_negatives)
      : 0;
    const f1_score = (precision + recall) > 0
      ? 2 * (precision * recall) / (precision + recall)
      : 0;

    // Determine calibration status
    let calibration_status: ReviewerStats['calibration_status'] = 'unknown';
    if (total >= 5) {
      if (false_positives > false_negatives * 2) {
        calibration_status = 'too_strict';
      } else if (false_negatives > false_positives * 2) {
        calibration_status = 'too_lenient';
      } else if (accuracy >= 0.6) {
        calibration_status = 'well_calibrated';
      }
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (calibration_status === 'too_strict') {
      recommendations.push('Consider raising approval threshold - too many false alarms');
      recommendations.push('Focus on distinguishing critical issues from minor ones');
    } else if (calibration_status === 'too_lenient') {
      recommendations.push('Lower approval threshold - missing real bugs');
      recommendations.push('Add more thorough edge case analysis');
      recommendations.push('Consider adding integration test verification');
    }
    if (avg_confidence < 70) {
      recommendations.push('Low confidence scores - consider more specific review criteria');
    }
    if (false_negatives > 0) {
      const missedCategories = bugs
        .filter(b => b.should_have_caught === reviewer)
        .map(b => b.category);
      const uniqueCategories = [...new Set(missedCategories)];
      if (uniqueCategories.length > 0) {
        recommendations.push(`Focus on: ${uniqueCategories.join(', ')} - frequently missed`);
      }
    }

    stats.push({
      reviewer,
      total_reviews: reviews.length,
      approvals,
      rejections,
      fixes_needed,
      total_issues_found,
      avg_issues_per_review: reviews.length > 0 ? total_issues_found / reviews.length : 0,
      avg_confidence: Math.round(avg_confidence * 10) / 10,
      true_positives,
      false_positives,
      false_negatives,
      accuracy: Math.round(accuracy * 1000) / 1000,
      precision: Math.round(precision * 1000) / 1000,
      recall: Math.round(recall * 1000) / 1000,
      f1_score: Math.round(f1_score * 1000) / 1000,
      calibration_status,
      recommendations,
    });
  }

  return stats.sort((a, b) => b.accuracy - a.accuracy);
}

// Format stats for console output
function formatStats(stats: ReviewerStats[]): string {
  const lines: string[] = [];

  lines.push('=' .repeat(80));
  lines.push('REVIEWER ACCURACY REPORT');
  lines.push('=' .repeat(80));
  lines.push('');

  for (const s of stats) {
    lines.push(`Reviewer: ${s.reviewer.toUpperCase()}`);
    lines.push('-'.repeat(40));
    lines.push(`  Reviews: ${s.total_reviews} total (${s.approvals} approved, ${s.fixes_needed} fixes, ${s.rejections} rejected)`);
    lines.push(`  Issues Found: ${s.total_issues_found} total (${s.avg_issues_per_review.toFixed(1)} per review)`);
    lines.push(`  Avg Confidence: ${s.avg_confidence}%`);
    lines.push('');
    lines.push('  Accuracy Metrics:');
    lines.push(`    True Positives:  ${s.true_positives} (correctly identified issues)`);
    lines.push(`    False Positives: ${s.false_positives} (flagged non-issues)`);
    lines.push(`    False Negatives: ${s.false_negatives} (missed real bugs)`);
    lines.push('');
    lines.push(`    Accuracy:  ${(s.accuracy * 100).toFixed(1)}%  (TP / (TP + FP + FN))`);
    lines.push(`    Precision: ${(s.precision * 100).toFixed(1)}%  (TP / (TP + FP))`);
    lines.push(`    Recall:    ${(s.recall * 100).toFixed(1)}%  (TP / (TP + FN))`);
    lines.push(`    F1 Score:  ${(s.f1_score * 100).toFixed(1)}%`);
    lines.push('');
    lines.push(`  Calibration: ${s.calibration_status.replace('_', ' ').toUpperCase()}`);

    if (s.recommendations.length > 0) {
      lines.push('');
      lines.push('  Recommendations:');
      for (const rec of s.recommendations) {
        lines.push(`    - ${rec}`);
      }
    }
    lines.push('');
    lines.push('');
  }

  // Summary
  if (stats.length > 1) {
    lines.push('=' .repeat(80));
    lines.push('SUMMARY');
    lines.push('=' .repeat(80));
    const totalReviews = stats.reduce((s, r) => s + r.total_reviews, 0);
    const avgAccuracy = stats.reduce((s, r) => s + r.accuracy, 0) / stats.length;
    const totalFN = stats.reduce((s, r) => s + r.false_negatives, 0);

    lines.push(`  Total Reviews: ${totalReviews}`);
    lines.push(`  Average Accuracy: ${(avgAccuracy * 100).toFixed(1)}%`);
    lines.push(`  Total Missed Bugs: ${totalFN}`);
    lines.push('');

    // Best and worst performers
    const best = stats[0];
    const worst = stats[stats.length - 1];
    lines.push(`  Best Performer: ${best.reviewer} (${(best.accuracy * 100).toFixed(1)}% accuracy)`);
    lines.push(`  Needs Improvement: ${worst.reviewer} (${(worst.accuracy * 100).toFixed(1)}% accuracy)`);
  }

  lines.push('');
  lines.push('Formula: Accuracy = TP / (TP + FP + FN)');
  lines.push('  TP = True Positives (issues found that were real bugs or prevented bugs)');
  lines.push('  FP = False Positives (issues flagged that weren\'t real problems)');
  lines.push('  FN = False Negatives (bugs that should have been caught but weren\'t)');
  lines.push('');

  return lines.join('\n');
}

// Print help
function printHelp(): void {
  console.log(`
Reviewer Accuracy Statistics Calculator

Analyzes reviewer decisions and post-merge bugs to calculate accuracy metrics.
Use this script to calibrate reviewers over time.

USAGE:
  npx ts-node scripts/reviewer-stats.ts [OPTIONS]

OPTIONS:
  --json         Output in JSON format (for programmatic use)
  --days=N       Only analyze last N days (default: all time)
  --reviewer=X   Filter to specific reviewer type (e.g., spec, quality, adversarial)
  --help         Show this help message

EXAMPLES:
  npx ts-node scripts/reviewer-stats.ts
    Show stats for all reviewers, all time

  npx ts-node scripts/reviewer-stats.ts --days=30
    Show stats for last 30 days

  npx ts-node scripts/reviewer-stats.ts --reviewer=spec --json
    Show JSON stats for spec reviewer only

  npx ts-node scripts/reviewer-stats.ts --days=7 --json > weekly-report.json
    Generate weekly report in JSON format

FILES:
  .claude/logs/reviewer-decisions.jsonl - Reviewer decision log
  .claude/logs/post-merge-bugs.jsonl    - Post-merge bug tracking

See .claude/docs/reviewer-calibration-guide.md for calibration guidance.
`);
}

// Main
function main(): void {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  // Find log files
  const logsDir = path.join(process.cwd(), '.claude', 'logs');
  const decisionsFile = path.join(logsDir, 'reviewer-decisions.jsonl');
  const bugsFile = path.join(logsDir, 'post-merge-bugs.jsonl');

  // Parse data
  let decisions = parseJsonl<ReviewerDecision>(decisionsFile);
  let bugs = parseJsonl<PostMergeBug>(bugsFile);

  // Filter by date if specified
  if (args.days) {
    decisions = filterByDays(decisions, args.days);
    bugs = filterByDays(bugs, args.days);
  }

  // Calculate stats
  const stats = calculateStats(decisions, bugs, args.reviewer);

  // Output
  if (args.json) {
    console.log(JSON.stringify({
      generated_at: new Date().toISOString(),
      period_days: args.days || 'all',
      filter_reviewer: args.reviewer || 'all',
      total_decisions: decisions.length,
      total_bugs: bugs.length,
      reviewers: stats,
    }, null, 2));
  } else {
    console.log(formatStats(stats));
  }
}

main();
