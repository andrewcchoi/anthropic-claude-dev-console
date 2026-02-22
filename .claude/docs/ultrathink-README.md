# Ultrathink Multi-Phase Agent Workflow System

Comprehensive multi-phase agent orchestration framework for complex implementation tasks, featuring parallel execution, review gates, and recovery paths.

---

## Quick Start

### Basic Usage

```bash
# Invoke the skill
/ultrathink

# Or use Skill tool
Skill(skill: "ultrathink")
```

Then provide your task:
```
"Add user authentication to the application"
```

The workflow will automatically:
1. Plan with 7 parallel agents
2. Critique with 2 iterations (if complex)
3. Finalize execution strategy
4. Generate and review tests
5. Implement with parallel execution

---

## Workflow Variants

### 1. Enhanced Hybrid (Default)

**File**: `.claude/skills/ultrathink.md`

**Use for**: Most implementation tasks

**Features**:
- Parallel agent orchestration
- Automatic stage skipping (simple tasks)
- Devil's Advocate (forced opposition)
- Conditional critique cycles
- Test generation and review
- Recovery paths

**Token cost**: ~450 tokens

**Invoke**:
```bash
/ultrathink
```

---

### 2. Adversarial Mode

**File**: `.claude/skills/ultrathink-adversarial.md`

**Use for**:
- High-stakes decisions
- Security-critical architecture
- Irreversible choices
- Novel problems

**Features**:
- Credibility (CRED) betting system
- Debate structure (THESIS → ANTITHESIS → SYNTHESIS)
- Veto system (HARD/SOFT)
- Forced opposition
- Escalation triggers

**Token cost**: ~700-1000 tokens

**Invoke**:
```bash
/ultrathink-adversarial
```

---

### 3. Temporal Mode

**File**: `.claude/skills/ultrathink-temporal.md`

**Use for**:
- Exploratory design
- Uncertain requirements
- Frequent pivots
- Late discoveries expected

**Features**:
- Checkpoints and restore
- Retroactive editing with ripple propagation
- Speculative execution (preview branches)
- Prophecy (peek ahead)
- Time travel (backward info flow)

**Token cost**: ~900-9000 tokens (variable, exploration-dependent)

**Invoke**:
```bash
/ultrathink-temporal
```

---

## Documentation

### Reference Materials

| Document | Purpose | Location |
|----------|---------|----------|
| **Usage Examples** | Real-world examples for each variant | `.claude/docs/ultrathink-examples.md` |
| **Verification Guide** | Test cases and validation procedures | `.claude/docs/ultrathink-verification.md` |
| **This README** | Overview and getting started | `.claude/docs/ultrathink-README.md` |

### Skill Files

| Skill | File | Description |
|-------|------|-------------|
| `/ultrathink` | `.claude/skills/ultrathink.md` | Enhanced Hybrid workflow |
| `/ultrathink-adversarial` | `.claude/skills/ultrathink-adversarial.md` | Adversarial mode variant |
| `/ultrathink-temporal` | `.claude/skills/ultrathink-temporal.md` | Temporal mode variant |

---

## Workflow Stages

### Stage A: PLAN
- Spawn 7 agents in parallel: Arch, Req, Conv, Risk, Dep, Wild, DA
- DA agent MUST oppose consensus (INV-4)
- Review gate: Parse → Structure → Refs → Logic → Consist → Clarity
- Checkpoint: `@cp("post-plan")`

### Stage B: CRITIQUE (conditional)
- Skip if complexity < 3
- 2 iterations with fresh agents (INV-2)
- Critical, AltExplorer, Feasibility agents
- Refinement agent addresses findings
- Checkpoint: `@cp("post-critique")`

### Stage C: FINALIZE
- Output `parallel_groups` structure
- Define test gates per phase
- Note DA objections (incorporated vs dismissed)
- Checkpoint: `@cp("post-finalize")`

### Stage D: TEST (conditional)
- Skip if no testable code
- D1: Unit, Integration, EdgeCase writers
- D2: Up to 4 critique cycles (Gap, FalsePos, Assertion)
- D3: Run tests (Unit || / Integration -> / Mutation ||)
- D4: Pass → E, Fail → D2 or restore
- Checkpoint: `@cp("post-test")`

### Stage E: IMPLEMENT
- Execute per `parallel_groups`
- Independent groups run in parallel
- Dependent groups run sequentially
- Gates at each group: INV-1 + security + perf
- Checkpoint: `@cp("complete")`

---

## Key Concepts

### Invariants (INV)

Must be enforced at every `[!]` gate:

