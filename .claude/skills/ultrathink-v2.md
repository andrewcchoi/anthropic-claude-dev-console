---
name: ultrathink-v2
description: Integrated workflow combining fast-path checks, brainstorming, spec validation, ultrathink planning, adversarial review gates, iteration limits, and accuracy tracking. The complete subagent-driven development process.
version: 2.0.0
triggers:
  - /ultrathink-v2
  - /ut2
  - When starting complex multi-file changes
  - When feature requires planning before implementation
integrates:
  - fast-path-development
  - spec-validator
  - adversarial-reviewer
  - ultrathink (stages A-E)
  - review-escalation
  - reviewer-calibration-guide
---

# ULTRATHINK V2: Integrated Subagent-Driven Workflow

## Overview

Ultrathink V2 is a complete development workflow that orchestrates multiple skills into a cohesive process. It automatically:

1. **Routes trivial changes** to fast-path (skip full workflow)
2. **Explores requirements** via structured brainstorming
3. **Validates specs** before planning (catches type mismatches early)
4. **Plans with devil's advocate** (ultrathink stages A-C)
5. **Reviews adversarially** at every gate (mandatory issue finding)
6. **Enforces iteration limits** (max 3, then escalate)
7. **Tracks accuracy** for reviewer calibration

---

## Quick Reference Card

```
+======================================================================+
|                    ULTRATHINK V2: INTEGRATED WORKFLOW                 |
+======================================================================+
| ENTRY: Fast-Path Check                                               |
|   Trivial? (<20 lines, 1-2 files, no risky patterns)                |
|   YES -> /fast-path-development (skip all)                          |
|   NO  -> Continue to BRAINSTORM                                      |
+----------------------------------------------------------------------+
| PHASE 0: BRAINSTORM (~15 min)                                        |
|   - Requirements exploration                                         |
|   - Alternative approaches                                           |
|   - Output: Spec document                                            |
+----------------------------------------------------------------------+
| PHASE 1: SPEC VALIDATION (gate)                                      |
|   - Type consistency check                                           |
|   - Logical consistency check                                        |
|   - Dependency check                                                 |
|   - Feasibility check                                                |
|   CRITICAL issues? -> Fix spec, re-brainstorm                        |
+----------------------------------------------------------------------+
| PHASE 2: PLAN (ultrathink Stage A-C)                                 |
|   A: || Arch|Req|Conv|Risk|Dep|Wild || DA -> [!] (max 2 retries)    |
|   B??: || Crit|Alt|Feas (x2) -> Refine                              |
|   C: Finalize(groups, gates)                                         |
+----------------------------------------------------------------------+
| PHASE 3: ADVERSARIAL REVIEW GATES                                    |
|   - Every [!] uses adversarial-reviewer mode                         |
|   - MUST find at least 1 issue                                       |
|   - Max 3 iterations per gate, then ESCALATE                         |
+----------------------------------------------------------------------+
| PHASE 4: IMPLEMENT (ultrathink Stage D-E)                            |
|   D??: Write tests -> Critique (x4) -> Run -> Pass                   |
|   E: per groups || indep -> [!] -> -> dep                            |
+----------------------------------------------------------------------+
| LOGGING: All decisions tracked for calibration                       |
|   - .claude/logs/reviewer-decisions.jsonl                            |
|   - .claude/logs/post-merge-bugs.jsonl                               |
+======================================================================+
```

---

## When to Use

| Scenario | Use Ultrathink V2? | Why |
|----------|-------------------|-----|
| New feature, multiple files | YES | Full planning needed |
| Refactoring with tests | YES | Need spec validation + tests |
| Architecture decision | YES | Need adversarial review |
| Bug fix, <20 lines | NO | Use fast-path |
| Typo fix, comment change | NO | Use fast-path |
| Security-critical change | Consider /ultrathink-adversarial | Higher stakes |
| Exploratory/prototype | Consider /ultrathink-temporal | Unknown requirements |

---

## Workflow Diagram

