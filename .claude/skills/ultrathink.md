---
name: ultrathink
description: Multi-phase agent workflow with parallel orchestration, review gates, and recovery paths for complex implementation tasks
---

# ULTRATHINK: ENHANCED HYBRID WORKFLOW

## Overview

This skill provides a structured multi-phase workflow for complex implementation tasks requiring:
- Deep planning and validation
- Parallel agent orchestration
- Comprehensive review gates
- Explicit recovery paths
- Test-driven development integration

**Use when**: Feature implementation, refactoring, architecture decisions, multi-file changes.

**Skip when**: Simple one-line fixes, trivial tasks, pure research (use Task tool with explore agent instead).

---

## Workflow Structure

```
ULTRATHINK ENHANCED HYBRID
══════════════════════════════════════════════════════════════════

INVARIANTS (enforced at every [!]):
  INV-1: No 🔴 CRITICAL unresolved
  INV-2: Fresh agents each critique
  INV-3: Unit || always, integration -> always
  INV-4: DA must oppose majority (cannot agree)

LEGEND: || parallel  -> sequential  [!] gate  ⊗/✓ fail/pass
        @cp = checkpoint  ?? = runtime conditional

─── A: PLAN ──────────────────────────────────────────────────────
@cp("post-plan")
|| Arch|Req|Conv|Risk|Dep|Wild agents (3-8)
|| DA agent (Devil's Advocate - MUST oppose per INV-4)
   Arch: structure, deps          Risk: edge cases, failures
   Req: atomic steps, order       Test: coverage strategy
   Conv: existing patterns        Dep: parallelizable components
   Wild: radical alternatives     DA: steelmanned counter-proposal
[!] GATE: INV-1 | ⊗ RECOVER: retry (max 2)

─── B??(complexity>3): CRITIQUE ──────────────────────────────────
[CONDITIONAL: skip if task trivial]
@cp("post-critique")
×2:
  || Critical|AltExplorer|Feasibility agents (NEW per INV-2)
  [!] GATE: INV-1 | ⊗ RECOVER: -> A [structural] | -> B [minor]
  -> Refinement agent (must address DA objections)

─── C: FINALIZE ──────────────────────────────────────────────────
@cp("post-finalize")
-> Finalization agent:
   1. Group: deps → setup→logic→integration→polish
   2. Output: parallel_groups[[p1,p2],[p3],[p4,p5]]
   3. Define: test gates per phase
   4. Note: which DA objections were incorporated vs dismissed
[!] GATE: INV-1 | ⊗ RECOVER: -> B | @restore("post-plan") if structural

─── D??(has_tests): TEST ─────────────────────────────────────────
[CONDITIONAL: skip if no testable code]
@cp("post-test")
D1: || Unit|Integration|EdgeCase writers → [!]
D2: ×4:
    || Gap|FalsePos|Assertion agents → [!] → -> Update
    ✓ clean → D3 | ⊗ → D2
D3: Run per INV-3: || unit -> integration || mutation
D4: ✓ pass → E | ⊗ → D2 | @restore("post-finalize") if systemic

─── E: IMPLEMENT ─────────────────────────────────────────────────
per parallel_groups from C:
  || independent → [!] GATE: INV-1, security, perf → -> dependent

ON_WORKFLOW_ERROR: -> ABORT with diagnostic | @restore("post-plan") for retry
```

---

## Review Protocol

Applied at every `[!]` barrier:

### Scan Order

1. **Parse**: syntax, malformed
2. **Structure**: required fields, hierarchy
3. **Refs**: dead links, missing imports
4. **Logic**: contradictions, unreachable
5. **Consist**: naming, terminology drift
6. **Clarity**: ambiguity, jargon

### Severity Levels

| Level | Symbol | Meaning | Action |
|-------|--------|---------|--------|
| Critical | 🔴 | Breaks func/security | MUST fix, blocks |
| High | 🟠 | Significant issue | SHOULD fix before proceed |
| Medium | 🟡 | Best practice violation | FIX or log |
| Low | 🟢 | Style only | LOG only |

### Confidence Ratings

- **H** (High/Certain): REPORT immediately
- **M** (Medium/Probable): FLAG for human review
- **L** (Low/Possible): FLAG for human review

### Output Format

```
|Sev|Conf|Loc |Issue|Action|

Summary: 🔴N🟠N🟡N | Uncertain:N | ✓/⊗
```

---

## Execution Rules

### Core Principles

✓ **Parallelization**: `||` = single message, multiple tool calls
✓ **Barriers**: `[!]` = wait for all parallel work to complete + run gate
✓ **Fresh agents**: NEW agents for each critique cycle (INV-2)
✓ **Test isolation**: Unit || always (parallel), integration -> always (sequential)
✓ **Cumulative tests**: Each phase runs all prior tests
✓ **Phase gates**: Tests must pass to proceed