| ID | Rule | Enforcement |
|----|------|-------------|
| **INV-1** | No 🔴 CRITICAL unresolved | Block gate until fixed |
| **INV-2** | Fresh agents each critique | NEW agents per iteration |
| **INV-3** | Unit \|\| always, integration -> always | Test execution order |
| **INV-4** | DA must oppose majority | DA cannot agree with consensus |

### Notation

| Symbol | Meaning |
|--------|---------|
| `||` | Parallel execution (single message, multiple Task calls) |
| `->` | Sequential dependency |
| `[!]` | Barrier + review gate |
| `×N` | Iterate max N times |
| `✓` | Pass/success |
| `⊗` | Fail/block |
| `??` | Conditional execution |
| `@cp` | Save checkpoint (Temporal) |
| `@restore` | Load checkpoint (Temporal) |
| `<<<` | Retroactive edit (Temporal) |
| `~~>` | Ripple propagation (Temporal) |
| `@peek` | Prophecy/look ahead (Temporal) |
| `@spec` | Speculative execution (Temporal) |
| `⚔️` | Debate round (Adversarial) |
| `🛡️` | Veto point (Adversarial) |
| `💰` | Credibility bet (Adversarial) |

### Severity Levels

| Symbol | Level | Meaning | Action |
|--------|-------|---------|--------|
| 🔴 | Critical | Breaks functionality/security | MUST fix, blocks gate |
| 🟠 | High | Significant issue | SHOULD fix before proceed |
| 🟡 | Medium | Best practice violation | FIX or log |
| 🟢 | Low | Style only | LOG only |

---

## When to Use Each Variant

```
┌─────────────────────────────────────────────────────────────────┐
│ WHICH VARIANT?                                                  │
├─────────────────────────────────────────────────────────────────┤
│ Routine feature............... ENHANCED HYBRID                  │
│ High-stakes/irreversible...... ADVERSARIAL                      │
│ Security-critical............. ADVERSARIAL                      │
│ Exploratory/prototype......... TEMPORAL                         │
│ Novel problem................. ADVERSARIAL                      │
│ Iterative refinement.......... TEMPORAL                         │
│ Time-constrained.............. ENHANCED HYBRID                  │
│ Unknown complexity............ ENHANCED HYBRID (?? conditionals)│
└─────────────────────────────────────────────────────────────────┘
```

### Decision Tree

```
Is the decision high-stakes or irreversible?
├─ YES → ADVERSARIAL MODE
│   └─ Are requirements also uncertain?
│       └─ YES → Mix Adversarial + Temporal (add @cp to debate stages)
│
└─ NO → Are requirements clear and stable?
    ├─ YES → ENHANCED HYBRID (default)
    └─ NO → TEMPORAL MODE
```

---

## Integration with CLAUDE.md

The ultrathink workflow integrates with the project's `CLAUDE.md` for memory management.

### Memory Management Pattern

**Before starting new stage**:
1. Update Memory section in CLAUDE.md with key learnings
2. Clear context: `/clear`
3. Read CLAUDE.md to restore persistent context

**At Barriers [!]**:
1. Wait for all parallel agents to complete
2. Update Memory section with agent outputs and findings
3. Record parallel_groups structure (from stage C)

**Test Execution (Stage D)**:
1. After each test run: Clear context
2. Before clearing: Record test results in Memory section
3. Keep tests isolated: Fresh context per cycle
4. Log test gate results: Document pass/fail

### Memory Section Format

```markdown
## Memory

### Current State
- Project phase: [phase]
- Stage: [A/B/C/D/E]
- Checkpoint: [latest checkpoint]

### Key Decisions
- [Decision]: [rationale]

### Learnings
- [Learning from this stage]

### Blockers
- [Current blockers if any]

### Next Steps
- [What's next]
```

---

## Examples

### Example 1: Simple Feature

```
Task: "Add a logout button to navbar"

Workflow:
A: PLAN (complexity=2) → ✓
B: SKIPPED (complexity < 3)
C: FINALIZE → parallel_groups: [[logout-button], [auth-handler]]
D: SKIPPED (trivial)
E: IMPLEMENT → || logout-button → [!] → -> auth-handler → [!]

Outcome: ✓ SUCCESS
Tokens: ~500
```

### Example 2: Complex Feature

```
Task: "Add user authentication with JWT"

Workflow:
A: PLAN → 🔴 (DA objection) → retry → ✓
B: CRITIQUE ×2 → refinements → ✓
C: FINALIZE → parallel_groups: [[utils],[middleware],[endpoints],[tests]]
D: TEST → D1 writers → D2 ×2 critique → D3 run → ✓
E: IMPLEMENT → per groups → ✓

Outcome: ✓ SUCCESS (session-based auth instead of JWT after DA input)
Tokens: ~2500
```

