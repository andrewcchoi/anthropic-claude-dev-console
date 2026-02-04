# Ultrathink Workflow - Verification Guide

This document provides verification tests to ensure the ultrathink workflow system is functioning correctly.

---

## Verification Checklist

Use this checklist to verify a workflow implementation:

### Stage A: Planning

- [ ] All required agents spawned in parallel (`Arch|Req|Conv|Risk|Dep|Wild`)
- [ ] DA agent must oppose consensus (INV-4)
- [ ] Agents use single message with multiple Task tool calls
- [ ] `[!]` gate runs review protocol (Parse→Structure→Refs→Logic→Consist→Clarity)
- [ ] 🔴 CRITICAL findings block progression
- [ ] Retry mechanism triggers on gate failure (max 2)
- [ ] Checkpoint created: `@cp("post-plan")`

### Stage B: Critique (if complexity > 3)

- [ ] Conditional execution based on complexity
- [ ] Fresh agents spawned each iteration (INV-2)
- [ ] Maximum 2 iterations
- [ ] Refinement agent addresses findings
- [ ] Recovery routing: structural → A, minor → B
- [ ] Checkpoint created: `@cp("post-critique")`

### Stage C: Finalization

- [ ] Finalization agent outputs `parallel_groups` structure
- [ ] Groups organized by dependency: deps → setup → logic → integration → polish
- [ ] Test gates defined per phase
- [ ] DA objections addressed (incorporated vs dismissed noted)
- [ ] Gate checks for completeness, orphans, defects
- [ ] Checkpoint created: `@cp("post-finalize")`

### Stage D: Testing (if has_tests)

- [ ] D1: Unit|Integration|EdgeCase writers spawn in parallel
- [ ] D2: Max 4 critique iterations with Gap|FalsePos|Assertion agents
- [ ] D3: Tests run per INV-3 (Unit || always, Integration -> always)
- [ ] D4: Pass → E, Fail → D2 or @restore
- [ ] Checkpoint created: `@cp("post-test")`

### Stage E: Implementation

- [ ] Execute per `parallel_groups` from C
- [ ] Independent groups run in parallel
- [ ] Dependent groups run sequentially
- [ ] Gates at each group: INV-1 + security + perf
- [ ] Checkpoint created: `@cp("complete")` when done

### General Rules

- [ ] All `||` operations use single message with multiple tool calls
- [ ] All `[!]` barriers wait for completion before proceeding
- [ ] Fresh agents each critique cycle (NEW keyword present)
- [ ] High-confidence findings only (M/L flagged for human)
- [ ] No placeholders in implementation
- [ ] Artifacts stored in `.claude/ultrathink-temp/{session}/`
- [ ] Auto-cleanup on success

---

## Test Cases

### Test 1: Simple Task (Skip Stages)

**Input**: "Add a logout button to navbar"

**Expected**:
- A: PLAN → ✓ PASS (complexity=2)
- B: SKIPPED (complexity < 3)
- C: FINALIZE → ✓ PASS
- D: SKIPPED (trivial)
- E: IMPLEMENT → ✓ PASS

**Verification**:
```bash
# Check that only A, C, E stages ran
grep -E "(A: PLAN|B: CRITIQUE|C: FINALIZE|D: TEST|E: IMPLEMENT)" {transcript}

# Expect: A, C, E present. B, D absent or marked SKIPPED.
```

---

### Test 2: Medium Task (Full Workflow)

**Input**: "Add user authentication with JWT"

**Expected**:
- A: PLAN → 🔴 CRITICAL (DA objection) → retry → ✓ PASS
- B: CRITIQUE × 2 → refinements → ✓ PASS
- C: FINALIZE → parallel_groups defined → ✓ PASS
- D: TEST → D1 writers → D2 critique → D3 run → ✓ PASS
- E: IMPLEMENT → per groups → ✓ PASS

**Verification**:
```bash
# Check all stages ran
grep -E "^─── [ABCDE]:" {transcript} | wc -l
# Expect: 5 lines

# Check DA opposition
grep -E "DA agent.*MUST oppose" {transcript}
# Expect: Found

# Check parallel_groups output
grep -E "parallel_groups:" {transcript}
# Expect: Array of arrays like [[p1,p2],[p3],[p4]]

# Check INV enforcement
grep -E "INV-[1-4]" {transcript} | wc -l
# Expect: Multiple matches (enforced at gates)
```

