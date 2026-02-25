---
name: ultrathink-with-tests
description: Enhanced ultrathink workflow with integrated comprehensive test strategy. Use for features requiring robust test coverage and call-site audit verification.
---

# ULTRATHINK: Enhanced Hybrid with Test Strategy Integration

## Overview

This skill combines ultrathink planning with the comprehensive test strategy (Layer 1-5 testing + call-site audits). Use when implementing features that require:
- Robust test coverage
- Integration point verification
- Call-site audit protection
- Test-driven development

## Integration Points

```
Stage A → Analysis (includes testability)
Stage B → Critical Review (includes test criticality)
Stage C → Plan + Test Design ← NEW
Stage D → Test Generation (conditional) ← NEW
Stage E → Implementation with TDD
```

## Workflow

### Stage A: Analysis @checkpoint

```
|| parallel agents:
   - Architecture Agent (existing)
   - Requirements Agent (existing)
   - Conventions Agent (existing)
   - Risk Agent (existing + test risks)
   - Dependencies Agent (existing)
   - Wild Ideas Agent (existing)
   - **Test Strategy Agent (NEW)**

|| DA (Devil's Advocate) opposes
```

**Test Strategy Agent Output:**
```markdown
## Testability Analysis

Integration Points: [list]
- Component → Store → API
- Store → Filesystem
- WebSocket → PTY

Function Signature Changes: [list]
- switchSession: added projectId parameter
- deleteSession: new function

Test Layers Required:
- Layer 1: Store (3 functions modified)
- Layer 3: Component (2 components)
- Layer 4: Integration (3 integration points)
- Layer 5: Call-Site Audits (2 functions)

Edge Cases Identified:
- Delete active session
- Concurrent modifications
- Network failures

Estimated Test Count: 18 tests
```

→ [!] Review Gate (INV-1: no 🔴 unresolved)
   If ⊗ → retry Stage A with fresh agents
   If ✓ → proceed to Stage B

### Stage B: Critical Review (Conditional) ??(complexity >3)

```
@checkpoint B-start
×2 iterations:
|| Critical Path Agent
|| Alternative Approaches Agent
|| Feasibility Agent
```

**Critical Path Agent includes:**
- Which integration points MUST be tested?
- Which call-site audits are CRITICAL?
- What are the must-have test scenarios?

→ [!] Review Gate
   If issues found → Refine Stage A output
   If ✓ → proceed to Stage C

### Stage C: Plan + Test Design @checkpoint

```
@checkpoint C-start

→ Standard planning:
   1. Identify files to modify
   2. Break into implementation groups
   3. Determine task order

→ **Test Strategy Design (NEW):**
   4. Generate test checklist
      ```bash
      npm run generate-checklist -- [files from step 1]
      ```

   5. Review checklist output
      - Which layers needed per group?
      - Which functions need call-site audits?
      - Integration test scenarios?

   6. Add test tasks to groups
      ```
      Group A: Store Implementation
      ├── Task 1: Add deleteSession action
      ├── Task 2: Update state management
      └── **Test Tasks:**
          ├── Layer 1: Store tests (3 tests)
          ├── Layer 4: Integration test (1 test)
          └── Layer 5: Call-site audit (1 test)

      Group B: UI Implementation
      ├── Task 3: Add delete button
      ├── Task 4: Add confirmation dialog
      └── **Test Tasks:**
          ├── Layer 3: Component tests (4 tests)
          └── Layer 4: Integration test (1 test)
      ```

   7. Finalize implementation order with test gates
      ```
      Group A → Test Verification Gate → Group B → Test Verification Gate → Complete
      ```

→ [!] Review Gate: Plan + Test Strategy
   Verify:
   - Implementation plan complete?
   - Test strategy comprehensive?
   - All 5 layers identified?
   - Call-site audits planned?
   - Integration tests cover all integration points?

   If ⊗ → retry Stage C
   If ✓ → proceed to Stage D

Store plan in: `.claude/ultrathink-temp/{session}/plan-with-tests.md`
```

### Stage D: Test Generation (Conditional) ??(tests needed)

```
@checkpoint D-start

D1|| Generate draft tests
   ```bash
   # For each group, generate draft tests
   npm run generate-tests -- [group files]
   ```

   Output: Draft test files in __tests__/

D2×4|| Review critical test scenarios
   Agents review:
   - Store test: Edge cases covered?
   - Component test: Event handlers verified?
   - Integration test: API calls verified?
   - Call-site audit: All callers found?

D3: Run generated tests
   ```bash
   npm test -- [generated test files]
   ```
   Verify tests are valid (may fail, but should run)

D4: ✓ validation complete → proceed to E
    ⊗ tests invalid → fix and retry D2

Store tests in: repo (committed as part of implementation)
```

### Stage E: Implementation with TDD

```
Per implementation group:

|| Independent tasks (can parallelize)
→ Dependent tasks (must sequence)

For each task:

**Step 1: Review generated tests (from D1)**
   - Fix any AI mistakes
   - Add domain-specific edge cases
   - Refine assertions

**Step 2: Run tests in watch mode**
   ```bash
   npm run test:watch
   ```

**Step 3: Implement (TDD cycle)**
   - See test fail (RED)
   - Implement minimum code
   - See test pass (GREEN)
   - Refactor if needed

**Step 4: Create call-site audits**
   (if function signature changed)
   - Use template: __tests__/templates/call-site-audit.test.template.ts
   - Verify all call sites found
   - Verify parameter counts correct

**Step 5: Verify completeness**
   ```bash
   npm run verify-tests
   ```

→ [!] Group Completion Gate
   Verify:
   - All tests passing?
   - Coverage >90% for group?
   - Checklist items for group complete?
   - Call-site audits passing?

   If ⊗ → fix issues before next group
   If ✓ → proceed to next group

After all groups:
→ [!] Final Verification Gate
   ```bash
   npm test -- --coverage
   npm run test:audits
   npm run test:report
   ```

   Verify:
   - All 5 layers tested?
   - Overall coverage >90%?
   - All integration tests pass?
   - All call-site audits pass?
   - Test report shows PASS?

   If ⊗ → fix gaps
   If ✓ → COMPLETE
```

