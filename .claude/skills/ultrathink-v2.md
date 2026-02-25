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

## Subagent Philosophy

**Key Principle:** Each subagent focuses on ONE area and becomes the expert in that area. Nothing else.

### Why Fresh Subagents?

1. **Prevents context pollution** - Mixed context from previous phases causes confusion and hallucination
2. **Laser-focused expertise** - A "Requirements" subagent only thinks about requirements, not architecture
3. **Reduces hallucination** - Fresh context prevents bleed-through of assumptions from other areas
4. **Controller synthesizes** - You (the controller) maintain state; subagents do focused work

### The Controller/Subagent Model

```
┌─────────────────────────────────────────────────────────┐
│                      CONTROLLER (You)                    │
│  - Maintains workflow state across phases                │
│  - Synthesizes outputs from subagents                    │
│  - Makes decisions at gates                              │
│  - Owns the Memory section in CLAUDE.md                  │
└─────────────────────────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
   ┌───────────┐     ┌───────────┐     ┌───────────┐
   │ Subagent  │     │ Subagent  │     │ Subagent  │
   │   (Arch)  │     │   (Req)   │     │   (Risk)  │
   │           │     │           │     │           │
   │ ONE FOCUS │     │ ONE FOCUS │     │ ONE FOCUS │
   └───────────┘     └───────────┘     └───────────┘
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
                          ▼
                   Controller synthesizes
```

### Rules for Subagents

**DO:**
- Give each subagent a single, clear focus area
- Provide only the context needed for that focus
- Spawn fresh subagents at each phase transition
- Let subagents be opinionated within their domain

**DO NOT:**
- Carry context between phases (creates pollution)
- Give subagents multiple responsibilities
- Let subagents make decisions outside their focus
- Reuse subagents across different focus areas

### Subagent Spawn Template

Use this template when spawning any subagent:

```
Task tool:
  description: "[Phase N] [Focus Area] Subagent"
  prompt: |
    You are a [ROLE] subagent. Your ONLY focus is [SPECIFIC AREA].

    ## Your Focus
    [One sentence describing exactly what to analyze/produce]

    ## Context Provided
    [Minimal context needed - spec excerpt, file list, etc.]

    ## DO NOT
    - Consider other phases of the workflow
    - Carry assumptions from elsewhere
    - Work outside your focus area
    - Make architectural decisions (unless you're the Arch subagent)
    - Worry about implementation details (unless you're the Implementer)

    ## YOUR JOB
    [Specific deliverable in 2-3 bullets]

    ## Output Format
    [Exact format expected - markdown, JSON, checklist, etc.]
```

### Phase-Specific Subagent Roster

| Phase | Subagents to Spawn | Focus |
|-------|-------------------|-------|
| 0→1 (Brainstorm) | 6 parallel | Arch, Req, Conv, Risk, Dep, Wild |
| 1→2 (Validate) | 1 | Spec validation only |
| 2→3 (Plan) | 3 sequential | Stage A, B, C planning |
| 3→4 (Gates) | 1 per gate | Adversarial review only |
| 4→5 (Implement) | 1 per task | Single task implementation |
| Post-impl | 2 sequential | Spec compliance, Code quality |

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