### Example 3: Adversarial Decision

```
Task: "Choose authentication system for healthcare app (HIPAA)"

Workflow:
A: POSITIONS → CONSENSUS: OAuth / DA: FIDO2 (💰 staked)
B: DEBATE → THESIS/ANTITHESIS/SYNTHESIS → unresolved_tensions
   → @spec {branches: [OAuth, FIDO2, Hybrid]} → @collapse: Hybrid
C: CRITIQUE → 💰 CRED resolution
D: FINALIZE → no vetoes → ✓
E: IMPLEMENT

Outcome: ✓ SUCCESS (Hybrid FIDO2+OAuth with staged rollout)
Tokens: ~1200
```

### Example 4: Temporal Exploration

```
Task: "Design caching layer (requirements unclear)"

Workflow:
A: PLAN → @cp("genesis")
B: @peek {depth: 2} → prophecy: "Redis slower than in-memory"
   → <<< A.output (change to hybrid) → ~~> [B]
C: @spec {branches: [in-memory, hybrid, Redis]} → @collapse: in-memory
D: TEST → ⊗ (memory leak) → @restore("post-critique")
E: IMPLEMENT → ⊗ (leak) → <<< A (use library) → ~~> [all]
   → Re-run full workflow → ✓

Outcome: ✓ SUCCESS (simple in-memory with LRU library)
Tokens: ~7500 (high exploration cost, justified by avoiding production issues)
```

---

## Best Practices

### DO

✓ Use Enhanced Hybrid by default
✓ Launch multiple agents in single message (parallel)
✓ Wait for all parallel work at `[!]` barriers
✓ Use fresh agents each critique cycle (INV-2)
✓ Block on 🔴 CRITICAL findings (INV-1)
✓ Document DA objections (incorporated vs dismissed)
✓ Update Memory section at stage boundaries
✓ Clear context between stages (`/clear`)
✓ Store temp artifacts in `.claude/ultrathink-temp/{session}/`
✓ Auto-cleanup on success

### DON'T

✗ Skip planning for non-trivial tasks
✗ Reuse agents across critique iterations
✗ Proceed with unresolved 🔴 CRITICAL findings
✗ Let DA agree with consensus (violates INV-4)
✗ Run integration tests in parallel (use sequential)
✗ Use placeholders in implementation
✗ Guess or estimate - verify with high confidence
✗ Think "quick scan first" - do single-pass exhaustive

---

## Anti-Patterns

Stop immediately if thinking:

| Thought | Reality |
|---------|---------|
| "Quick scan first" | Single-pass exhaustive required |
| "Probably fine" | Verify with high confidence |
| "Catch it next pass" | Fix now or block |
| "Too thorough" | Thoroughness prevents rework |
| "Skip planning" | Planning prevents wasted implementation |
| "DA can agree sometimes" | Violates INV-4, defeats purpose |
| "Reuse this agent" | Fresh agents required (INV-2) |
| "Placeholder for now" | Production-ready code only |

---

## Cost Analysis

### Token Budget by Variant

| Variant | Base | Overhead | Total | When Worth It |
|---------|------|----------|-------|---------------|
| **Enhanced Hybrid** | ~450 | Minimal | 450-600 | Most tasks |
| **Adversarial** | ~400 | High (debate) | 700-1000 | High-stakes only |
| **Temporal** | ~450 | Variable (exploration) | 900-9000 | Uncertain design |

### Temporal Cost Breakdown

| Operation | Multiplier | Example |
|-----------|------------|---------|
| `@cp` | +0.1x | Checkpoint storage |
| `@restore` | +0.1x | State restoration |
| `@peek` | +0.3x/stage | Look 2 ahead = +0.6x |
| `<<<` | 1.5-10x | Single stage = 1.5x, cascade = 10x |
| `@spec` | Nx/depth | 3 branches × 2 depth = 6x |

### Example Cost Calculation

```
Simple task (logout button):
  A + C + E = ~500 tokens (skip B, D)

Medium task (auth system):
  A + B×2 + C + D + E = ~2500 tokens

Adversarial (healthcare auth):
  A + B (debate) + C + D + E = ~1200 tokens

Temporal (caching exploration):
  A + @peek + <<< + @spec + @restore + <<< (cascade) = ~7500 tokens
```

---

## Troubleshooting

### Agents Not Running in Parallel

**Symptom**: Agents execute sequentially

**Fix**: Ensure all agents in single message with multiple Task tool calls