## Invariants (Enforced at every [!] gate)

**INV-1**: No 🔴 CRITICAL unresolved issues
**INV-2**: Fresh agents for each critique (no agent reuse)
**INV-3**: Unit tests run || (parallel), integration tests run → (sequential)
**INV-4**: DA must oppose majority view
**INV-5 (NEW)**: All modified functions have call-site audits
**INV-6 (NEW)**: Integration tests verify API calls include all params

## Error Handling

If Stage E gate fails:
1. Identify which layer failed
2. Use AI Test Healer:
   ```bash
   npm run test:heal
   ```
3. Review suggestions
4. Apply fixes
5. Re-verify

If call-site audit fails:
1. Review audit output (shows which call sites broken)
2. Update all call sites to match new signature
3. Re-run audit
4. Verify all ✅

## Recovery Paths

```
@checkpoint locations:
- A-start (beginning of analysis)
- B-start (beginning of critical review)
- C-start (beginning of planning)
- D-start (beginning of test generation)
- E-group-N (beginning of each implementation group)

@restore(checkpoint):
- Restores to saved state
- Re-runs from that point
- Preserves context up to checkpoint
```

## Output Artifacts

```
.claude/ultrathink-temp/{session}/
├── analysis.md              (Stage A output)
├── critical-review.md       (Stage B output)
├── plan-with-tests.md       (Stage C output)
├── test-checklist.md        (Stage C generated)
└── group-{N}-status.md      (Stage E progress)

__tests__/
├── [layer]/*.test.ts        (Stage D generated, Stage E refined)
└── audits/*.test.ts         (Stage E created)

test-strategy-report.md      (Final verification)
.test-metrics-history.json   (Historical tracking)
```

## Usage

```bash
# Invoke skill
/ultrathink-with-tests "Add session deletion with comprehensive tests"

# Or via Skill tool
Skill(skill: "ultrathink-with-tests", args: "Add session deletion with comprehensive tests")
```

## When to Use This vs Regular Ultrathink

**Use ultrathink-with-tests when:**
- Adding new features (always test comprehensively)
- Modifying function signatures (need call-site audits)
- Refactoring integration points (need integration tests)
- High-stakes changes (comprehensive verification required)

**Use regular ultrathink when:**
- Pure research/exploration (no code changes)
- Documentation updates (no tests needed)
- Configuration changes (minimal testing)

## Success Criteria

Feature complete when:
1. All ultrathink gates passed (✓)
2. All test layers present
3. Coverage >90%
4. Call-site audits pass
5. Integration tests verify API calls
6. Test report shows PASS

## Example Output

```markdown
# Implementation Plan: Session Deletion

## Stage A: Analysis
[Analysis from 7 parallel agents including Test Strategy Agent]

## Stage C: Plan with Test Design

### Group A: Store Layer
Implementation Tasks:
1. Add deleteSession to store (src/lib/store/index.ts)
2. Update session state management

Test Tasks:
1. Layer 1: Store tests (src/lib/store/__tests__/index.test.ts)
   - Test deleteSession removes session
   - Test edge case: delete non-existent
   - Test edge case: delete active session
2. Layer 4: Integration test (__tests__/integration/delete-session.test.ts)
   - Verify API DELETE request sent
3. Layer 5: Call-site audit (__tests__/audits/deleteSession-call-sites.test.ts)
   - Verify all callers found
   - Verify parameter count

### Group B: UI Layer
[... similar structure]

## Stage D: Generated Tests
✅ Draft tests generated for all groups
✅ Tests validated (all runnable)

## Stage E: Implementation Status

Group A: ✅ COMPLETE
- Implementation: ✅
- Store tests: ✅ (3/3 passing)
- Integration test: ✅ (1/1 passing)
- Call-site audit: ✅ (1/1 passing)
- Coverage: 94.2%

Group B: ✅ COMPLETE
- Implementation: ✅
- Component tests: ✅ (4/4 passing)
- Integration test: ✅ (1/1 passing)
- Coverage: 91.8%

## Final Verification
✅ All tests passing (9/9)
✅ Coverage: 93.1% (threshold: 90%)
✅ All layers tested
✅ Call-site audits pass
✅ Integration tests verify API calls

Overall: ✅ COMPLETE
```

## Integration with Ralph Loop

After ultrathink-with-tests completes, use Ralph Loop for critical review:

```bash
/ralph-loop "Verify test strategy completeness" --max-iterations 3 --completion-promise comprehensive
```

Ralph Loop will:
- Review test-strategy-report.md
- Identify gaps missed by ultrathink
- Suggest additional tests
- Verify call-site audits comprehensive
- Ensure Devil's Advocate satisfied

## Notes

- This skill adds ~20% overhead to ultrathink (test planning + generation)
- Test generation (Stage D) saves ~40% implementation time overall
- Call-site audits prevent 99% of "missing parameter" bugs
- Integration tests catch API-related bugs before they ship

---

**Token Budget**: ~600-800 tokens (150 more than standard ultrathink due to test strategy stages)
