---
name: spec-validator
description: Validates specifications before implementation to catch type mismatches, logical inconsistencies, missing dependencies, and unfeasible requirements. Prevents bugs that would otherwise be faithfully implemented from flawed specs.
pre-implementation: true
prevents: type-confusion, missing-dependencies, logical-contradictions
---

# Spec Validation Phase

## Purpose

Validate specifications BEFORE implementation begins. This catches:
- Type mismatches between data sources
- Missing or incorrect dependencies
- Logical contradictions
- Unfeasible requirements

**Key insight**: A correct implementation of a flawed spec is still a bug.

## When to Use

**Always use when**:
- Starting implementation from a written spec or plan
- Requirements reference multiple data sources (stores, APIs, etc.)
- Parameters flow between components
- User-provided spec contains technical details

**Can skip when**:
- Simple, self-contained changes
- No cross-component data flow
- Requirements are purely behavioral (no technical spec)

---

## The Four Validations

### 1. Type Consistency

Verify all types exist and match across boundaries.

**Check**:
- Every type referenced in spec exists in codebase
- Parameter types match function signatures
- Return types match consumer expectations
- Data format conversions are specified

**Questions to ask**:
- "What type does X expect?"
- "What type does Y provide?"
- "Do they match? If not, what converts them?"

**Example finding**:
```
Spec text: "Call switchSession with the session's workspaceId"

Validation:
- switchSession signature: (sessionId: string, projectId: string)
- session.workspaceId type: UUID (e.g., "ca31cb4c-4784-4fc8-...")
- projectId expected type: encoded path (e.g., "-workspace-docs")

FINDING: Type mismatch - workspaceId is UUID, projectId expects path
IMPACT: 404 errors when switching sessions
FIX: Use getProjectIdFromWorkspace() to convert UUID to path
```

### 2. Logical Consistency

Verify no contradictions exist in the spec.

**Check**:
- Requirements don't conflict with each other
- Edge cases are defined
- State transitions are valid
- Error handling is specified for all failure modes

**Questions to ask**:
- "What happens when X fails?"
- "Can these two requirements both be true?"
- "What if this value is null/undefined?"

**Example finding**:
```
Spec text:
- Requirement A: "Session ID is required"
- Requirement B: "Allow starting new chat without existing session"

Validation:
- These appear to conflict - new chat has no session ID

FINDING: Logical tension - need clarification
RESOLUTION: Session ID is required for EXISTING chats,
            new chats generate UUID before first message
```

### 3. Dependency Check

Verify all dependencies exist and are accessible.

**Check**:
- All imported functions/modules exist
- APIs referenced are available
- Store fields exist
- External services are reachable

**Questions to ask**:
- "Does this function exist?"
- "Is this field on the type?"
- "Can we actually access this service?"

**Example finding**:
```
Spec text: "Use workspace.projectId to identify the project"

Validation:
- Workspace type: { id: string, rootPath: string, name: string }
- No 'projectId' field exists

FINDING: Missing dependency - workspace.projectId doesn't exist
ALTERNATIVES:
  1. Use encodeProjectPath(workspace.rootPath) to derive it
  2. Add projectId to Workspace interface (breaking change)
RECOMMENDATION: Option 1 (no interface change)
```

### 4. Feasibility

Verify requirements are technically possible.

**Check**:
- Performance requirements are achievable
- Security requirements don't conflict with functionality
- Timeline is realistic given complexity
- No known technical blockers

**Questions to ask**:
- "Is this physically possible?"
- "Does this violate any constraints?"
- "What's the actual complexity?"

**Example finding**:
```
Spec text: "Load all session history instantly"

Validation:
- Session count: potentially thousands
- Each session file: ~100KB average
- Total data: 100MB+

FINDING: Performance infeasible
IMPACT: UI would freeze for seconds loading all data
FIX: Load session headers only, lazy-load content on demand
```

---

## Validation Output Format

For each validation, output:

```
## Validation Report

### Type Consistency
| Location | Expected Type | Actual Type | Match | Fix |
|----------|---------------|-------------|-------|-----|
| switchSession(projectId) | encoded path | UUID | NO | Use getProjectIdFromWorkspace() |

Findings: 1 mismatch

### Logical Consistency
- [ ] No conflicting requirements
- [x] ISSUE: Session ID requirement unclear for new chats

### Dependency Check
- [x] All functions exist
- [ ] MISSING: workspace.projectId field

### Feasibility
- [x] Performance achievable
- [x] Security requirements satisfied
- [x] Timeline realistic

## Summary
- CRITICAL: 1 (type mismatch that would cause 404s)
- HIGH: 1 (missing dependency)
- MEDIUM: 0
- LOW: 0

RECOMMENDATION: Fix type mismatch before implementation
```