### Quality Standards

✓ Single-pass exhaustive review
✓ High-confidence reports only (M/L flagged for human)
✓ No placeholders in implementation
✓ Production-ready fixes
✓ Ask user before ambiguous decisions

---

## Anti-Patterns

Stop immediately if thinking:

| Thought | Reality |
|---------|---------|
| "Quick scan first" | Single-pass exhaustive required |
| "Probably fine" | Verify with high confidence |
| "Catch it next pass" | Fix now or block |
| "Too thorough" | Thoroughness prevents rework |

---

## Artifacts

Temporary work stored in: `.claude/ultrathink-temp/{session}/`

Auto-cleanup after successful completion.

---

## Usage Examples

### Simple Feature (Skip Critique)

```
Task: "Add a logout button to navbar"

A: PLAN
  || Arch: navbar component location
  || Req: button placement, onClick handler
  || Conv: existing auth patterns
  || Wild: what if auto-logout on idle?
  || DA: counter - manual logout always better for UX
  [!] ✓ Pass (complexity=2, skip B)

C: FINALIZE
  parallel_groups: [[logout-button], [auth-handler]]
  [!] ✓ Pass

D: Skip (trivial, manual test sufficient)

E: IMPLEMENT
  || logout-button → NavBar.tsx
  [!] ✓ Pass
  -> auth-handler → useAuth.ts
  [!] ✓ Pass
```

### Complex Feature (Full Workflow)

```
Task: "Add user authentication with JWT tokens"

A: PLAN
  || Arch|Req|Conv|Risk|Dep|Wild agents
  || DA: "Why not session-based? Simpler, no JWT complexity"
  [!] 🔴 CRITICAL: WILD raised valid alternative not addressed
      ⊗ RECOVER: retry (1/2)
      → Add decision matrix for JWT vs Session
      [!] ✓ Pass

B: CRITIQUE (complexity=8)
  ×1:
    || Critical|AltExplorer|Feasibility
    [!] 🟠 HIGH: Refresh flow needs detail
        ⊗ RECOVER: -> B [minor]
    -> Refinement: Specify refresh token rotation
  ×2:
    || NEW Critical|AltExplorer|Feasibility
    [!] ✓ Pass

C: FINALIZE
  parallel_groups: [
    [token-utils, password-hashing],
    [auth-middleware],
    [protected-routes, refresh-endpoint],
    [integration-tests]
  ]
  [!] ✓ Pass

D: TEST
  D1: || Unit|Integration|EdgeCase writers
  D2: ×2 critique cycles → clean
  D3: || unit -> integration || mutation
  D4: ✓ pass → E

E: IMPLEMENT
  || p1 → [!] ✓
  -> p2 → [!] ✓
  || p3 → [!] ✓
  -> p4 → [!] ✓
```

---

## Recovery Paths

### Retry on Gate Failure

```
[!] GATE: INV-1 check
    🔴 CRITICAL: Scope ambiguous
    ⊗ RECOVER: retry (1/2)
    → Clarification added
    [!] ✓ Pass
```

### Escalate to Abort

```
[!] GATE: INV-1 check
    🔴 CRITICAL: Duplicate work detected
    ⊗ RECOVER: retry (2/2) - MAX REACHED

ON_WORKFLOW_ERROR:
→ ABORT with diagnostic:
  "Existing implementation found at src/lib/db/pool.ts
   User input required: wrap, replace, or abandon?"
```

### Restore Checkpoint

```
D4: ⊗ tests failing systemically
    @restore("post-finalize") - approach needs revision
    → Return to C with test insights
```

---

## Checkpoints

Automatic checkpoints created at:
- `@cp("post-plan")` - after A completes
- `@cp("post-critique")` - after B completes
- `@cp("post-finalize")` - after C completes
- `@cp("post-test")` - after D completes

Use `@restore("checkpoint-name")` to return to a checkpoint.

---

## Nested Ralph Loop Execution

For autonomous implementation that requires iterative refinement with automatic stopping conditions, use nested Ralph loops with completion promises.

### When to Use Nested Ralph Loops

**Use when**:
- Implementing complex features that need multiple iterations to perfect
- Executing multi-phase plans with review gates between phases
- Need autonomous execution without constant user confirmation
- Want automatic stopping when completion criteria met
- Combining planning + implementation + testing in one flow

**Pattern**: Outer Ralph loop for main task, inner Ralph loops for critical decisions

### Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ NESTED RALPH LOOP PATTERN                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ OUTER LOOP (Implementation):                                   │
│   --max-iterations 4                                            │
│   --completion-promise yakisoba                                 │
│                                                                 │
│   Task: Execute plan with TDD, tests, docs                     │
│                                                                 │
│   ├─ Phase A: Store changes (subagent)                         │
│   ├─ Phase B: Hook updates (subagent)                          │
│   ├─ Phase C: UI components (subagent)                         │
│   │                                                             │
│   │   ┌─ INNER LOOP (Critical Decision):                       │
│   │   │   --max-iterations 4                                   │
│   │   │   --completion-promise turducken                       │
│   │   │                                                         │
│   │   │   Task: Ultrathink analysis of options                 │
│   │   │   Output: <promise>turducken</promise>                 │
│   │   └─                                                        │
│   │                                                             │
│   ├─ Phase D: Integration testing (subagent)                   │
│   └─ Phase E: Documentation (subagent)                         │
│                                                                 │
│   Output: <promise>yakisoba</promise>                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Completion Promise Rules

**CRITICAL**: Never output false promises to escape the loop.

1. **Choose unique promises**: Use food names that are easy to spell exactly
   - Good: `yakisoba`, `turducken`, `cowabunga`, `marshmallow`
   - Bad: `complete`, `done`, `finished` (too generic)

2. **Promise hierarchy**: Nested loops use different promises
   - Outer loop: `yakisoba` (implementation complete)
   - Inner loop: `turducken` (decision made)
   - Another inner: `cowabunga` (analysis done)

3. **Output only when TRUE**: The promise statement must be completely unequivocal
   ```xml
   <promise>yakisoba</promise>
   ```
   - Do NOT output if: tasks incomplete, tests failing, bugs present
   - DO output when: all criteria genuinely met

4. **Max iterations as safety**: Prevents infinite loops
   - Typical: 3-4 iterations for implementation
   - Nested: 2-4 iterations for decisions
   - If max reached without promise: manual intervention needed

### Usage Example

```bash
# User command:
"Use ultrathink brainstorm protocol with nested ralph loops.
max iterations 4, completion promise yakisoba.
For any critical decision, use nested loop: max 4, promise turducken.
Production-ready: maintainable, scalable, performant, secure."

# Implementation:
/ralph-loop --max-iterations 4 --completion-promise yakisoba --task "
  Implement feature X following plan at docs/plans/YYYY-MM-DD-X.md.
  Use ultrathink for critical decisions (nested loop: max 4, promise turducken).
  Execute all tasks without stopping for confirmation.
"
```

### Subagent Management

Use fresh subagents for each phase to manage context:

```
Phase A → Task(subagent_type: general-purpose, description: "Phase A")
Phase B → Task(subagent_type: general-purpose, description: "Phase B")
Phase C → Task(subagent_type: general-purpose, description: "Phase C")
```

**Benefits**:
- Fresh context per phase (no bloat)
- Parallel execution possible
- Isolated failures (one phase fails → others unaffected)
- Clear boundaries between phases

### Critical Decision Points

When encountering critical decisions during implementation, launch nested ultrathink loop:

```
CRITICAL DECISION: Which store should hold lastActiveSessionId?

├─ Launch nested Ralph loop
│  --max-iterations 4
│  --completion-promise turducken
│
├─ Run ultrathink analysis:
│  ├─ Option A: Workspace store (data locality)
│  ├─ Option B: Chat store (session ownership)
│  └─ Option C: Both stores (redundancy)
│
├─ Devil's Advocate critique
├─ Trade-off analysis
├─ Recommendation with rationale
│
└─ Output: <promise>turducken</promise>
```

### Integration with Ultrathink Workflow

Nested Ralph loops enhance ultrathink by:

1. **Stage A (PLAN)**: Outer loop starts, runs planning agents
2. **Stage B (CRITIQUE)**: Nested loop for complex trade-off decisions
3. **Stage C (FINALIZE)**: Return to outer loop, proceed with decision
4. **Stage D (TEST)**: Outer loop continues autonomously
5. **Stage E (IMPLEMENT)**: Outer loop executes with subagents per phase

### Exit Conditions

**Outer loop exits when**:
- Completion promise output (primary)
- Max iterations reached (safety)
- All phases complete + tests pass + docs written

**Inner loop exits when**:
- Decision completion promise output
- Max iterations reached (escalate to user)
- Ultrathink analysis complete with recommendation

### Best Practices

✓ **Clear task descriptions**: Each loop needs precise mission
✓ **Unique promises**: Never reuse promise names
✓ **Context management**: Use subagents + /clear between phases
✓ **Verification before promise**: Run tests, check status, confirm complete
✓ **Max iterations safety net**: Always set reasonable limits (3-5)
✓ **Documentation of decisions**: Record why decisions were made
✓ **Commit frequently**: Each phase commits its work

### Anti-Patterns

