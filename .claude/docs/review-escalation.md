# Review Escalation Protocol

## Purpose

This document defines iteration limits and escalation procedures for subagent-driven development reviews. Without clear limits, review loops can become infinite when implementer and reviewer disagree on issues.

**Goal:** Zero infinite loops, average < 2 iterations per task

---

## Table of Contents

1. [Iteration Limits](#iteration-limits)
2. [Escalation Triggers](#escalation-triggers)
3. [Escalation Format](#escalation-format)
4. [Escalation Process](#escalation-process)
5. [Resolution Options](#resolution-options)
6. [Escalation Examples](#escalation-examples)
7. [Metrics and Monitoring](#metrics-and-monitoring)
8. [Integration with Workflow](#integration-with-workflow)

---

## Iteration Limits

| Review Type | Max Iterations | Escalation Path |
|-------------|----------------|-----------------|
| Spec compliance | 3 | User decision |
| Code quality | 3 | User decision |
| Final review | 2 | Force merge or abandon |

### Why These Limits?

- **3 iterations for most reviews:** Allows implementer to address feedback twice, with one final attempt. Most legitimate issues resolve within 2 iterations.
- **2 iterations for final review:** Final review should catch only missed issues. If still failing after 2 rounds, the fundamental approach may be wrong.
- **User decision as default:** Humans break ties better than AI when reviewers disagree.

### Iteration Counter Rules

1. **Iteration 1:** Initial review
2. **Iteration 2:** Re-review after first round of fixes
3. **Iteration 3:** Re-review after second round of fixes (final for most reviews)

The counter resets when:
- The task scope changes significantly
- The reviewer explicitly acknowledges all previous issues resolved
- User intervenes and resets the process

The counter does NOT reset when:
- Implementer disputes findings (disagreement is not resolution)
- Implementer partially addresses issues
- New issues are discovered (these count as same iteration)

---

## Escalation Triggers

### Automatic Escalation Triggers

| Condition | Trigger |
|-----------|---------|
| Iteration limit reached | Immediate escalation |
| Same issue rejected 3+ times | Escalate that specific issue |
| Reviewer/implementer direct disagreement | Escalate if unresolved after 1 exchange |
| No progress between iterations | Escalate (stalled) |

### Manual Escalation Triggers

Either party can request escalation when:
- Fundamental disagreement on approach
- Requirements ambiguity prevents resolution
- Issue requires expertise neither party has
- Time pressure requires decision acceleration

### Non-Escalation Situations

Do NOT escalate when:
- Implementer is making progress on issues
- Issues are minor style preferences (defer to implementer)
- Reviewer hasn't provided actionable feedback
- Additional context would resolve the disagreement

---

## Escalation Format

When escalation triggers, present to the user:

```
## Review Escalation Required

After [N] review iterations, these issues remain unresolved:

### Unresolved Issues

1. **[Issue Title]**
   - Implementer position: [What implementer says/believes]
   - Reviewer position: [What reviewer says/believes]
   - Evidence: [Code snippets, test results, spec references]
   - Impact: [What happens if issue is not fixed]

2. **[Issue Title]**
   - Implementer position: [X]
   - Reviewer position: [Y]
   - Evidence: [Z]
   - Impact: [W]

### Summary

| Issue | Implementer | Reviewer | Severity |
|-------|-------------|----------|----------|
| Issue 1 | "It's fine because X" | "It's broken because Y" | Critical |
| Issue 2 | "Out of scope" | "Required by spec" | Important |

### Options

A. **Accept current implementation** (with documented risks)
   - Risks: [List what could go wrong]
   - Mitigation: [What to monitor/address later]

B. **Abandon task, create new design**
   - Reason: [Why the approach is fundamentally flawed]
   - Cost: [Estimated rework time]

C. **User provides tiebreaker decision**
   - Question: [Specific question for user to answer]
   - Consequences of each answer: [What happens based on user choice]

### Recommendation

[Implementer/Reviewer recommendation with justification]
```

---

## Escalation Process

### Step 1: Acknowledge Escalation

When iteration limit is reached or escalation is triggered:

```
ESCALATION TRIGGERED: [Reason]
Iteration: [N] of [Max]
Review type: [Spec compliance / Code quality / Final review]

Preparing escalation summary...
```

### Step 2: Gather Evidence

Collect for each unresolved issue:
- Exact code locations
- Spec references (if applicable)
- Test results (if applicable)
- Prior discussion excerpts

### Step 3: Present to User

Use the escalation format above. Ensure:
- All issues are listed (not just the most recent)
- Both positions are fairly represented
- Options are clear and actionable

### Step 4: Await User Decision

Do NOT proceed with implementation until user responds. Options:

| User Says | Action |
|-----------|--------|
| "Accept A" | Document risks, merge |
| "Accept B" | Abandon task, file for redesign |
| "Accept C with [answer]" | Apply user's decision, continue |
| "[Provides new information]" | Re-evaluate with new context |
| "Continue reviewing" | Reset counter, grant extension |

### Step 5: Document Decision

Record in task/PR:
```
## Escalation Resolution

Decision: [A/B/C]
Made by: [User]
Date: [Date]
Rationale: [User's reasoning]
Risks accepted: [If A]
Follow-up actions: [If any]
```

---

## Resolution Options

### Option A: Accept Current Implementation

**When appropriate:**
- Issues are theoretical rather than practical
- Risk is low and mitigatable
- Time pressure requires shipping
- Implementer's position has merit

**Requirements:**
- Document all known risks
- Add TODO comments for deferred issues
- Create follow-up ticket if needed
- Reviewer must acknowledge acceptance

**Example documentation:**
```typescript
// TODO(escalation-2026-02-24): Reviewer raised concern about race condition
// in concurrent session switches. Accepted risk because:
// 1. Race window is <10ms
// 2. Impact is cosmetic (wrong toast message)
// 3. Will address in v2 with proper locking
// Decision: User accepted on 2026-02-24
```

### Option B: Abandon Task

**When appropriate:**
- Fundamental approach is flawed
- Requirements cannot be met with current design
- Cost of fixing exceeds cost of restart
- Discovery of blocking technical limitation

**Requirements:**
- Document why approach failed
- Preserve learnings for next attempt
- Create new task with revised approach
- Don't blame individuals

**Example documentation:**
```
## Task Abandoned: Auto-Select Session

### Reason
The approach of storing lastActiveSessionId in workspace store
conflicts with session discovery flow. Sessions are loaded async,
but workspace selection is sync. This creates race conditions
that cannot be resolved without architectural changes.

### Learnings
- Session state must be source of truth (not workspace state)
- Async selection requires loading indicator
- Consider lazy session discovery instead of upfront

### Next Steps
- Task #42: Redesign with lazy session loading
- Estimated time: 4 hours (vs 2 hours spent on abandoned approach)
```

### Option C: User Tiebreaker

**When appropriate:**
- Both positions have merit
- Need domain expertise
- Policy decision required
- Preference-based disagreement

**How to present:**
```
### Tiebreaker Required

**Question:** Should session selection fallback to most recent session,
or show empty state with "New Chat" button?

**Implementer says:** Most recent session - reduces clicks, user likely
wants to continue recent work.

**Reviewer says:** Empty state - explicit is better, user might want
new chat in different context.

**Consequences:**
- If most recent: Risk of loading wrong session, but faster UX
- If empty state: Extra click required, but user always has control

**My recommendation:** [Either/Neither] because [reason]
```

---

## Escalation Examples

### Example 1: Type Mismatch Disagreement

**Situation:** Reviewer found UUID/path mismatch, implementer says it works in their tests.

**Iteration 1:**
- Reviewer: "switchSession receives UUID but expects projectId (encoded path)"
- Implementer: "Tests pass, leaving as-is"

**Iteration 2:**
- Reviewer: "Still broken. UUID format 'ca31cb4c-...' vs path format '-workspace-docs'"
- Implementer: "That's for different workspaces. Current workspace works."

**Iteration 3:**
- Reviewer: "Critical bug. Will break for all non-default workspaces."
- Implementer: "Out of scope. Current task is default workspace only."

**Escalation:**
```
## Review Escalation Required

After 3 review iterations, these issues remain unresolved:

### Unresolved Issues

1. **UUID vs Encoded Path Type Mismatch**
   - Implementer position: "Out of scope - task only covers default workspace"
   - Reviewer position: "Critical bug - will break for non-default workspaces"
   - Evidence:
     - Code: `switchSession(session.id, workspaceId)` where workspaceId is UUID
     - API expects: `?project=-workspace-docs` (encoded path)
     - Current code sends: `?project=ca31cb4c-4784-...` (UUID)
   - Impact: 404 errors for all non-default workspace sessions

### Options

A. **Accept current implementation**
   - Risks: Non-default workspaces will fail with 404
   - Mitigation: Document limitation, create follow-up task

B. **Abandon task, create new design**
   - Reason: Need to add type conversion layer
   - Cost: ~2 hours to add getProjectIdFromWorkspace()

C. **User provides tiebreaker decision**
   - Question: Is non-default workspace support required for this task?

### Recommendation

Accept B. The type conversion is straightforward and prevents production bugs.
```

### Example 2: Style Disagreement

**Situation:** Reviewer prefers explicit error handling, implementer uses optional chaining.

**Iteration 1:**
- Reviewer: "Add try/catch around async call"
- Implementer: "Using optional chaining, errors return undefined"

**Iteration 2:**
- Reviewer: "Errors should be logged, not silently swallowed"
- Implementer: "Logging adds noise. undefined is handled downstream."

**Escalation:**
```
## Review Escalation Required

After 2 review iterations, style disagreement unresolved:

### Unresolved Issues

1. **Error Handling Style**
   - Implementer: Optional chaining sufficient, errors handled downstream
   - Reviewer: Explicit try/catch with logging for debugging
   - Evidence: Both approaches are valid TypeScript
   - Impact: Debugging may be harder without explicit logging

### Options

A. **Accept current implementation** (optional chaining)
   - Risks: Silent failures harder to debug
   - Mitigation: Can add logging later if issues arise

C. **User provides tiebreaker decision**
   - Question: Prefer explicit error logging or clean code with optional chaining?

### Recommendation

Accept A. This is a style preference, not a bug. Optional chaining is idiomatic.
```

### Example 3: Performance Disagreement

**Situation:** Reviewer concerned about O(n) loop, implementer says n is small.

**Iteration 1:**
- Reviewer: "O(n^2) complexity in nested loop"
- Implementer: "Max 50 sessions, performance is fine"

**Iteration 2:**
- Reviewer: "Could grow to thousands of sessions"
- Implementer: "YAGNI - optimize when needed"

**Iteration 3:**
- Reviewer: "Architecture decision - should build for scale"
- Implementer: "Premature optimization is root of all evil"

**Escalation:**
```
## Review Escalation Required

After 3 review iterations, performance disagreement unresolved:

### Unresolved Issues

1. **O(n^2) Session Search**
   - Implementer: "YAGNI - max 50 sessions currently, optimize later"
   - Reviewer: "Architecture decision - should use Map for O(1) lookup"
   - Evidence:
     - Current: `sessions.find(s => s.id === id)` inside loop
     - Alternative: `sessionMap.get(id)`
   - Impact: 50 sessions = 2500 ops (fast), 1000 sessions = 1M ops (slow)

### Options

A. **Accept current implementation**
   - Risks: Will need refactor if session count grows
   - Mitigation: Add TODO, monitor session counts

B. **Fix now** (recommended by reviewer)
   - Cost: ~30 minutes to add sessionMap
   - Benefit: Future-proof, better architecture

### Recommendation

Accept A. Current usage is <50 sessions. Add TODO for future optimization.
Risk is low and fix is straightforward if needed later.
```

---

## Metrics and Monitoring

### Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Average iterations per task | < 2 | Count review rounds |
| Escalation rate | < 10% | Escalations / Total reviews |
| Infinite loops | 0 | Tasks exceeding limits |
| User satisfaction | > 80% | Post-escalation survey |

### Tracking

For each task, record:
```
task_id: string
review_type: "spec" | "code" | "final"
iterations: number
escalated: boolean
resolution: "A" | "B" | "C" | null
time_spent: minutes
outcome: "merged" | "abandoned" | "ongoing"
```

### Red Flags

Investigate if:
- Same reviewer/implementer pair consistently escalates
- Same issue type repeatedly causes escalation
- Escalation rate exceeds 20% for a period
- User frequently overrides reviewer decisions

---

## Integration with Workflow

### With Subagent-Driven Development

```
┌─────────────────────────────────────────────────────────────┐
│ Per Task:                                                    │
│ 1. Implementer builds feature                                │
│ 2. Spec reviewer (max 3 iterations)                         │
│    └── If limit reached → ESCALATE                          │
│ 3. Code reviewer (max 3 iterations)                         │
│    └── If limit reached → ESCALATE                          │
│ 4. Final review (max 2 iterations)                          │
│    └── If limit reached → Force decision                    │
│ 5. Mark task complete                                        │
└─────────────────────────────────────────────────────────────┘
```

### With Ultrathink Workflow

Escalation fits into ultrathink review gates:

```
Stage E (Implementation):
  Per group → Implement → Review gate

  Review gate:
    iteration = 1
    while (issues && iteration <= limit):
      fix issues
      re-review
      iteration++

    if (iteration > limit):
      ESCALATE to user
      await decision
      apply decision

    proceed to next group
```

### With Adversarial Review

Adversarial reviewers are more likely to find issues, potentially increasing iterations. Compensate by:

1. Setting clearer acceptance criteria upfront
2. Allowing one "style" issue to pass (don't block on minor)
3. Using 3-iteration limit strictly (adversarial is thorough enough)

---

## Related Documentation

- [Adversarial Reviewer Guide](./adversarial-reviewer-guide.md)
- [Spec Validation Examples](./spec-validation-examples.md)
- [Ultrathink Workflow](./../skills/ultrathink.md)