---

### Test 3: Recovery Path (Gate Failure)

**Input**: "Refactor database layer" (intentionally ambiguous)

**Expected**:
- A: PLAN → 🔴 CRITICAL (scope ambiguous) → retry (1/2) → still 🔴 → retry (2/2) → MAX REACHED
- ON_WORKFLOW_ERROR → ABORT with diagnostic

**Verification**:
```bash
# Check retry attempts
grep -E "⊗ RECOVER: retry \([12]/2\)" {transcript}
# Expect: Both (1/2) and (2/2) present

# Check abort
grep -E "ON_WORKFLOW_ERROR.*ABORT" {transcript}
# Expect: Found

# Check diagnostic message
grep -E "User input required" {transcript}
# Expect: Clear explanation of ambiguity
```

---

### Test 4: Test Cycle Loop (D2 Iterations)

**Input**: "Add rate limiting to API"

**Expected**:
- D1: Writers spawn → ✓
- D2 × 1: Gap found → Update agent → ⊗ → D2
- D2 × 2: No gaps → ✓ clean → D3
- D3: Tests run → ✓ PASS
- D4: → E

**Verification**:
```bash
# Check D2 iterations
grep -E "D2: ×[0-9]" {transcript}
# Expect: D2: ×1 and D2: ×2

# Check Gap agent findings
grep -E "Gap agent.*Missing" {transcript}
# Expect: Found in first iteration

# Check Update agent
grep -E "Update agent.*Adding" {transcript}
# Expect: Found between iterations

# Check clean state
grep -E "✓ clean → D3" {transcript}
# Expect: Found
```

---

### Test 5: Parallel Implementation Groups

**Input**: "Add multi-language support (i18n)"

**Expected**:
- C: parallel_groups = [[p1,p2],[p3],[p4,p5]]
- E: p1 executes in parallel → [!] → p3 sequential → [!] → p4,p5 parallel → [!]

**Verification**:
```bash
# Check parallel execution
grep -E "^\|\| (p[0-9]|independent)" {transcript}
# Expect: Multiple matches for p1, p4, p5

# Check sequential execution
grep -E "^-> (p[0-9]|dependent)" {transcript}
# Expect: Matches for p3

# Check gates between phases
grep -E "\[!\].*GATE.*✓ PASS" {transcript}
# Expect: At least 3 gates (one per phase boundary)
```

---

## Adversarial Mode Tests

### Test 6: CRED System

**Input**: Use adversarial mode for any decision

**Expected**:
- A: CONSENSUS stakes 20-40 CRED (H), DA stakes 10-20 CRED (M)
- C: CRED resolution based on outcome
- Vote weights = sqrt(CRED)

**Verification**:
```bash
# Check staking
grep -E "💰.*CRED" {transcript}
# Expect: Multiple stakes

# Check resolution
grep -E "CRED Resolution" {transcript}
# Expect: Win/lose calculations

# Check vote weights
grep -E "sqrt\([0-9]+\)" {transcript}
# Expect: Vote weight calculations
```

---

### Test 7: Veto System

**Input**: Use adversarial mode with contentious decision

**Expected**:
- HARD veto possible (max 2 per agent)
- Counter-veto allowed
- Unresolved veto → escalate to human

**Verification**:
```bash
# Check veto points
grep -E "🛡️.*veto" {transcript}
# Expect: Veto opportunities at debate and finalize

# Check veto types
grep -E "(HARD|SOFT) veto" {transcript}
# Expect: Both types present

# Check escalation
grep -E "ESCALATE.*unresolved.*veto" {transcript}
# Expect: If veto unresolved
```

---

### Test 8: Debate Structure

**Input**: Use adversarial mode

**Expected**:
- B: THESIS → ANTITHESIS → SYNTHESIS
- unresolved_tensions tracked
- Tensions > 3 → escalate

**Verification**:
```bash
# Check debate rounds
grep -E "⚔️ (THESIS|ANTITHESIS|SYNTHESIS)" {transcript}
# Expect: All three present

# Check tensions
grep -E "unresolved_tensions.*\[" {transcript}
# Expect: Array of tensions

# Check tension threshold
grep -E "unresolved_tensions.*[<>] 3" {transcript}
# Expect: Comparison check
```

---

## Temporal Mode Tests

### Test 9: Checkpoints

**Input**: Use temporal mode

