---
name: ultrathink-temporal
description: Temporal mode workflow with checkpoints, time travel, speculative execution, and prophecy for exploratory design
---

# ULTRATHINK: TEMPORAL MODE

## Overview

Use this variant for exploratory design where late discoveries may invalidate early decisions and backward information flow is valuable.

**Use when**:
- Exploratory design with uncertain requirements
- Prototyping multiple approaches before committing
- When assumptions often prove wrong during implementation
- Iterative refinement with frequent pivots

**Skip when**:
- Requirements are clear and stable
- Time-constrained delivery
- Simple implementation with known patterns

---

## Workflow Structure

```
ULTRATHINK: TEMPORAL MODE
══════════════════════════════════════════════════════════════════

LEGEND: || parallel  -> sequential  [!] gate
        @cp checkpoint  @restore restore  @branch fork
        <<< retroactive edit  ~~> ripple propagation
        @spec speculate  @collapse collapse  @peek prophecy

─── A: PLAN ──────────────────────────────────────────────────────
@cp("genesis")
|| Arch|Req|Conv|Risk|Dep|Wild agents
[!]
@cp("post-plan")

─── B: CRITIQUE ──────────────────────────────────────────────────
@peek {depth: 2, queries: ["What will fail in D?"]}

×2:
  || Critical|AltExplorer|Feasibility (NEW)
  [!]

  @if(@peek.warnings.critical > 0) {
    <<< A.output {reason: @peek.warnings[0], edit: fix}
    ~~> [B]  # re-run with fix
  }

  -> Refinement agent (informed by @peek.prophecy)

@cp("post-critique")

─── C: FINALIZE ──────────────────────────────────────────────────
-> Finalization agent → options[]

@if(options.divergence > threshold) {
  @spec {
    branches: options,
    depth: 1,
    criteria: "predicted_test_pass"
  }

  ─── D-SPECULATIVE (parallel preview) ───────────────────────

  @collapse {winner: argmax(branches)}
}

@cp("post-finalize")

─── D: TEST ──────────────────────────────────────────────────────
D1: || Unit|Integration|EdgeCase writers → [!]
D2: ×4:
    || Gap|FalsePos|Assertion agents → [!] → -> Update

    @if(iteration > 2 && !improving) {
      @restore("post-critique")
      @branch("alt-strategy") { -> AlternativeTest }
    }

D3: Run tests
D4: ✓ → E | ⊗ → D2

@cp("post-test")

─── E: IMPLEMENT ─────────────────────────────────────────────────
per parallel_groups:
  || independent → [!] → -> dependent

  @if(blockers.severe > 0) {
    <<< A.output {reason: "implementation constraint", edit: adjust}
    ~~> ['all']  # full re-cascade
  }

@cp("complete")

COST MULTIPLIERS:
  @spec(N branches): Nx compute
  <<<: 1.5-10x (ripple scope)
  @peek(lightweight): 0.3x per stage
  @cp/@restore: ~0.1x storage
```

---

## Key Mechanisms

### Checkpoints (@cp)

Save workflow state for later restoration.

**Syntax**: `@cp("checkpoint-name")`

**Automatic checkpoints**:
- `@cp("genesis")` - before any work begins
- `@cp("post-plan")` - after planning complete
- `@cp("post-critique")` - after critique cycles
- `@cp("post-finalize")` - after finalization
- `@cp("post-test")` - after tests pass
- `@cp("complete")` - workflow finished

**Manual checkpoints**:
Create custom checkpoints at any point for specific restore targets.

### Restore and Branch (@restore, @branch)

Return to a checkpoint and optionally fork execution.

**Syntax**:
- `@restore("checkpoint-name")` - return to checkpoint
- `@branch("branch-name") { actions }` - fork execution path

**Example**:
```
@if(tests_failing_repeatedly) {
  @restore("post-plan")
  @branch("alt-architecture") {
    -> AlternativeArchAgent
  }
}
```

### Retroactive Edit (<<<)

Modify output from earlier stage and propagate changes forward.

**Syntax**: `<<< Stage.output {reason: "why", edit: "what changed"}`

**Ripple propagation**: `~~> [affected_stages]`

**Example**:
```
<<< A.output {
  reason: "Implementation revealed DB constraint",
  edit: "Changed parallel_groups to serialize DB writes"
}
~~> [B, C]  # B and C must re-run with new A output
```

**Cost**: 1.5-10x depending on ripple scope
- Single stage: ~1.5x
- Two stages: ~3x
- Full cascade: ~10x

### Speculative Execution (@spec, @collapse)

Preview multiple approaches in parallel before choosing.

