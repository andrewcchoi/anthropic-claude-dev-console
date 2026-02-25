# Reviewer Calibration Guide

This guide explains how to track reviewer accuracy, interpret metrics, and calibrate reviewers over time to improve the subagent-driven development workflow.

## Overview

Reviewer accuracy tracking helps identify:
- **Too-strict reviewers**: Flag many issues that aren't real problems (high false positives)
- **Too-lenient reviewers**: Miss real bugs that make it to production (high false negatives)
- **Well-calibrated reviewers**: Balance between catching issues and not blocking progress

## Quick Start

### 1. Log Reviewer Decisions

After each review, append to `.claude/logs/reviewer-decisions.jsonl`:

```json
{"timestamp":"2026-02-24T10:00:00Z","task":"task-1","reviewer":"spec","decision":"approved","issues_found":0}
```

### 2. Log Post-Merge Bugs

When bugs are discovered, append to `.claude/logs/post-merge-bugs.jsonl`:

```json
{"timestamp":"2026-02-24T14:00:00Z","task":"task-1","bug_id":"BUG-001","severity":"medium","category":"integration","description":"API returns 404","reviewers_involved":["spec","quality"],"should_have_caught":"integration","root_cause":"Type mismatch","time_to_discovery":"4h"}
```

### 3. Analyze Statistics

```bash
# Run the stats calculator
npx ts-node scripts/reviewer-stats.ts

# Last 30 days only
npx ts-node scripts/reviewer-stats.ts --days=30

# JSON output for dashboards
npx ts-node scripts/reviewer-stats.ts --json > stats.json
```

---

## Accuracy Formula

```
Accuracy = True Positives / (True Positives + False Positives + False Negatives)
```

### Definitions

| Term | Definition | Example |
|------|------------|---------|
| **True Positive (TP)** | Reviewer flagged an issue that was a real problem | Found missing error handling that would have caused crashes |
| **False Positive (FP)** | Reviewer flagged an issue that wasn't a real problem | Requested refactor that didn't affect functionality |
| **False Negative (FN)** | Reviewer approved, but there was a bug | Approved code that later caused production errors |

### Related Metrics

| Metric | Formula | Meaning |
|--------|---------|---------|
| **Precision** | TP / (TP + FP) | "When I flag an issue, how often am I right?" |
| **Recall** | TP / (TP + FN) | "Of all the bugs, how many did I catch?" |
| **F1 Score** | 2 * (P * R) / (P + R) | Balance between precision and recall |

---

## Calibration Status

### Well-Calibrated (Target: 70%+ Accuracy)

Characteristics:
- False positives and false negatives are roughly balanced
- Reviews don't significantly slow down development
- Most flagged issues are legitimate
- Post-merge bug rate is low

### Too Strict (High False Positives)

Symptoms:
- Many review iterations for minor issues
- Developer frustration with "nitpicking"
- Long time-to-merge
- Low bug rate (but at what cost?)

Causes:
- Overly literal interpretation of requirements
- Perfectionism over pragmatism
- Not distinguishing severity levels

Calibration Actions:
1. Raise approval threshold for minor issues
2. Use severity levels (only block on CRITICAL)
3. Focus on likely production impact, not theoretical issues
4. Ask "Would this actually cause a bug?"

### Too Lenient (High False Negatives)

Symptoms:
- Quick approvals
- Frequent post-merge bugs
- "Rubber stamp" reviews
- Users report issues

Causes:
- Insufficient time spent on review
- Missing edge case analysis
- Not running code/tests
- Trusting implementation without verification

Calibration Actions:
1. Lower approval threshold
2. Add mandatory test execution
3. Require integration test evidence
4. Use adversarial reviewer for critical paths
5. Add checklist for common bug categories

---

## Reviewer Types and Their Focus

| Reviewer Type | Primary Focus | Common FN Categories | Common FP Categories |
|---------------|---------------|----------------------|----------------------|
| **spec** | Requirements match | Missing features | Over-engineering |
| **quality** | Code quality | Edge cases, error handling | Style issues |
| **adversarial** | Deliberate opposition | Integration issues | Theoretical concerns |
| **security** | Security vulnerabilities | Auth, injection, validation | Defense-in-depth overkill |
| **integration** | System interactions | Cross-component bugs | Performance worries |

---

## Logging Best Practices

### Decision Log Format

```jsonl
{
  "timestamp": "2026-02-24T10:00:00Z",  // ISO 8601
  "task": "task-1",                       // Task identifier
  "reviewer": "spec",                     // Reviewer type
  "decision": "approved",                 // approved | fixes_needed | rejected
  "issues_found": 0,                      // Count of issues
  "severity": "none",                     // critical | medium | low | none
  "confidence": 85,                       // 0-100 confidence score
  "notes": "Optional context"             // Free-form notes
}
```

