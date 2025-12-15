---
description: Review test suite quality against FIRST principles and TDD anti-patterns
argument-hint: [optional test file or directory path]
---

## General Guidelines

### Output Style

- **Never explicitly mention TDD** in code, comments, commits, PRs, or issues
- Write natural, descriptive code without meta-commentary about the development process
- The code should speak for itself - TDD is the process, not the product

Beads is available for task tracking. Use `mcp__beads__*` tools to manage issues (the user interacts via `bd` commands).

(If there was no info above, fallback to:

1. Context of the conversation, if there's an immediate thing
2. `bd ready` to see what to work on next and start from there)

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

#### FIRST Principles

| Principle | What to Check |
|-----------|---------------|
| **Fast** | Tests complete quickly, no I/O, no network calls, no sleep()/setTimeout delays |
| **Independent** | No shared mutable state, no execution order dependencies between tests |
| **Repeatable** | No Date.now(), no Math.random() without seeding, no external service dependencies |
| **Self-validating** | Meaningful assertions that verify behavior, no manual verification needed |

#### TDD Anti-patterns

| Anti-pattern | Detection Signals |
|--------------|-------------------|
| **The Liar** | `expect(true).toBe(true)`, empty test bodies, tests with no assertions |
| **Excessive Setup** | >20 lines of arrange code, >5 mocks, deep nested object construction |
| **The One** | >5 assertions testing unrelated behaviors in a single test |
| **The Peeping Tom** | Testing private methods, asserting on internal state, tests that break on any refactor |
| **The Slow Poke** | Real database/network calls, file I/O, hard-coded timeouts |

#### Test Structure (AAA Pattern)

- **Arrange**: Clear setup with minimal fixtures
- **Act**: Single action being tested
- **Assert**: Specific, behavior-focused assertions

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
