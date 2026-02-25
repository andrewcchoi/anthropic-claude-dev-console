# Comprehensive Test Strategy

Welcome to the Zero-Gap Testing framework! This directory contains the complete testing strategy designed to prevent integration bugs like the missing `projectId` parameter.

## Quick Start

```bash
# 1. Generate test checklist
npm run generate-checklist -- src/components/YourComponent.tsx

# 2. Review checklist
cat .test-checklist.md

# 3. Generate draft tests (AI-powered)
npm run generate-tests -- src/components/YourComponent.tsx

# 4. Write tests (TDD)
npm run test:watch

# 5. Verify completeness
npm run verify-tests

# 6. Before creating PR
npm test -- --coverage
npm run test:audits
```

## The Five Layers

Every feature must test all five layers:

1. **Store Tests** - Business logic, state transitions
2. **Hook Tests** - API calls, side effects, cleanup
3. **Component Tests** - UI interactions, event handlers
4. **Integration Tests** - Full data flow, cross-layer coordination
5. **Call-Site Audits** - Grep-based verification of function callers

## Key Documents

- [**Comprehensive Test Strategy**](comprehensive-test-strategy.md) - Full documentation
- [**Comprehensive Testing Skill**](../../.claude/skills/comprehensive-testing.md) - Skill for Claude Code
- [**Test Templates**](../../__tests__/templates/) - Copy-paste templates

## Innovation: AI-Powered Test Generation & Healing

This strategy includes TWO AI-powered features:

### 1. AI Test Generator
Analyzes your code and creates draft tests automatically:

```bash
# Generate tests with Claude API
export ANTHROPIC_API_KEY=your-key
npm run generate-tests -- src/components/SessionList.tsx
```

The AI will:
- Analyze function signatures
- Identify edge cases
- Generate comprehensive test coverage
- Create call-site audits

### 2. AI Test Healer 🔮 (THE SURPRISE!)
When tests fail, automatically analyzes failures and suggests fixes:

```bash
# Heal failing tests
export ANTHROPIC_API_KEY=your-key
npm run test:heal
```

The AI will:
- Analyze test failures and stack traces
- Review recent code changes (git diff)
- Determine if code changed or test is outdated
- Suggest specific code changes to fix the test
- Provide confidence rating (high/medium/low)

**Example output:**
```
🔍 Analyzing Failure 1/3
   Test: should pass workspaceId to switchSession
   File: src/components/sidebar/SessionList.tsx

   🤖 Consulting AI...

   📋 Healing Suggestion:
   Confidence: HIGH

   Problem: Test expects 2 parameters but function called with 1

   Likely Cause: Code was refactored to require projectId parameter
   but test wasn't updated to pass it

   Suggested Fix:
   1. Update line 259: switchSession(session.id, session.workspaceId)
   2. Ensure session.workspaceId is available in component state
   3. Add null check if workspaceId can be undefined
```

## Why This Exists

The workspace session feature had 45 passing tests with >90% coverage, but still shipped with a bug where `switchSession()` was called without the `projectId` parameter in 5 locations.

**Traditional TDD answers**: "Does my new code work?"
**Zero-Gap Testing answers**: "Did I update all the places that need updating?"

## Enforcement

The strategy is enforced via:

- **Pre-commit hooks** - Run call-site audits if function signatures changed
- **CI/CD** - GitHub Actions workflow fails PR if checklist incomplete
- **Coverage thresholds** - 90% minimum for lines, branches, functions
- **Manual review** - Test checklist must be 100% complete

## Tools

| Command | Purpose |
|---------|---------|
| `npm run generate-checklist` | Generate test checklist for files |
| `npm run generate-tests` | AI-powered test generation |
| `npm run test:heal` | 🔮 AI-powered test healing (analyzes failures & suggests fixes) |
| `npm run test:report` | Generate comprehensive test strategy report |
| `npm run verify-tests` | Verify all checklist items complete |
| `npm run test:audits` | Run call-site audit tests |
| `npm test -- --coverage` | Run tests with coverage |

## Success Metrics

### Before (The Bug)

- ✅ 45 tests passing
- ✅ >90% coverage
- ❌ Missing integration tests
- ❌ No call-site audits
- ❌ 5 broken call sites shipped

### After (With This Strategy)

- ✅ All 5 layers tested
- ✅ Integration tests verify API params
- ✅ Call-site audits catch missing parameters
- ✅ CI/CD enforces completeness
- ✅ Bug prevented before merge

## Getting Help

- Read [Comprehensive Test Strategy](comprehensive-test-strategy.md) for full details
- Use `/comprehensive-testing` skill in Claude Code
- Check [templates](../../__tests__/templates/) for examples
- See [CI/CD workflow](../../.github/workflows/test-verification.yml) for automation

---

**Remember**: The goal is not 100% coverage. The goal is zero integration bugs.