**Expected**:
- @cp("genesis") before A
- @cp("post-plan") after A
- @cp("post-critique") after B
- @cp("post-finalize") after C
- @cp("post-test") after D
- @cp("complete") after E

**Verification**:
```bash
# Check all checkpoints created
grep -E "@cp\(\"[^\"]+\"\)" {transcript}
# Expect: At least 6 checkpoints

# Check checkpoint naming
grep -E "@cp\(\"(genesis|post-plan|post-critique|post-finalize|post-test|complete)\"\)" {transcript}
# Expect: All standard checkpoints
```

---

### Test 10: Retroactive Edit

**Input**: Use temporal mode with late discovery

**Expected**:
- <<< A.output {reason: "...", edit: "..."}
- ~~> [affected_stages]
- Re-run cascade

**Verification**:
```bash
# Check retroactive edit
grep -E "<<<.*\.output" {transcript}
# Expect: Edit syntax present

# Check ripple
grep -E "~~>" {transcript}
# Expect: Ripple propagation

# Check re-run
grep -E "(Re-run|RETRY)" {transcript}
# Expect: Affected stages re-executed
```

---

### Test 11: Speculative Execution

**Input**: Use temporal mode with multiple options

**Expected**:
- @spec {branches: [...], depth: N, criteria: "..."}
- Parallel preview of all branches
- @collapse {winner: argmax(branches)}

**Verification**:
```bash
# Check spec block
grep -E "@spec.*branches" {transcript}
# Expect: Spec configuration

# Check branch execution
grep -E "Branch [0-9]:" {transcript}
# Expect: Multiple branches

# Check collapse
grep -E "@collapse.*winner" {transcript}
# Expect: Winner selection
```

---

### Test 12: Prophecy (Peek Ahead)

**Input**: Use temporal mode

**Expected**:
- @peek {depth: N, queries: [...]}
- @peek.prophecy used in decisions
- @peek.warnings trigger retroactive edits

**Verification**:
```bash
# Check peek
grep -E "@peek.*depth" {transcript}
# Expect: Peek configuration

# Check prophecy usage
grep -E "@peek\.(prophecy|warnings)" {transcript}
# Expect: Results referenced

# Check warning-triggered edit
grep -E "@peek\.warnings.*CRITICAL.*<<<" {transcript}
# Expect: Warning → retroactive edit flow
```

---

### Test 13: Restore and Branch

**Input**: Use temporal mode with dead-end path

**Expected**:
- @restore("checkpoint-name")
- @branch("alt-path") { ... }
- Alternative path explored

**Verification**:
```bash
# Check restore
grep -E "@restore\(\"[^\"]+\"\)" {transcript}
# Expect: Restore to checkpoint

# Check branch
grep -E "@branch\(\"[^\"]+\"\)" {transcript}
# Expect: Alternative path fork

# Check reasoning
grep -A 5 "@restore" {transcript}
# Expect: Explanation of why restore needed
```

---

## Invariant Enforcement Tests

### Test 14: INV-1 (No 🔴 CRITICAL unresolved)

**Input**: Any workflow with critical finding

**Expected**:
- 🔴 finding → gate blocks
- Must fix before proceeding

**Verification**:
```bash
# Find critical findings
grep -E "🔴.*CRITICAL" {transcript}

# Check that gate blocked
grep -A 2 "🔴.*CRITICAL" {transcript} | grep -E "⊗|BLOCK"
# Expect: Gate failure

# Check fix applied
grep -A 10 "🔴.*CRITICAL" {transcript} | grep -E "(fix|address|resolve)"
# Expect: Fix description
```

---

### Test 15: INV-2 (Fresh agents each critique)

**Input**: Any workflow with multiple critique iterations

**Expected**:
- Agents labeled "NEW" in subsequent iterations
- No agent reuse between iterations

**Verification**:
```bash
# Check NEW keyword
grep -E "|| [A-Z][a-z]+ agent \(NEW\)" {transcript}
# Expect: Found in iteration 2+

# Count unique agents per iteration
grep -E "B: CRITIQUE.*×[0-9]" {transcript} -A 20 | grep -E "|| [A-Z][a-z]+ agent"
# Expect: Different agent instances
```

---

### Test 16: INV-3 (Unit || / Integration ->)

**Input**: Any workflow with tests

**Expected**:
- Unit tests run in parallel
- Integration tests run sequentially
- Mutation tests run in parallel