```
                              +-----------------+
                              |     START       |
                              +--------+--------+
                                       |
                              +--------v--------+
                              | FAST-PATH CHECK |
                              +--------+--------+
                                       |
                          +------------+------------+
                          |                         |
                   [Trivial: YES]            [Trivial: NO]
                          |                         |
                 +--------v--------+       +--------v--------+
                 | /fast-path-dev  |       |   BRAINSTORM    |
                 | (self-review,   |       |  (15 min, spec) |
                 |  commit, done)  |       +--------+--------+
                 +-----------------+                |
                                           +--------v--------+
                                           | SPEC VALIDATION |
                                           +--------+--------+
                                                    |
                                       +------------+------------+
                                       |                         |
                                [CRITICAL: YES]          [CRITICAL: NO]
                                       |                         |
                              +--------v--------+       +--------v--------+
                              | Fix spec, loop |       | PLAN (Stage A)  |
                              +--------+--------+       |  || agents      |
                                       |               |  || DA           |
                                       +---------------+--------+---------+
                                                               |
                                                      +--------v--------+
                                                      | [!] ADV REVIEW  |
                                                      | (max 3 iter)    |
                                                      +--------+--------+
                                                               |
                                                  +------------+------------+
                                                  |                         |
                                           [Issues: YES]              [Pass]
                                                  |                         |
                                         +--------v--------+       +--------v--------+
                                         | Fix -> Re-review|       | Stage B/C       |
                                         | (iter < 3)      |       | (Critique/Final)|
                                         +--------+--------+       +--------+--------+
                                                  |                         |
                                         [iter >= 3]               +--------v--------+
                                                  |                | [!] ADV REVIEW  |
                                         +--------v--------+       +--------+--------+
                                         |   ESCALATE     |                |
                                         | (user decides) |       +--------v--------+
                                         +-----------------+       | Stage D (Tests) |
                                                                   +--------+--------+
                                                                           |
                                                                  +--------v--------+
                                                                  | Stage E (Impl)  |
                                                                  |  per group      |
                                                                  |  [!] ADV REVIEW |
                                                                  +--------+--------+
                                                                           |
                                                                  +--------v--------+
                                                                  |   LOG DECISION  |
                                                                  | (calibration)   |
                                                                  +--------+--------+
                                                                           |
                                                                  +--------v--------+
                                                                  |      DONE       |
                                                                  +-----------------+
```

---

## Phase 0: Fast-Path Check (Entry Gate)

Before starting the full workflow, check if the change qualifies for fast-path.

### Fast-Path Eligibility Criteria

**ALL must be true:**
- 1-2 files modified
- <20 lines changed total
- Change type is one of:
  - Typo fix
  - Comment update
  - Single variable/function rename (same file)
  - Test-only changes (no production code)
  - Logging addition
- **NO** function signature changes
- **NO** API changes
- **NO** cross-file refactors
- **NO** type definition changes
- **NO** export statement changes

### Check Command

```bash
./scripts/check-fast-path-eligible.sh
```

### Decision

| Result | Action |
|--------|--------|
| Eligible | Use `/fast-path-development` - skip all phases |
| Not eligible | Continue to Phase 1: Brainstorm |

---

## Phase 1: Brainstorm (~15 minutes)

Structured exploration of requirements before planning.

### Brainstorm Agents (Parallel)

Launch these agents in parallel:

```
|| Requirements agent: What exactly needs to happen?
|| Alternatives agent: What are different approaches?
|| Constraints agent: What limitations exist?
|| Dependencies agent: What does this depend on?
|| Wild card agent: What's a radically different approach?
|| User perspective agent: What would the user expect?
```

### Brainstorm Output

Create a spec document:

```markdown
## Brainstorm Summary

### Requirements
- [R1] ...
- [R2] ...

### Chosen Approach
...

### Alternatives Considered
1. ... (rejected because ...)
2. ... (rejected because ...)

### Constraints
- [C1] ...

### Dependencies
- [D1] ...

### Open Questions
- [Q1] ... (answer: ...)
```

---

## Phase 2: Spec Validation (Gate)

Run spec validation BEFORE starting ultrathink planning.

### The Four Validations

Use `/spec-validator` or run manually:

#### 1. Type Consistency

```
| Location | Expected Type | Actual Type | Match? | Fix |
|----------|---------------|-------------|--------|-----|
```

**Key checks:**
- Every type referenced exists in codebase
- Parameter types match function signatures
- Return types match consumer expectations
- UUID vs path confusion (common in this codebase!)

#### 2. Logical Consistency

- [ ] No conflicting requirements
- [ ] Edge cases defined
- [ ] State transitions valid
- [ ] Error handling specified

#### 3. Dependency Check

- [ ] All functions/modules exist
- [ ] All API endpoints exist
- [ ] All store fields exist
- [ ] External services accessible

#### 4. Feasibility