**Syntax**:
```
@spec {
  branches: [option1, option2, option3],
  depth: N,  # how many stages to preview
  criteria: "evaluation_metric"
}

@collapse {winner: argmax(branches)}
```

**Example**:
```
@spec {
  branches: ["REST API", "GraphQL", "gRPC"],
  depth: 2,  # preview through TEST stage
  criteria: "test_coverage * ease_of_use"
}

// All three approaches tested in parallel

@collapse {winner: "REST API"}  # based on criteria
```

**Cost**: N branches × depth stages

### Prophecy (@peek)

Lightweight forward-looking analysis to inform current decisions.

**Syntax**:
```
@peek {
  depth: N,  # stages to look ahead
  mode: 'lightweight',  # don't run full stages
  queries: ["specific questions"]
}
```

**Example**:
```
@peek {
  depth: 2,
  mode: 'lightweight',
  queries: [
    "What will fail in tests?",
    "What assumptions will break in implementation?"
  ]
}

// Use @peek.prophecy to inform current stage
// Use @peek.warnings to trigger retroactive edits
```

**Cost**: ~0.3x per stage looked ahead

---

## Usage Example

### Exploratory Design

```
Task: "Design caching layer for API (unclear requirements)"

─── A: PLAN ──────────────────────────────────────────────────────
@cp("genesis")

|| Arch agent: Suggests Redis
|| Req agent: Lists cache invalidation needs
|| Conv agent: Found existing in-memory cache
|| Wild agent: What about edge caching (Cloudflare)?

[!] ✓ PASS

@cp("post-plan")

─── B: CRITIQUE ──────────────────────────────────────────────────
@peek {depth: 2, queries: ["What fails in implementation?"]}

@peek.prophecy:
  "Redis introduces latency for small objects.
   In-memory cache sufficient for 80% of use cases.
   Edge caching breaks auth cookies."

×1:
  || Critical: Redis overkill
  || AltExplorer: Hybrid approach?
  || Feasibility: Complex to maintain two caches

  [!] @peek.warnings.critical = 1

  <<< A.output {
    reason: "@peek revealed Redis overkill",
    edit: "Hybrid: in-memory primary, Redis for large/shared"
  }
  ~~> [B]  # re-run critique with new plan

×2:
  || Critical: Hybrid reasonable
  || AltExplorer: Clear split rules needed
  || Feasibility: Manageable complexity

  [!] ✓ PASS

  -> Refinement agent (informed by @peek)

@cp("post-critique")

─── C: FINALIZE ──────────────────────────────────────────────────
-> Finalization agent → options: [
  "In-memory only (simple)",
  "Hybrid (balanced)",
  "Redis only (scalable)"
]

options.divergence = HIGH

@spec {
  branches: options,
  depth: 1,
  criteria: "predicted_test_pass * maintainability"
}

  ─── D-SPECULATIVE ───────────────────────────────────────────

  Branch 1 (in-memory):
    Tests: ✓ pass
    Maintainability: HIGH
    Score: 0.9

  Branch 2 (hybrid):
    Tests: ✓ pass (with split rules)
    Maintainability: MEDIUM
    Score: 0.75

  Branch 3 (Redis):
    Tests: ✓ pass
    Maintainability: MEDIUM
    Score: 0.7

@collapse {winner: "in-memory"}  # highest score

@cp("post-finalize")

─── D: TEST ──────────────────────────────────────────────────────
D1: || Unit|Integration|EdgeCase writers → [!]

D2 ×1:
    || Gap: Missing cache size limits
    || FalsePos: None
    || Assertion: Eviction policy needed

D2 ×2:
    || Gap: None
    || FalsePos: None
    || Assertion: Good

D3: Run tests
    ⊗ FAIL: Cache grows unbounded in load test

    iteration = 2, !improving

    @restore("post-critique")
    @branch("alt-strategy") {
      -> AlternativeTest: LRU eviction tests
    }

D3 (retry): Run tests with LRU
    ✓ PASS

@cp("post-test")

─── E: IMPLEMENT ─────────────────────────────────────────────────
parallel_groups: [
  [cache-utils, lru-eviction],
  [cache-middleware],
  [integration-tests]
]

|| independent (p1)
   ✓ cache-utils
   ⊗ lru-eviction: Memory leak detected

   blockers.severe = 1

   <<< A.output {
     reason: "LRU implementation has memory leak",
     edit: "Use existing LRU library instead of custom"
   }
   ~~> ['all']  # full re-cascade

// Re-run from A with library approach

@cp("complete")
```

---

## Cost Analysis

### Operation Costs