### Bug Log Format

```jsonl
{
  "timestamp": "2026-02-24T14:00:00Z",
  "task": "task-1",                       // Links to decisions
  "bug_id": "BUG-001",                    // Bug tracker ID
  "severity": "medium",                   // critical | high | medium | low
  "category": "integration",              // logic | security | performance | ux | data | integration
  "description": "Brief description",
  "reviewers_involved": ["spec", "quality"],  // Who reviewed this task
  "should_have_caught": "integration",    // Which reviewer should have found it
  "root_cause": "Type mismatch",          // What was the underlying issue
  "time_to_discovery": "4h"               // How long after merge
}
```

### Logging Guidelines

1. **Log every review decision** - Even approvals with no issues
2. **Log bugs promptly** - Within 24h of discovery
3. **Be honest about "should_have_caught"** - This is for learning, not blame
4. **Include root cause** - Helps identify systemic issues
5. **Track time to discovery** - Faster discovery = less impact

---

## Interpreting the Report

### Sample Report

```
Reviewer: SPEC
----------------------------------------
  Reviews: 15 total (10 approved, 4 fixes, 1 rejected)
  Issues Found: 8 total (0.5 per review)
  Avg Confidence: 78.5%

  Accuracy Metrics:
    True Positives:  6 (correctly identified issues)
    False Positives: 2 (flagged non-issues)
    False Negatives: 1 (missed real bugs)

    Accuracy:  66.7%  (TP / (TP + FP + FN))
    Precision: 75.0%  (TP / (TP + FP))
    Recall:    85.7%  (TP / (TP + FN))
    F1 Score:  80.0%

  Calibration: NEEDS IMPROVEMENT

  Recommendations:
    - Focus on: integration - frequently missed
```

### What to Look For

1. **Accuracy < 60%**: Major calibration needed
2. **Precision < 70%**: Too many false alarms - raise threshold
3. **Recall < 70%**: Missing too many bugs - lower threshold
4. **Confidence vs Accuracy mismatch**: Reviewer is miscalibrated
5. **Repeated categories in FN**: Systematic blind spot

---

## 30-Day Improvement Cycle

### Week 1: Baseline
- Start logging all reviews
- Log all post-merge bugs with reviewers_involved
- Generate baseline report

### Week 2: Identify Patterns
- Which reviewers have highest FN rates?
- Which bug categories are most missed?
- What's the avg time-to-discovery?

### Week 3: Calibrate
- Address top 2 issues identified
- Update reviewer guidelines
- Add targeted checklists

### Week 4: Measure
- Generate comparison report
- Track improvement percentage
- Document what worked

### Success Metric

**Target: 10% accuracy improvement over 30 days**

| Week | Target Accuracy |
|------|-----------------|
| 1 | Baseline (e.g., 65%) |
| 2 | +3% (68%) |
| 3 | +5% (70%) |
| 4 | +10% (75%) |

---

## Integration with Workflow

### In Ultrathink Workflow

```
Stage C (Plan Finalization):
  - Review gate: Log decision to reviewer-decisions.jsonl

Stage E (Implementation):
  - Per-group reviews: Log each decision

Post-Merge:
  - Bug discovered: Log to post-merge-bugs.jsonl
  - Weekly: Run reviewer-stats.ts
```

### Automated Logging

For automated workflows, add logging after each review:

```typescript
// After review completion
const decision = {
  timestamp: new Date().toISOString(),
  task: taskId,
  reviewer: reviewerType,
  decision: reviewResult,
  issues_found: issues.length,
  severity: getHighestSeverity(issues),
  confidence: reviewerConfidence,
};
appendToLog('.claude/logs/reviewer-decisions.jsonl', decision);
```

---

## Troubleshooting

### "No data" in report

Ensure log files exist and have valid JSONL entries (not just comments).

### Metrics seem wrong

1. Check task IDs match between decisions and bugs
2. Verify `should_have_caught` is set correctly
3. Ensure all reviewers are logged (not just final approval)

### High variance in metrics

Need more data. Minimum 10 reviews per reviewer for meaningful statistics.

---

## References

- `.claude/logs/reviewer-decisions.jsonl` - Decision log
- `.claude/logs/post-merge-bugs.jsonl` - Bug tracking
- `scripts/reviewer-stats.ts` - Statistics calculator
- `.claude/docs/adversarial-reviewer-guide.md` - Adversarial reviewer details
- `.claude/docs/review-escalation.md` - Escalation procedures