✗ **Outputting false promises**: Never lie to escape the loop
✗ **Reusing promise names**: Causes confusion, hard to debug
✗ **No max iterations**: Loop can run forever
✗ **Stopping for confirmation**: Defeats autonomous execution
✗ **Single monolithic phase**: Use subagents to break up work
✗ **Context bloat**: Clear between phases, use Memory section

### Example: Full Implementation Flow

```
User: "Create plan to select most recent session when switching workspaces.
       Use ultrathink with ralph loop, max 4 iterations, promise yakisoba.
       For decisions use nested loop max 4, promise turducken.
       Production-ready, no MVPs."

Claude:
1. Launch brainstorming (tasks 1-6)
   → Creates design doc, implementation plan

2. Launch outer Ralph loop:
   /ralph-loop --max-iterations 4 --completion-promise yakisoba

3. Execute Group A (Store changes):
   → Task(subagent, "implement store, TDD")
   → 15 tests pass ✓

4. Execute Group B (Hook updates):
   → Task(subagent, "implement hook, TDD")
   → 4 tests pass ✓

5. CRITICAL DECISION: Storage location
   → Launch nested loop:
     /ralph-loop --max-iterations 4 --completion-promise turducken
   → Run ultrathink analysis
   → Devil's Advocate critique
   → Output: <promise>turducken</promise>

6. Execute Group C (UI components):
   → Task(subagent, "implement UI, TDD")
   → 12 tests pass ✓

7. Execute Group D (Integration tests):
   → Task(subagent, "integration tests")
   → 14 tests pass ✓

8. Execute Group E (Documentation):
   → Task(subagent, "update docs")
   → All docs updated ✓

9. Verify completion:
   → All 45 tests passing ✓
   → Documentation complete ✓
   → No bugs ✓

10. Output: <promise>yakisoba</promise>
```

### Success Metrics

Track these to know when to output completion promise:

- [ ] All implementation phases complete
- [ ] All tests passing (100% of feature tests)
- [ ] Test coverage >90%
- [ ] Documentation updated (FEATURES, CLAUDE.md, ADR)
- [ ] All git commits made
- [ ] No known bugs or regressions
- [ ] Production-ready (error handling, logging, accessibility)

Only when ALL are true → output completion promise.

---

## Integration with CLAUDE.md

This workflow integrates with the Ultrathink Brainstorm Workflow section in CLAUDE.md.

**Memory Management**:
- Before starting new stage: Update Memory section in CLAUDE.md
- Clear context: Use `/clear` between stages
- Read memory first: Restore context by reading CLAUDE.md

**At Barriers [!]**:
- Wait for all parallel agents
- Update Memory section with agent outputs
- Record parallel_groups structure for tracking

**Test Execution**:
- After each test run: Clear context
- Before clearing: Record results in Memory section
- Keep tests isolated: Fresh context per cycle

---

## When to Use This Skill

**Use when**:
- New feature implementation with multiple approaches
- Code modifications affecting existing behavior
- Architectural decisions needed
- Multi-file changes (>2-3 files)
- Unclear requirements needing exploration
- User preferences matter (multiple valid approaches)

**Skip when**:
- Single-line or few-line fixes
- Obvious bugs with clear solutions
- User gave very specific, detailed instructions
- Pure research/exploration (use Task tool with explore agent)

---

## Variant Selection

For specialized scenarios, consider:

- **Adversarial Mode**: High-stakes, irreversible decisions, security-critical
- **Temporal Mode**: Exploratory design, when assumptions often prove wrong

See `.claude/skills/ultrathink-adversarial.md` and `.claude/skills/ultrathink-temporal.md` for variants.

---

## Quick Reference

```
┌─────────────────────────────────────────────────────────────────┐
│ ULTRATHINK: ENHANCED HYBRID                          ~450 tok  │
├─────────────────────────────────────────────────────────────────┤
│ || parallel  -> seq  [!] gate  ⊗/✓ fail/pass  @cp checkpoint   │
│ ?? conditional  INV invariant  DA devil's advocate             │
├─────────────────────────────────────────────────────────────────┤
│ INV-1: No 🔴 unresolved   INV-3: Unit || / Integ ->            │
│ INV-2: Fresh agents       INV-4: DA must oppose                 │
├─────────────────────────────────────────────────────────────────┤
│ A: @cp || Arch|Req|Conv|Risk|Dep|Wild || DA → [!] ⊗retry(2)    │
│ B??(c>3): @cp ×2 || Crit|Alt|Feas → [!] → Refine               │
│ C: @cp -> Finalize(groups,gates) → [!] ⊗->B                    │
│ D??(tests): @cp D1||write D2×4||crit D3:run D4:✓→E             │
│ E: per groups || indep → [!] → -> dep                          │
├─────────────────────────────────────────────────────────────────┤
│ ERROR: ABORT | @restore("post-plan")                           │
└─────────────────────────────────────────────────────────────────┘
```