| Operation | Cost Multiplier | Example |
|-----------|-----------------|---------|
| `@cp` | +0.1x | Checkpoint storage |
| `@restore` | +0.1x | State restoration |
| `@peek` (lightweight) | +0.3x per stage | Look 2 stages ahead = +0.6x |
| `<<<` (retroactive edit) | 1.5-10x | Single stage = 1.5x, full cascade = 10x |
| `@spec` (speculative) | Nx per depth | 3 branches × 2 depth = 6x |
| `@collapse` | +0.1x | Choose winner |

### Example Scenario Cost

```
Scenario: API caching layer design (from example above)

Base workflow:        1.0x  (A→B→C→D→E)
+ @peek(2):          +0.6x  (look ahead 2 stages)
+ <<< A ~~> [B]:     +1.5x  (retroactive edit, ripple to B)
+ @spec(3, depth=1): +3.0x  (3 branches, 1 stage deep)
+ @restore + retry:  +0.5x  (restore checkpoint, re-run D)
+ <<< A ~~> [all]:   +10x   (full cascade, re-run all)

Total: ~16.6x base cost

Time savings: Avoided wrong approach (would have been 2-3x full
              workflow iterations without temporal features)
Net benefit: Worth it for exploratory design
```

---

## When to Use Each Feature

### @peek (Prophecy)
- **When**: You suspect current approach will fail later
- **Cost**: Low (0.3x per stage)
- **Benefit**: Proactive course correction

### <<< (Retroactive Edit)
- **When**: Discovery invalidates earlier decision
- **Cost**: Medium-High (1.5-10x)
- **Benefit**: Fix root cause instead of patching

### @spec (Speculative Execution)
- **When**: Multiple viable options, unclear which is best
- **Cost**: High (Nx per depth)
- **Benefit**: Preview all options before committing

### @restore/@branch
- **When**: Current path is dead-end, need fresh start
- **Cost**: Low (0.1x + re-run cost)
- **Benefit**: Safe experimentation without losing work

---

## Integration Notes

**Memory Management**:
- Record checkpoint states in Memory section of CLAUDE.md
- Document retroactive edits and their ripple effects
- Track speculative branch outcomes for learning

**Cleanup**:
- Archive speculative branches after @collapse
- Prune old checkpoints after successful completion
- Keep genesis checkpoint for audit trail

---

## Review Protocol

Same as base ultrathink:

### Scan Order
1. Parse → 2. Structure → 3. Refs → 4. Logic → 5. Consist → 6. Clarity

### Severity
🔴 crit → 🟠 high → 🟡 med → 🟢 low

### Confidence
H (report) | M/L (flag for human)

---

## Quick Reference

```
┌─────────────────────────────────────────────────────────────────┐
│ ULTRATHINK: TEMPORAL                                 ~450 tok  │
├─────────────────────────────────────────────────────────────────┤
│ @cp save  @restore branch  <<< retroedit  ~~> ripple           │
│ @spec speculate  @collapse pick winner  @peek prophecy         │
├─────────────────────────────────────────────────────────────────┤
│ COST: @spec(N)=Nx  <<<:1.5-10x  @peek:0.3x  @cp:0.1x          │
├─────────────────────────────────────────────────────────────────┤
│ A: @cp("gen") || agents → [!] @cp("plan")                      │
│ B: @peek(2) ×2||crit [!] @if(🔴)<<<A~~>[B] → Refine @cp        │
│ C: -> opts @if(diverge)@spec{opts,1}→D-SPEC→@collapse @cp      │
│ D: D1||write D2×4||crit @if(!improving)@restore→@branch D3 D4  │
│ E: per groups @if(blocker)<<<A~~>[all] @cp("done")             │
├─────────────────────────────────────────────────────────────────┤
│ RECOVER: @restore(checkpoint) → @branch("alt-path")            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Token Cost

Approximately **450 tokens** for the core workflow prompt.

Additional overhead (variable):
- Checkpoint storage: +50-100 tokens per checkpoint
- Retroactive edits: +100-500 tokens per edit + ripple
- Speculative branches: +Full workflow cost × N branches
- Prophecy queries: +50-100 tokens per peek

**Total estimated**: Highly variable, 2-20x base workflow depending on exploration needs.

---

## Recommended Practices

1. **Start with @peek**: Cheap way to validate approach before investing
2. **@cp liberally**: Checkpoints are cheap, regret is expensive
3. **@spec judiciously**: Only when genuinely uncertain between options
4. **<<< as last resort**: Try @restore/@branch first if possible
5. **Document ripples**: Track what changed and why for future reference
