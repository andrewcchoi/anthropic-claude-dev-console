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

## Innovation: AI-Powered Test Generation

This strategy includes an **AI-powered test generator** that analyzes your code and creates draft tests automatically:

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
