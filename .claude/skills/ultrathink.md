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