---

## Integration with Other Skills

### With Ultrathink

Run spec validation at the START of Stage A (PLAN):

```
--- A: PLAN ------------------------------------------
|| SpecValidator agent:
   Running 4 validations on spec...
   [!] Type Consistency: 1 CRITICAL finding
       -> HALT: Must fix before continuing

   Fix: Added type conversion step to spec

|| Arch|Req|Conv|Risk|Dep|Wild agents (proceed after fix)
```

### With Brainstorming

Run spec validation AFTER brainstorming, BEFORE implementation:

```
Brainstorming output -> Spec document

/spec-validator

Validation findings -> Update spec -> Implementation
```

### With TDD

Run spec validation BEFORE writing tests:

```
1. /spec-validator (validate spec)
2. Fix any findings
3. Write tests from validated spec
4. Implement to pass tests
```

---

## Common Type Mismatches to Watch

Based on real bugs in this codebase:

| Source | Field | Type | Often Confused With |
|--------|-------|------|---------------------|
| Workspace Store | workspaceId | UUID | projectId (path) |
| CLI Session | projectId | encoded path | workspaceId (UUID) |
| API | project param | encoded path | workspaceId (UUID) |
| Session | id | UUID | session name |
| Timestamps | created_at | milliseconds | seconds |

When specs reference these fields, **ALWAYS verify the type matches the consumer's expectation**.

---

## Checklist Template

Copy this for each validation:

```markdown
## Spec Validation Checklist

### 1. Type Consistency
- [ ] All types in spec exist in codebase
- [ ] Parameter types match function signatures
- [ ] Return types match consumer expectations
- [ ] Data format conversions are explicit

### 2. Logical Consistency
- [ ] No conflicting requirements
- [ ] All edge cases defined
- [ ] State transitions are valid
- [ ] Error handling specified

### 3. Dependency Check
- [ ] All functions/modules exist
- [ ] All API endpoints exist
- [ ] All store fields exist
- [ ] External services accessible

### 4. Feasibility
- [ ] Performance requirements achievable
- [ ] Security requirements satisfied
- [ ] Timeline realistic
- [ ] No known technical blockers

### Findings Summary
- CRITICAL:
- HIGH:
- MEDIUM:
- LOW:

### Go/No-Go
- [ ] All CRITICAL findings resolved
- [ ] All HIGH findings have mitigation plan
- [ ] Ready for implementation
```

---

## Anti-Patterns

| Anti-Pattern | Reality |
|--------------|---------|
| "The spec looks right" | Specs can be wrong. Verify types explicitly. |
| "I'll figure it out during implementation" | Type mismatches are harder to fix after code is written |
| "The tests will catch it" | Tests test the code, not the spec. Wrong spec = wrong tests. |
| "It's just a field name" | Field names often hide type differences (workspaceId vs projectId) |

---

## Success Metric

**Goal**: Catch >80% of spec issues before implementation

**Measurement**:
- Track bugs that were spec errors vs implementation errors
- Count bugs that would have been caught by validation
- Aim for: (Caught by validation) / (Total spec bugs) > 80%

---

## Quick Reference

```
+------------------------------------------------------------------+
| SPEC VALIDATOR                                                   |
+------------------------------------------------------------------+
| 1. TYPE CONSISTENCY                                              |
|    - Does X provide what Y expects?                              |
|    - UUID vs path? String vs number? Array vs single?            |
|                                                                  |
| 2. LOGICAL CONSISTENCY                                           |
|    - Any conflicts? Edge cases defined? Error handling?          |
|                                                                  |
| 3. DEPENDENCY CHECK                                              |
|    - Does this function/field/API actually exist?                |
|                                                                  |
| 4. FEASIBILITY                                                   |
|    - Is this possible? Performant? Secure? Realistic?            |
+------------------------------------------------------------------+
| OUTPUT: CRITICAL/HIGH/MEDIUM/LOW findings                        |
| GATE: No CRITICAL findings to proceed to implementation          |
+------------------------------------------------------------------+
```