- [ ] Performance achievable
- [ ] Security requirements satisfied
- [ ] Timeline realistic
- [ ] No technical blockers

### Validation Gate

| Finding Level | Action |
|---------------|--------|
| CRITICAL | HALT - Fix spec before proceeding |
| HIGH | Document mitigation plan, may proceed |
| MEDIUM | Document in spec, proceed |
| LOW | Proceed |

**If CRITICAL issues found:** Return to Phase 1 (Brainstorm) with findings.

---

## Phase 3: Ultrathink Planning (Stages A-C)

Standard ultrathink planning with adversarial review integration.

### Stage A: PLAN

```
@cp("post-plan")
|| Arch|Req|Conv|Risk|Dep|Wild agents
|| DA agent (Devil's Advocate - MUST oppose per INV-4)
[!] ADVERSARIAL REVIEW GATE (max 3 iterations)
```

**Agent Focus:**
- Arch: structure, dependencies
- Req: atomic steps, order
- Conv: existing patterns
- Risk: edge cases, failures
- Dep: parallelizable components
- Wild: radical alternatives
- DA: steelmanned counter-proposal

### Stage B: CRITIQUE (Conditional)

Skip if complexity <= 3.

```
@cp("post-critique")
x2:
  || Critical|AltExplorer|Feasibility agents (NEW per INV-2)
  [!] ADVERSARIAL REVIEW GATE (max 3 iterations)
  -> Refinement agent (must address DA objections)
```

### Stage C: FINALIZE

```
@cp("post-finalize")
-> Finalization agent:
   1. Group: deps -> setup -> logic -> integration -> polish
   2. Output: parallel_groups[[p1,p2],[p3],[p4,p5]]
   3. Define: test gates per phase
   4. Note: which DA objections incorporated vs dismissed
[!] ADVERSARIAL REVIEW GATE (max 3 iterations)
```

---

## Phase 4: Adversarial Review Gates

Every `[!]` gate uses adversarial-reviewer mode with iteration limits.

### Adversarial Review Protocol

**CRITICAL RULE:** Reviewer MUST find at least 1 issue (Critical/Important/Minor).

#### Minimum Review Checklist

Every review must explicitly check:

**Type Safety:**
- [ ] All function parameters have correct types
- [ ] No implicit `any` types
- [ ] No UUIDs passed where paths expected
- [ ] Return types explicitly declared

**Call Site Integrity:**
- [ ] All call sites of modified functions updated
- [ ] Parameter order matches everywhere
- [ ] Optional parameters handled

**Error Handling:**
- [ ] All failure modes have handling
- [ ] No silent failures
- [ ] Error messages actionable

**Test Coverage:**
- [ ] Tests test behavior (not just mocks)
- [ ] Edge cases have tests
- [ ] Integration points have tests

**Logic Correctness:**
- [ ] Control flow covers all cases
- [ ] Comparisons use correct operators
- [ ] Async/await patterns correct

#### Devil's Advocate Questions

Ask for every change:
1. What could go wrong?
2. What's the weakest part?
3. What would break first?
4. What's untested?
5. What's assumed but not verified?

### Iteration Limits

| Review Type | Max Iterations | Escalation |
|-------------|----------------|------------|
| Spec compliance | 3 | User decision |
| Code quality | 3 | User decision |
| Final review | 2 | Force merge or abandon |

#### Iteration Flow

```
[!] GATE: Review
    Iteration 1: Review finds issues
    -> Fix issues
    Iteration 2: Re-review finds more issues
    -> Fix issues
    Iteration 3: Re-review (FINAL)
    -> If still issues: ESCALATE to user
```

### Escalation Format

When max iterations reached:

```markdown
## Review Escalation Required

After [N] review iterations, these issues remain unresolved:

### Unresolved Issues

1. **[Issue Title]**
   - Implementer position: [X]
   - Reviewer position: [Y]
   - Evidence: [Z]
   - Impact: [W]

### Options

A. **Accept current implementation** (with documented risks)
B. **Abandon task, create new design**
C. **User provides tiebreaker decision**

### Recommendation
[Implementer/Reviewer recommendation]
```

---

## Phase 5: Implementation (Stages D-E)

Standard ultrathink implementation with adversarial gates.

### Stage D: TEST (Conditional)

Skip if no testable code.