**Verification**:
```bash
# Check unit parallel
grep -E "^\|\|.*unit" {transcript}
# Expect: Parallel symbol

# Check integration sequential
grep -E "^->.*integration" {transcript}
# Expect: Sequential symbol

# Check mutation parallel
grep -E "^\|\|.*mutation" {transcript}
# Expect: Parallel symbol
```

---

### Test 17: INV-4 (DA must oppose)

**Input**: Any workflow with DA agent

**Expected**:
- DA agent must present counter-proposal
- DA cannot agree with consensus
- Explicit opposition required

**Verification**:
```bash
# Check DA opposition
grep -E "DA agent.*oppose" {transcript}
# Expect: Opposition statement

# Check counter-proposal
grep -E "DA agent.*counter" {transcript}
# Expect: Alternative proposal

# Check cannot agree
grep -E "INV-4.*DA must oppose" {transcript}
# Expect: Invariant mentioned
```

---

## Integration Tests

### Test 18: Task Tool Integration

**Input**: Any stage with parallel agents

**Expected**:
- Single message with multiple Task tool invocations
- All agents in one `<function_calls>` block

**Verification**:
```typescript
// Check tool call structure
const message = getMostRecentAssistantMessage();
const toolCalls = message.content.filter(c => c.type === 'tool_use');

// Verify multiple Task calls in single message
assert(toolCalls.length >= 3, 'Should have 3+ parallel agents');
assert(toolCalls.every(c => c.name === 'Task'), 'All should be Task tool');
assert(toolCalls.every(c => c.input.subagent_type === 'general-purpose'), 'Correct subagent');
```

---

### Test 19: Memory Management Integration

**Input**: Complete workflow with memory updates

**Expected**:
- Memory section in CLAUDE.md updated at stage boundaries
- Context cleared between stages
- Checkpoints documented

**Verification**:
```bash
# Check CLAUDE.md updates
grep -E "## Memory" /workspace/CLAUDE.md
# Expect: Memory section exists

# Check stage tracking
grep -E "Current State.*Stage: [ABCDE]" /workspace/CLAUDE.md
# Expect: Stage tracked

# Check checkpoint tracking
grep -E "@cp\(" /workspace/CLAUDE.md
# Expect: Checkpoints documented
```

---

### Test 20: Artifact Management

**Input**: Complete workflow

**Expected**:
- Temp artifacts in `.claude/ultrathink-temp/{session}/`
- Auto-cleanup on success
- Preserved on failure

**Verification**:
```bash
# During workflow
test -d .claude/ultrathink-temp/*
# Expect: Directory exists

# After success
ls .claude/ultrathink-temp/
# Expect: Empty or directory removed

# After failure (simulate by stopping mid-workflow)
ls .claude/ultrathink-temp/
# Expect: Directory and files preserved
```

---

## Performance Tests

### Test 21: Token Budget

**Input**: Simple task (logout button)

**Expected**: ≤ 600 tokens

**Verification**:
```bash
# Count tokens in transcript (approximate)
wc -w {transcript} | awk '{print $1 * 1.3}'  # rough token estimate
# Expect: < 600 for simple task
```

---

### Test 22: Parallel Execution Speed

**Input**: Task with 7 parallel agents

**Expected**: Agents execute concurrently, not sequentially

**Verification**:
```typescript
// Check timestamps
const timestamps = extractToolCallTimestamps(transcript);
const firstStart = timestamps[0].start;
const allFinished = timestamps.every(t => t.start < firstStart + 5000);  // Within 5 seconds

assert(allFinished, 'All agents should start within 5 seconds (parallel execution)');
```

---

## Error Handling Tests

### Test 23: Graceful Degradation

**Input**: Agent failure mid-workflow

**Expected**:
- Error captured
- Recovery attempted
- User notified if unrecoverable

**Verification**:
```bash
# Simulate agent failure
# (Inject error in Task tool)

# Check error handling
grep -E "(ERROR|FAIL|⊗)" {transcript}
# Expect: Error detected

# Check recovery
grep -E "RECOVER.*retry" {transcript}
# Expect: Recovery attempt

# Check user notification
grep -E "ABORT.*diagnostic" {transcript}
# Expect: Clear error message if unrecoverable
```

---

## Summary: Test Coverage Matrix

