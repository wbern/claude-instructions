---
description: Review test suite quality against FIRST principles and TDD anti-patterns
argument-hint: [optional test file or directory path]
_hint: Review tests
_category: Test-Driven Development
_order: 45
---

<!-- docs INCLUDE path='src/fragments/universal-guidelines.md' -->
<!-- /docs -->

<!-- docs INCLUDE path='src/fragments/beads-awareness.md' featureFlag='beads' -->
<!-- /docs -->

<!-- docs INCLUDE path='src/fragments/fallback-arguments-beads.md' featureFlag='beads' elsePath='src/fragments/fallback-arguments.md' -->
<!-- /docs -->

# Test Quality Review

Analyze test files against FIRST principles and TDD best practices.

## Phase 1: Scope

| Input | Action |
|-------|--------|
| No argument | Find all test files in project |
| File path | Analyze specific test file |
| Directory | Analyze tests in directory |

Detect test files using common patterns: `*.test.*`, `*.spec.*`, `*.stories.*`, `__tests__/**`

Also check for framework-specific patterns based on the project's languages and tools (e.g., `*_test.go`, `*_test.py`, `Test*.java`, `*.feature` for BDD).

## Phase 2: Analysis

For each test file, check against these criteria:

### Quality Criteria

<!-- docs INCLUDE path='src/fragments/test-quality-criteria.md' -->
<!-- /docs -->

## Phase 3: Report

Output a structured report:

```
## Test Quality Report

### Summary
- Files analyzed: N
- Tests found: N
- Issues found: N (X blockers, Y warnings)

### By File

#### path/to/file.test.ts

| Line | Issue | Severity | Description |
|------|-------|----------|-------------|
| 15 | The Liar | blocker | Test has no assertions |
| 42 | Slow Poke | warning | Uses setTimeout(500) |

### Recommendations
- [ ] Fix blockers before merge
- [ ] Consider refactoring tests with excessive setup
```

### Severity Levels

- **blocker**: Must fix - test provides false confidence (The Liar, no assertions)
- **warning**: Should fix - test quality issue (Slow Poke, Excessive Setup)
- **info**: Consider - style or structure suggestion (AAA pattern)

---

Test path (leave empty for all tests): $ARGUMENTS