```
@cp("post-test")
D1: || Unit|Integration|EdgeCase writers -> [!]
D2: x4:
    || Gap|FalsePos|Assertion agents -> [!] -> Update
    clean -> D3 | issues -> D2
D3: Run per INV-3: || unit -> integration || mutation
D4: pass -> E | fail -> D2 | @restore("post-finalize") if systemic
```

### Stage E: IMPLEMENT

```
per parallel_groups from C:
  || independent -> [!] ADVERSARIAL REVIEW -> -> dependent
```

---

## Phase 6: Accuracy Tracking

Log all reviewer decisions for calibration.

### Decision Log

After each review, append to `.claude/logs/reviewer-decisions.jsonl`:

```json
{
  "timestamp": "2026-02-24T10:00:00Z",
  "task": "feature-xyz",
  "phase": "Stage-A",
  "reviewer": "adversarial",
  "decision": "fixes_needed",
  "issues_found": 3,
  "severity": "important",
  "iterations": 2,
  "confidence": 85
}
```

### Bug Log

When post-merge bugs discovered, append to `.claude/logs/post-merge-bugs.jsonl`:

```json
{
  "timestamp": "2026-02-24T14:00:00Z",
  "task": "feature-xyz",
  "bug_id": "BUG-001",
  "severity": "medium",
  "category": "type-mismatch",
  "description": "UUID passed where path expected",
  "should_have_caught": "spec-validation",
  "root_cause": "workspaceId vs projectId confusion"
}
```

### Accuracy Analysis

Run periodically:

```bash
npx tsx scripts/reviewer-stats.ts --days=30
```

**Target Metrics:**
- Accuracy: >70%
- False positive rate: <20%
- Bug escape rate: <5%
- Average iterations per task: <2

---

## Invariants (Enforced at Every Gate)

These must hold at every `[!]` barrier:

| Invariant | Description | Enforcement |
|-----------|-------------|-------------|
| INV-1 | No CRITICAL issues unresolved | Blocks proceeding |
| INV-2 | Fresh agents each critique | NEW agents per iteration |
| INV-3 | Unit parallel, integration sequential | Test execution order |
| INV-4 | DA must oppose majority | Cannot agree |
| INV-5 | Max 3 iterations per gate | Escalate after limit |

---

## Recovery Paths

### On Gate Failure (Retryable)

```
[!] GATE: INV-1 check
    CRITICAL: Issue found
    -> Fix issue
    [!] Retry (iteration 2/3)
    -> Pass
```

### On Max Iterations Reached

```
[!] GATE: INV-1 check
    CRITICAL: Issue found
    -> Fix issue
    [!] Retry (iteration 3/3) - STILL FAILING

ESCALATE:
  Present to user with options A/B/C
  Await user decision
  Apply decision
  Log outcome
```

### On Systemic Failure

```
D4: Tests failing systemically
    @restore("post-finalize") - approach needs revision
    -> Return to C with test insights
```

### On Workflow Error

```
ON_WORKFLOW_ERROR:
  -> ABORT with diagnostic
  -> @restore("post-plan") for retry if requested
  -> Log failure for calibration
```

---

## Checkpoints

Automatic checkpoints at each phase:

| Checkpoint | Created After | Use For |
|------------|---------------|---------|
| `@cp("post-brainstorm")` | Phase 1 | Restart brainstorming |
| `@cp("post-spec")` | Phase 2 | Re-validate spec |
| `@cp("post-plan")` | Stage A | Restart planning |
| `@cp("post-critique")` | Stage B | Re-critique |
| `@cp("post-finalize")` | Stage C | Re-finalize |
| `@cp("post-test")` | Stage D | Re-test |

Restore with: `@restore("checkpoint-name")`

---

## Token Costs

| Phase | Estimated Tokens |
|-------|-----------------|
| Fast-path check | ~50 |
| Brainstorm | ~300-500 |
| Spec validation | ~200-300 |
| Ultrathink A-C | ~450-600 |
| Adversarial review (per gate) | ~250-350 |
| Stage D (Tests) | ~400-600 |
| Stage E (Implement) | Variable |
| Logging | ~50 |
| **Total (typical)** | ~1,500-2,500 |

**Compared to:**
- Fast-path only: ~50-100 tokens
- Original ultrathink: ~450-600 tokens
- Ultrathink V2 adds: Spec validation + adversarial gates + tracking

---

## Integration with Other Skills

### With Comprehensive Testing

After Stage C (Finalize), generate test checklist:

```bash
npm run generate-checklist feature-xyz
```

Then use in Stage D for TDD.