| Category | Test | Pass/Fail |
|----------|------|-----------|
| **Core Workflow** | 1. Simple task skip stages | ⬜ |
| | 2. Medium task full workflow | ⬜ |
| | 3. Recovery path (gate failure) | ⬜ |
| | 4. Test cycle loop | ⬜ |
| | 5. Parallel implementation | ⬜ |
| **Adversarial** | 6. CRED system | ⬜ |
| | 7. Veto system | ⬜ |
| | 8. Debate structure | ⬜ |
| **Temporal** | 9. Checkpoints | ⬜ |
| | 10. Retroactive edit | ⬜ |
| | 11. Speculative execution | ⬜ |
| | 12. Prophecy (peek) | ⬜ |
| | 13. Restore and branch | ⬜ |
| **Invariants** | 14. INV-1 (no 🔴 unresolved) | ⬜ |
| | 15. INV-2 (fresh agents) | ⬜ |
| | 16. INV-3 (test order) | ⬜ |
| | 17. INV-4 (DA oppose) | ⬜ |
| **Integration** | 18. Task tool integration | ⬜ |
| | 19. Memory management | ⬜ |
| | 20. Artifact management | ⬜ |
| **Performance** | 21. Token budget | ⬜ |
| | 22. Parallel execution speed | ⬜ |
| **Error Handling** | 23. Graceful degradation | ⬜ |

---

## Running Verification

### Manual Verification

```bash
# 1. Invoke ultrathink skill with test task
/ultrathink

# 2. Provide test task
"Add user authentication with JWT"

# 3. Monitor output against checklist

# 4. Verify artifacts created
ls -la .claude/ultrathink-temp/

# 5. Check CLAUDE.md memory section
cat /workspace/CLAUDE.md | grep -A 20 "## Memory"

# 6. Verify cleanup
ls .claude/ultrathink-temp/  # Should be empty after success
```

### Automated Verification (Future)

```typescript
// test/ultrathink.verify.test.ts

import { verifyWorkflow } from './lib/verify';

describe('Ultrathink Workflow', () => {
  it('should skip stages for simple tasks', async () => {
    const result = await runWorkflow('Add logout button');
    verifyWorkflow(result, {
      stagesRun: ['A', 'C', 'E'],
      stagesSkipped: ['B', 'D'],
      tokenBudget: 600,
    });
  });

  it('should enforce INV-1 (no critical unresolved)', async () => {
    const result = await runWorkflow('Ambiguous task');
    expect(result.gates).toContainCriticalBlock();
    expect(result.recovery).toHaveBeenAttempted();
  });

  // ... more tests
});
```

---

## Troubleshooting Common Issues

### Issue: Agents not running in parallel

**Symptom**: Agents execute sequentially instead of concurrently

**Check**:
```bash
# Look for multiple Task calls in single message
grep -E "<invoke name=\"Task\">" {transcript} | wc -l

# Should be 3+ within same <function_calls> block
```

**Fix**: Ensure all parallel agents spawned in single message with multiple `<invoke>` blocks

---

### Issue: Gates not blocking on critical findings

**Symptom**: Workflow proceeds despite 🔴 findings

**Check**:
```bash
# Find critical findings
grep -E "🔴.*CRITICAL" {transcript}

# Check next line for block
grep -A 1 "🔴.*CRITICAL" {transcript} | grep -E "⊗|BLOCK"
```

**Fix**: Ensure `[!]` gate checks for `INV-1` and blocks on 🔴 severity

---

### Issue: DA agent agreeing with consensus

**Symptom**: DA doesn't oppose, violates INV-4

**Check**:
```bash
# DA should have counter-proposal
grep -E "DA agent.*counter" {transcript}
```

**Fix**: DA agent prompt must include "MUST oppose per INV-4" instruction

---

### Issue: Fresh agents not spawned

**Symptom**: Same agents reused in critique iterations

**Check**:
```bash
# Should see NEW keyword in iteration 2+
grep -E "agent \(NEW\)" {transcript}
```

**Fix**: Explicitly mark agents as NEW per INV-2

---

### Issue: Temporal features not working

**Symptom**: Checkpoints, retroactive edits, or spec not executing

**Check**:
```bash
# Check for temporal syntax
grep -E "@(cp|restore|peek|spec)" {transcript}
```

**Fix**: Ensure temporal mode variant is active (ultrathink-temporal skill)

---

## Conclusion

Use this verification guide to ensure the ultrathink workflow system is functioning correctly. Run through the test cases periodically, especially after making changes to the workflow implementation or prompt templates.