```typescript
// Correct:
<function_calls>
  <invoke name="Task">...</invoke>
  <invoke name="Task">...</invoke>
  <invoke name="Task">...</invoke>
</function_calls>

// Wrong:
<function_calls>
  <invoke name="Task">...</invoke>
</function_calls>
// ... then another message
<function_calls>
  <invoke name="Task">...</invoke>
</function_calls>
```

### Gates Not Blocking

**Symptom**: Workflow proceeds despite 🔴 findings

**Fix**: Check INV-1 enforcement at `[!]` gates

```bash
# Verify gate structure
[!] GATE: INV-1 check
    🔴 CRITICAL: [issue]
    ⊗ RECOVER: [action]
```

### DA Agent Agreeing

**Symptom**: DA doesn't oppose, violates INV-4

**Fix**: DA agent prompt must include "MUST oppose per INV-4" and provide counter-proposal

### Fresh Agents Not Spawned

**Symptom**: Same agents reused in critique

**Fix**: Explicitly mark agents as NEW per INV-2

```bash
# Correct:
|| Critical agent (NEW)
|| AltExplorer agent (NEW)

# Wrong:
|| Critical agent
|| AltExplorer agent
```

---

## Advanced Usage

### Mixing Variants

Combine Adversarial + Temporal for high-stakes + uncertain design:

```
A: POSITIONS + @cp("post-positions")
B: DEBATE + @peek {depth: 2}
   → SYNTHESIS with @spec {branches: [...]}
   → VETO POINT
C-E: Standard workflow
```

### Custom Agent Roles

Add domain-specific agents to Stage A:

```
|| Arch|Req|Conv|Risk|Dep|Wild agents
|| Security agent (for security-critical tasks)
|| Performance agent (for perf-critical tasks)
|| Compliance agent (for regulated industries)
```

### Extended Recovery Paths

Add custom recovery logic:

```
[!] GATE: custom check
    ⊗ RECOVER: if [condition] -> A
               else if [condition] -> B
               else ABORT with diagnostic
```

---

## FAQ

### Q: When should I use ultrathink vs just implementing directly?

**A**: Use ultrathink when:
- Task affects 3+ files
- Multiple valid approaches exist
- Requirements are unclear
- Architectural decisions needed
- You would normally create a plan document

Skip ultrathink for:
- Single-line fixes
- Obvious implementations
- Trivial changes

### Q: Can I modify the workflow for my specific needs?

**A**: Yes! The workflow is modular:
- Add custom agents to Stage A
- Adjust complexity threshold for Stage B
- Define custom invariants
- Add domain-specific gates

### Q: What if I don't need tests (Stage D)?

**A**: Stage D is conditional (`D??(has_tests)`). For non-code tasks (docs, design), it will be skipped automatically.

### Q: How do I choose between variants?

**A**: Use the decision tree in "When to Use Each Variant" section. Default to Enhanced Hybrid unless:
- High-stakes → Adversarial
- Uncertain → Temporal
- Both → Mix

### Q: What's the difference between skip and conditional?

**A**:
- **Skip**: Stage runs but complexity check makes it a no-op
- **Conditional**: Stage doesn't execute at all (e.g., `B??(complexity>3)`)

### Q: Can I resume a workflow after stopping?

**A**: Yes, in Temporal mode using `@restore(checkpoint)`. Enhanced Hybrid and Adversarial use Memory section in CLAUDE.md for manual resume.

### Q: How do I verify the workflow is working correctly?

**A**: See `.claude/docs/ultrathink-verification.md` for comprehensive test cases and verification procedures.

---

## Contributing

### Reporting Issues

If you encounter issues with the workflow:

1. Describe the task and variant used
2. Include relevant transcript excerpts
3. Note which stage failed and why
4. Suggest improvements

### Extending the Framework

To add new features:

1. Modify skill files (`.claude/skills/ultrathink*.md`)
2. Update reference documentation
3. Add examples to examples.md
4. Create verification tests in verification.md
5. Update this README

---

## Version History

**v1.0.0** (Current)
- Enhanced Hybrid workflow (base)
- Adversarial mode variant
- Temporal mode variant
- Comprehensive documentation
- Verification test suite

---

## License

Part of the Claude Code UI project. See project LICENSE for details.

---

## Support

For questions or issues:
1. Check this README first
2. Review examples in `.claude/docs/ultrathink-examples.md`
3. Run verification tests in `.claude/docs/ultrathink-verification.md`
4. Check project CLAUDE.md for integration guidance
5. Open issue in project repository

---

## Acknowledgments

This framework synthesizes:
- Parallel agent orchestration patterns
- Review protocol best practices
- Test-driven development principles
- Temporal logic concepts
- Adversarial validation techniques

Designed for Claude Code, adaptable to other AI-assisted development workflows.