## Workflow Diagram (with Subagent Spawning)

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
                 | /fast-path-dev  |       |  PHASE 1:       |
                 | (self-review,   |       |  BRAINSTORM     |
                 |  commit, done)  |       +--------+--------+
                 +-----------------+                |
                                                    |
                                    ┌───────────────┼───────────────┐
                                    │    SPAWN 6 PARALLEL SUBAGENTS │
                                    │  ┌─────┬─────┬─────┬─────┬─────┬─────┐
                                    │  │Arch │ Req │Conv │Risk │ Dep │Wild │
                                    │  └─────┴─────┴─────┴─────┴─────┴─────┘
                                    └───────────────┼───────────────┘
                                                    │
                                                    ▼ (synthesize outputs)
                                           +--------+--------+
                                           |  PHASE 2:       |
                                           |  SPEC VALIDATION|
                                           +--------+--------+
                                                    |
                                    ┌───────────────┼───────────────┐
                                    │ SPAWN 1 SPEC-VALIDATOR SUBAGENT│
                                    └───────────────┼───────────────┘
                                                    │
                                       +------------+------------+
                                       |                         |
                                [CRITICAL: YES]          [CRITICAL: NO]
                                       |                         |
                              +--------v--------+       +--------v--------+
                              | Fix spec, loop |       |  PHASE 3: PLAN  |
                              +--------+--------+       +--------+--------+
                                       |                         |
                                       └───────────┐   ┌─────────┼─────────┐
                                                   │   │SPAWN PLANNING SUBAGENTS│
                                                   │   │  Stage A → B → C  │
                                                   │   └─────────┼─────────┘
                                                   │             │
                                                   └─────────────+
                                                                 |
                                                      +----------v---------+
                                                      |  PHASE 4: GATES    |
                                                      +----------+---------+
                                                                 |
                                                  ┌──────────────┼──────────────┐
                                                  │SPAWN ADVERSARIAL-REVIEWER   │
                                                  │  (fresh per gate)           │
                                                  └──────────────┼──────────────┘
                                                                 |
                                                  +──────────────+──────────────+
                                                  |                              |
                                           [Issues: YES]                   [Pass]
                                                  |                              |
                                         +--------v--------+           +─────────v─────────+
                                         | Fix -> Re-review|           |  PHASE 5: IMPL   |
                                         | (iter < 3)      |           +─────────+─────────+
                                         +--------+--------+                     |
                                                  |              ┌───────────────┼───────────────┐
                                         [iter >= 3]             │SPAWN IMPLEMENTER SUBAGENT     │
                                                  |              │  (1 per task, fresh each)     │
                                         +--------v--------+     └───────────────┼───────────────┘
                                         |   ESCALATE     |                      |
                                         | (user decides) |            +─────────v─────────+
                                         +-----------------+           | POST-IMPL REVIEW |
                                                                       +─────────+─────────+
                                                                                 |
                                                           ┌─────────────────────┼─────────────────────┐
                                                           │SPAWN 2 SEQUENTIAL REVIEWERS              │
                                                           │  1. Spec-compliance reviewer             │
                                                           │  2. Code-quality reviewer                │
                                                           └─────────────────────┼─────────────────────┘
                                                                                 |
                                                                       +─────────v─────────+
                                                                       |   LOG DECISION    |
                                                                       | (calibration)     |
                                                                       +─────────+─────────+
                                                                                 |
                                                                       +─────────v─────────+
                                                                       |       DONE        |
                                                                       +───────────────────+
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

### Spawn 6 Parallel Brainstorm Subagents

**IMPORTANT:** Spawn these as 6 separate subagents, each with ONE focus area only.

```
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 1 TRANSITION: Spawn 6 Parallel Brainstorm Subagents          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│  │  ARCH   │  │   REQ   │  │  CONV   │  │  RISK   │  │   DEP   │  │  WILD   │
│  │         │  │         │  │         │  │         │  │         │  │         │
│  │Structure│  │ What    │  │Existing │  │ What    │  │ What    │  │Radical  │
│  │& design │  │ exactly │  │patterns │  │ could   │  │ depends │  │ alter-  │
│  │decisions│  │ needs   │  │ in code │  │go wrong │  │on what? │  │ natives │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Subagent 1: Architecture (Arch)
```
Task tool:
  description: "Phase 1 - Architecture Subagent"
  prompt: |
    You are an ARCHITECTURE subagent. Your ONLY focus is system structure.

    ## Your Focus
    Analyze how this feature fits into the existing architecture.

    ## Context
    [Provide: feature description, relevant file paths]

    ## DO NOT
    - Define requirements (that's Req subagent's job)
    - Identify risks (that's Risk subagent's job)
    - Suggest wild alternatives (that's Wild subagent's job)

    ## YOUR JOB
    - Where does this feature belong in the codebase?
    - What components/modules are affected?
    - What are the structural dependencies?

    ## Output Format
    - Component diagram (ASCII or description)
    - List of affected files/modules
    - Structural decisions needed