### With AI Test Healer

If tests fail in Stage D:

```bash
npm run test:heal
```

AI analyzes failures and suggests fixes.

### With Pre-Commit Hooks

Call-site audits run automatically before commit.

If hook fails, fix before committing.

---

## Example Walkthrough

### Task: "Add workspace session auto-selection"

#### Phase 0: Fast-Path Check
```
Files: 5 (SessionList, UISessionItem, ProjectList, store, tests)
Lines: ~200
Risky patterns: YES (cross-file, type changes)

VERDICT: Not eligible -> Continue
```

#### Phase 1: Brainstorm
```
|| Requirements: User clicks workspace, most recent session loads
|| Alternatives: (1) store per-workspace, (2) derive from sessions
|| Constraints: Must handle deleted sessions, empty workspaces
|| Dependencies: workspace store, session store, switchSession()
|| Wild: What if sessions auto-sorted by activity?
|| User: Expect seamless, no extra clicks
```

Output: Spec document created

#### Phase 2: Spec Validation
```
TYPE CONSISTENCY CHECK:
| Location | Expected | Actual | Match |
| switchSession(projectId) | encoded path | UUID | NO |

FINDING: CRITICAL - workspaceId is UUID, projectId expects path

FIX: Add getProjectIdFromWorkspace() helper

Re-validate: PASS
```

#### Phase 3: Planning (Stage A-C)
```
A: || Arch|Req|Conv|Risk|Dep|Wild || DA
   [!] ADV REVIEW: Found missing edge case (deleted session)
   -> Fix: Add validation before selection
   [!] PASS (iteration 2)

B: Skip (complexity=4, threshold=5)

C: Finalize
   parallel_groups: [
     [store-validation, workspace-helpers],
     [UI-components],
     [integration-tests]
   ]
   [!] PASS
```

#### Phase 4: Implementation (Stage D-E)
```
D: Tests written, 45 tests pass

E: Group 1: || store-validation | workspace-helpers
   [!] ADV REVIEW: PASS
   Group 2: UI-components
   [!] ADV REVIEW: Found toast timing issue
   -> Fix
   [!] PASS (iteration 2)
   Group 3: integration-tests
   [!] PASS
```

#### Phase 5: Logging
```json
{
  "task": "workspace-session-selection",
  "phases_completed": ["brainstorm", "spec", "plan", "test", "implement"],
  "total_iterations": 4,
  "issues_found": 3,
  "issues_fixed": 3,
  "escalations": 0
}
```

---

## Anti-Patterns

| Anti-Pattern | Reality |
|--------------|---------|
| "Skip spec validation, looks simple" | Type bugs are subtle. Always validate. |
| "Reviewer rubber-stamped" | Adversarial mode requires issues. |
| "Just one more iteration" | Max 3, then escalate. No exceptions. |
| "Fast-path for 'small' refactor" | Cross-file = not trivial. Use full flow. |
| "I'll log decisions later" | Log immediately or forget. |
| "Skip brainstorm, I know what to do" | Brainstorm catches blind spots. |

---

## Success Criteria

Before completing workflow, verify:

- [ ] Fast-path check performed (or verified not eligible)
- [ ] Brainstorm output exists (or skipped for fast-path)
- [ ] Spec validation passed (no CRITICAL issues)
- [ ] All ultrathink stages completed
- [ ] Every gate passed adversarial review
- [ ] No escalations bypassed (user decided on any)
- [ ] Tests pass (if applicable)
- [ ] Decision logged for calibration
- [ ] Build passes
- [ ] No CRITICAL gaps remaining

---

## Related Documentation

| Resource | Purpose |
|----------|---------|
| `.claude/skills/fast-path-development.md` | Trivial change workflow |
| `.claude/skills/spec-validator.md` | Spec validation details |
| `.claude/skills/adversarial-reviewer.md` | Review mode details |
| `.claude/docs/review-escalation.md` | Escalation procedures |
| `.claude/docs/reviewer-calibration-guide.md` | Accuracy tracking |
| `.claude/skills/ultrathink.md` | Original ultrathink (stages only) |
| `.claude/skills/comprehensive-testing.md` | 5-layer test strategy |

---

## Invocation

```
/ultrathink-v2   # Full workflow
/ut2             # Alias

# Or with options:
/ultrathink-v2 --skip-brainstorm   # Already have spec
/ultrathink-v2 --fast-path-check   # Just check eligibility
```