```

#### Subagent 2: Requirements (Req)
```
Task tool:
  description: "Phase 1 - Requirements Subagent"
  prompt: |
    You are a REQUIREMENTS subagent. Your ONLY focus is what needs to happen.

    ## Your Focus
    Define exactly what the feature must do, in precise terms.

    ## Context
    [Provide: feature description, user request]

    ## DO NOT
    - Design architecture (that's Arch subagent's job)
    - Worry about how to implement (that's later phases)
    - Consider edge cases deeply (that's Risk subagent's job)

    ## YOUR JOB
    - What are the functional requirements?
    - What are the acceptance criteria?
    - What must be true when done?

    ## Output Format
    - [R1] Requirement 1...
    - [R2] Requirement 2...
    - Acceptance criteria checklist
```

#### Subagent 3: Conventions (Conv)
```
Task tool:
  description: "Phase 1 - Conventions Subagent"
  prompt: |
    You are a CONVENTIONS subagent. Your ONLY focus is existing patterns.

    ## Your Focus
    Identify existing patterns in the codebase that should be followed.

    ## Context
    [Provide: relevant code samples, similar features]

    ## DO NOT
    - Invent new patterns (follow existing ones)
    - Make architectural decisions
    - Define requirements

    ## YOUR JOB
    - What patterns does this codebase use for similar features?
    - What naming conventions apply?
    - What file organization should be followed?

    ## Output Format
    - Pattern 1: [description] - see [file]
    - Pattern 2: [description] - see [file]
    - Conventions to follow: [list]
```

#### Subagent 4: Risk (Risk)
```
Task tool:
  description: "Phase 1 - Risk Subagent"
  prompt: |
    You are a RISK subagent. Your ONLY focus is what could go wrong.

    ## Your Focus
    Identify risks, edge cases, and potential failure modes.

    ## Context
    [Provide: feature description, affected systems]

    ## DO NOT
    - Solve the risks (just identify them)
    - Define requirements
    - Make architectural decisions

    ## YOUR JOB
    - What could fail?
    - What are the edge cases?
    - What are the security concerns?
    - What performance issues might arise?

    ## Output Format
    - RISK-1: [description] - Impact: [H/M/L]
    - RISK-2: [description] - Impact: [H/M/L]
    - Edge cases: [list]
```

#### Subagent 5: Dependencies (Dep)
```
Task tool:
  description: "Phase 1 - Dependencies Subagent"
  prompt: |
    You are a DEPENDENCIES subagent. Your ONLY focus is what depends on what.

    ## Your Focus
    Map dependencies - both what this feature needs and what needs this feature.

    ## Context
    [Provide: feature description, affected modules]

    ## DO NOT
    - Make architectural decisions
    - Define requirements
    - Assess risks

    ## YOUR JOB
    - What existing code does this feature depend on?
    - What will depend on this feature?
    - What is the order of implementation?
    - What can be parallelized?

    ## Output Format
    - Depends on: [module] -> [module] -> [module]
    - Depended on by: [list]
    - Implementation order: [1, 2, 3...]
    - Parallelizable: [groups]
```

#### Subagent 6: Wild Card (Wild)
```
Task tool:
  description: "Phase 1 - Wild Card Subagent"
  prompt: |
    You are a WILD CARD subagent. Your ONLY focus is radical alternatives.

    ## Your Focus
    Challenge assumptions. Propose a completely different approach.

    ## Context
    [Provide: feature description, current thinking]

    ## DO NOT
    - Be conservative (that's everyone else's job)
    - Worry about feasibility (just propose ideas)
    - Filter yourself

    ## YOUR JOB
    - What if we solved this completely differently?
    - What would a 10x simpler solution look like?
    - What assumptions are we making that could be wrong?
    - What would a competitor do?

    ## Output Format
    - Wild idea 1: [description]
    - Wild idea 2: [description]
    - Assumption challenged: [description]
```

### After Subagents Complete

**Controller synthesizes** outputs into a spec document:

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

### Spawn Spec-Validator Subagent

```
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 1→2 TRANSITION: Spawn Spec-Validator Subagent                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Input: Brainstorm spec document from Phase 1                      │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    SPEC-VALIDATOR                            │    │
│  │                                                              │    │
│  │  Focus: Validate spec ONLY (no implementation thinking)     │    │
│  │                                                              │    │
│  │  Checks:                                                     │    │
│  │  ├── Type consistency (UUID vs path, etc.)                  │    │
│  │  ├── Logical consistency (no conflicts)                     │    │
│  │  ├── Dependency validity (things exist)                     │    │
│  │  └── Feasibility (can be done)                              │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Spec-Validator Subagent Template
```
Task tool:
  description: "Phase 2 - Spec Validator Subagent"
  prompt: |
    You are a SPEC VALIDATOR subagent. Your ONLY focus is validating the spec.

    ## Your Focus
    Find problems in the spec BEFORE implementation begins.

    ## Spec to Validate
    [Paste the spec document from Phase 1]

    ## DO NOT
    - Think about implementation
    - Suggest architectural changes
    - Add new requirements
    - Be lenient (your job is to find problems)

    ## YOUR JOB
    Validate these four dimensions:

    1. TYPE CONSISTENCY
       - Do all referenced types exist?
       - Are UUIDs and paths distinguished correctly?
       - Do parameter types match function signatures?

    2. LOGICAL CONSISTENCY
       - Are there conflicting requirements?
       - Are state transitions valid?
       - Are edge cases defined?

    3. DEPENDENCY VALIDITY
       - Do all referenced functions/modules exist?
       - Are all API endpoints available?
       - Are external services accessible?

    4. FEASIBILITY
       - Is the timeline realistic?
       - Are there technical blockers?
       - Can performance requirements be met?

    ## Output Format
    | Check | Finding | Severity | Fix |
    |-------|---------|----------|-----|

    CRITICAL findings block proceeding.
    HIGH findings need mitigation plan.
    MEDIUM/LOW can proceed with documentation.
```

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

### Spawn Planning Subagents (Stages A, B, C)

```
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 2→3 TRANSITION: Spawn Planning Subagents                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Stage A: Spawn 7 parallel analysis subagents                      │
│  ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐                       │
│  │Arch │ Req │Conv │Risk │ Dep │Wild │ DA  │                       │
│  └─────┴─────┴─────┴─────┴─────┴─────┴─────┘                       │
│        ↓ synthesize ↓                                              │
│                                                                     │
│  Stage B: Spawn 3 parallel critique subagents (if complexity > 3)  │
│  ┌─────────────┬─────────────┬─────────────┐                       │
│  │  Critical   │    Alt      │ Feasibility │                       │
│  │  Analysis   │  Explorer   │   Check     │                       │
│  └─────────────┴─────────────┴─────────────┘                       │
│        ↓ refine ↓                                                  │
│                                                                     │
│  Stage C: Spawn 1 Finalization subagent                            │
│  ┌─────────────────────────────────────────┐                       │
│  │           FINALIZER                      │                       │
│  │  Groups tasks, defines gates, outputs   │                       │
│  │  parallel_groups structure              │                       │
│  └─────────────────────────────────────────┘                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Stage A: PLAN

```
@cp("post-plan")
|| Arch|Req|Conv|Risk|Dep|Wild agents
|| DA agent (Devil's Advocate - MUST oppose per INV-4)
[!] ADVERSARIAL REVIEW GATE (max 3 iterations)
```

**Spawn 7 Parallel Subagents for Stage A:**

Each subagent gets ONLY the spec document. No implementation context.

```
Task tool:
  description: "Stage A - [Focus] Subagent"
  prompt: |
    You are a [FOCUS] PLANNING subagent. Your ONLY job is [specific focus].

    ## Spec Document
    [Paste validated spec from Phase 2]

    ## YOUR FOCUS: [One of the following]
    - Arch: How should this be structured? What components?
    - Req: What are the atomic implementation steps? What order?
    - Conv: What existing patterns apply? What conventions to follow?
    - Risk: What could go wrong? What mitigations needed?
    - Dep: What can be parallelized? What's the dependency graph?
    - Wild: What's a radically simpler approach we're missing?
    - DA: What's WRONG with the current approach? (MUST oppose)

    ## DO NOT
    - Work outside your focus area
    - Implement anything
    - Agree with the majority (DA only)

    ## Output Format
    [Focus-specific format - see Phase 1 templates]
```

**Agent Focus:**
- Arch: structure, dependencies
- Req: atomic steps, order
- Conv: existing patterns
- Risk: edge cases, failures
- Dep: parallelizable components
- Wild: radical alternatives
- DA: steelmanned counter-proposal (MUST oppose per INV-4)

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

### Spawn Adversarial-Reviewer Subagent (at each gate)

```
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 3→4 TRANSITION: Spawn Adversarial-Reviewer at Each Gate     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ⚠️  CRITICAL: Fresh subagent for EACH gate                        │
│  ⚠️  Do NOT reuse reviewer across gates (context pollution)        │
│                                                                     │
│  [!] Gate 1 ─────► ┌──────────────────┐                            │
│                    │ ADVERSARIAL-1    │ (fresh)                    │
│                    └──────────────────┘                            │
│                              ↓                                      │
│  [!] Gate 2 ─────► ┌──────────────────┐                            │
│                    │ ADVERSARIAL-2    │ (fresh)                    │
│                    └──────────────────┘                            │
│                              ↓                                      │
│  [!] Gate 3 ─────► ┌──────────────────┐                            │
│                    │ ADVERSARIAL-3    │ (fresh)                    │
│                    └──────────────────┘                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Adversarial-Reviewer Subagent Template
```
Task tool:
  description: "Gate Review - Adversarial Reviewer (Gate N)"
  prompt: |
    You are an ADVERSARIAL REVIEWER subagent. Your ONLY job is to find issues.

    ## What You're Reviewing
    [Paste: output from previous phase/stage]

    ## CRITICAL RULES
    - You MUST find at least 1 issue (Critical/Important/Minor)
    - You are NOT here to validate or approve
    - You are here to break things, find gaps, challenge assumptions
    - "Looks good" is NOT an acceptable output

    ## DO NOT
    - Approve without finding issues
    - Be lenient because the work looks reasonable
    - Skip any checklist item
    - Carry context from previous gates (you are fresh)

    ## YOUR JOB
    Go through EVERY item in the checklist below. Find problems.

    ## Review Checklist
    [Include full checklist - see below]

    ## Output Format
    | Finding | Severity | Location | Fix |
    |---------|----------|----------|-----|

    MUST include at least 1 row.
```

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

### Spawn Implementer Subagents

```
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 4→5 TRANSITION: Spawn Implementer Subagents                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ⚠️  CRITICAL: ONE subagent per task                               │
│  ⚠️  Fresh subagent for each task (no accumulated context)         │
│                                                                     │
│  parallel_groups from Stage C:                                     │
│  [[task1, task2], [task3], [task4, task5]]                         │
│                                                                     │
│  Group 1: Spawn in parallel                                        │
│  ┌──────────────┐  ┌──────────────┐                                │
│  │ IMPLEMENTER  │  │ IMPLEMENTER  │                                │
│  │   Task 1     │  │   Task 2     │                                │
│  └──────────────┘  └──────────────┘                                │
│         ↓ [!] gate ↓                                               │
│                                                                     │
│  Group 2: Sequential (depends on Group 1)                          │
│  ┌──────────────┐                                                  │
│  │ IMPLEMENTER  │ (fresh)                                          │
│  │   Task 3     │                                                  │
│  └──────────────┘                                                  │
│         ↓ [!] gate ↓                                               │
│                                                                     │
│  Group 3: Spawn in parallel                                        │
│  ┌──────────────┐  ┌──────────────┐                                │
│  │ IMPLEMENTER  │  │ IMPLEMENTER  │                                │
│  │   Task 4     │  │   Task 5     │                                │
│  └──────────────┘  └──────────────┘                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Implementer Subagent Template
```
Task tool:
  description: "Implementation - Task [N]: [Task Title]"
  prompt: |
    You are an IMPLEMENTER subagent. Your ONLY job is to implement ONE task.

    ## Task to Implement
    [Task description from plan]

    ## Files You May Modify
    [Specific file list - no others]

    ## Acceptance Criteria
    [From spec - what must be true when done]

    ## DO NOT
    - Implement other tasks (one task only)
    - Modify files outside your list
    - Make architectural changes
    - Skip tests
    - Carry context from other tasks

    ## YOUR JOB
    1. Implement the task
    2. Write/update tests for the task
    3. Verify tests pass
    4. Document what you changed

    ## Output Format
    - Files modified: [list]
    - Tests added/modified: [list]
    - Test output: [paste actual output]
    - Verification: [how you know it works]
```

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

### Post-Implementation: Spawn Review Subagents

After all implementation tasks complete, spawn two sequential review subagents:

```
┌─────────────────────────────────────────────────────────────────────┐
│ POST-IMPLEMENTATION: Spawn 2 Sequential Review Subagents           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ⚠️  CRITICAL: These are DIFFERENT from adversarial gate reviews   │
│  ⚠️  Focus on holistic quality, not just issue-finding            │
│                                                                     │
│  Step 1: Spec Compliance Review                                    │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │               SPEC-COMPLIANCE REVIEWER                       │    │
│  │                                                              │    │
│  │  Focus: Does implementation match spec?                     │    │
│  │  Input: Original spec + implemented code                    │    │
│  │  Output: Compliance checklist with gaps                     │    │
│  └─────────────────────────────────────────────────────────────┘    │
│         ↓ must pass before next step                               │
│                                                                     │
│  Step 2: Code Quality Review                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                CODE-QUALITY REVIEWER                         │    │
│  │                                                              │    │
│  │  Focus: Is the code maintainable and correct?               │    │
│  │  Input: Implemented code only (no spec bias)                │    │
│  │  Output: Quality assessment with improvements               │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Spec-Compliance Reviewer Subagent Template
```
Task tool:
  description: "Post-Impl Review - Spec Compliance"
  prompt: |
    You are a SPEC COMPLIANCE REVIEWER. Your ONLY focus is: does the implementation match the spec?

    ## Original Spec
    [Paste spec from Phase 1/2]

    ## Implemented Code
    [Paste or reference the implemented files]

    ## DO NOT
    - Evaluate code quality (that's the next reviewer's job)
    - Suggest improvements beyond spec compliance
    - Consider things not in the spec

    ## YOUR JOB
    For each requirement in the spec:
    - [ ] R1: [requirement] → Implemented? Where?
    - [ ] R2: [requirement] → Implemented? Where?
    ...

    ## Output Format
    | Requirement | Status | Location | Gap |
    |-------------|--------|----------|-----|

    Status: COMPLETE / PARTIAL / MISSING
```

#### Code-Quality Reviewer Subagent Template
```
Task tool:
  description: "Post-Impl Review - Code Quality"
  prompt: |
    You are a CODE QUALITY REVIEWER. Your ONLY focus is code quality.

    ## Code to Review
    [Paste or reference the implemented files]

    ## DO NOT
    - Check spec compliance (already done)
    - Suggest feature changes
    - Consider the original requirements

    ## YOUR JOB
    Evaluate the code on these dimensions:
    1. Readability - Is the code clear?
    2. Maintainability - Can it be easily modified?
    3. Error handling - Are failures handled?
    4. Logging - Is there appropriate logging?
    5. Testing - Are tests comprehensive?
    6. Security - Any vulnerabilities?

    ## Output Format
    | Dimension | Score (1-10) | Issues | Suggestions |
    |-----------|--------------|--------|-------------|
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

### Workflow Anti-Patterns

| Anti-Pattern | Reality |
|--------------|---------|
| "Skip spec validation, looks simple" | Type bugs are subtle. Always validate. |
| "Reviewer rubber-stamped" | Adversarial mode requires issues. |
| "Just one more iteration" | Max 3, then escalate. No exceptions. |
| "Fast-path for 'small' refactor" | Cross-file = not trivial. Use full flow. |
| "I'll log decisions later" | Log immediately or forget. |
| "Skip brainstorm, I know what to do" | Brainstorm catches blind spots. |

### Subagent Anti-Patterns

| Anti-Pattern | Reality | Fix |
|--------------|---------|-----|
| "Reuse the same reviewer for multiple gates" | Context pollution causes blind spots | Fresh subagent per gate |
| "Give one subagent multiple focus areas" | Jack of all trades, master of none | One focus per subagent |
| "Carry context between phases" | Previous assumptions bleed through | Clear context at phase transitions |
| "Let subagent make decisions outside its focus" | Role confusion, conflicting outputs | Strict focus boundaries |
| "Skip spawning subagent for simple task" | Consistency matters; always use pattern | Spawn even for simple tasks |
| "Controller implements instead of synthesizing" | Controller coordinates, doesn't code | Delegate all implementation |

### Why These Anti-Patterns Fail

**Context Pollution Example:**
```
BAD: Reuse reviewer who saw Phase 1 brainstorming
     → Reviewer assumes things that were discussed but not implemented
     → Misses gaps because "we talked about this"

GOOD: Fresh reviewer with ONLY the implementation
      → Reviews what IS, not what was discussed
      → Catches actual gaps
```

**Multi-Focus Example:**
```
BAD: "Subagent, analyze architecture AND requirements AND risks"
     → Output is shallow on all three
     → Misses depth in each area

GOOD: Three separate subagents, each goes DEEP
      → Architecture subagent: detailed component analysis
      → Requirements subagent: precise acceptance criteria
      → Risk subagent: comprehensive failure modes
```

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
