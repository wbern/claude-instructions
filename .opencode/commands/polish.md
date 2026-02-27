---
description: Review and address issues in existing code - fix problems or justify skipping
argument-hint: [branch, PR#, file, or area to polish]
---

## General Guidelines

### Output Style

- **Never explicitly mention TDD** in code, comments, commits, PRs, or issues
- Write natural, descriptive code without meta-commentary about the development process
- The code should speak for itself - TDD is the process, not the product

Beads is available for task tracking. Use `mcp__beads__*` tools to manage issues (the user interacts via `bd` commands).

## Plan File Restriction

**NEVER create, read, or update plan.md files.** Claude Code's internal planning files are disabled for this project. Use other methods to track implementation progress (e.g., comments, todo lists, or external tools).

# Polish

Take another pass at existing work to address issues. Unlike `/code-review` which only identifies problems, `/polish` resolves each finding by either:

1. **Fixing** - Implement the improvement
2. **Skipping with justification** - Document why the issue can be deferred or ignored

## Phase 0: Determine Scope

Parse the argument to determine what to polish:

| Input | Action |
|-------|--------|
| No argument | Detect divergence point, review uncommitted + committed changes |
| Branch name | Changes from that branch to HEAD |
| PR number (e.g., `123`) | Fetch PR diff from GitHub |
| PR URL (e.g., `github.com/.../pull/123`) | Extract PR number and fetch diff |
| File/path | Focus on specific file(s) |

**For GitHub PRs:**

1. Try GitHub MCP first: `mcp__github__pull_request_read` with `method: "get_diff"`
2. Fall back to `gh` CLI: `gh pr diff <number>`
3. If neither works, report error and stop

**For local branches:**

1. Get current branch: `git rev-parse --abbrev-ref HEAD`
2. Detect divergence point (same logic as `/code-review`)
3. Collect changed files from diff and uncommitted changes

## Phase 1: Identify Issues

Categorize files based on these patterns:

| Category | File Patterns |
|----------|---------------|
| Frontend/UI | `*.tsx`, `*.jsx`, `components/`, `pages/`, `views/`, `*.vue` |
| Frontend/Styling | `*.css`, `*.scss`, `*.less`, `styles/`, `*.tailwind*`, `*.styled.*` |
| Backend/API | `routes/`, `api/`, `controllers/`, `services/`, `*.controller.*`, `*.service.*`, `*.resolver.*` |
| Backend/Data | `migrations/`, `models/`, `prisma/`, `schema.*`, `*.model.*`, `*.entity.*` |
| Tooling/Config | `scripts/`, `*.config.*`, `package.json`, `tsconfig.*`, `vite.*`, `webpack.*`, `eslint.*` |
| CI/CD | `.github/`, `.gitlab-ci.*`, `Dockerfile`, `docker-compose.*`, `*.yml` in CI paths |
| Tests | `*.test.*`, `*.spec.*`, `__tests__/`, `__mocks__/`, `*.stories.*` |
| Docs | `*.md`, `docs/`, `README*`, `CHANGELOG*` |

For each category, identify issues at these severity levels:

- **blocker** - Must fix before merge
- **risky** - Should fix or have strong justification
- **nit** - Nice to have, easily skippable

## Phase 2: Address Each Issue

For each identified issue, present it and then take action:

### Format

```
### [file:line] [severity] Title

**Issue:** Description of the problem

**Action taken:**
- [ ] Fixed: [what was done]
- [ ] Skipped: [justification]
```

### Decision Guidelines

**Fix when:**

- Security vulnerability
- Correctness bug
- Missing error handling that could crash
- Breaking API changes without migration
- Tests that don't actually test anything

**Skip with justification when:**

- Stylistic preference with no functional impact
- Optimization for unlikely hot paths
- Refactoring that would expand scope significantly
- Issue exists in code outside the change scope
- Technical debt documented for future sprint

### Fixing Issues

When fixing:

1. Make the minimal change to address the issue
2. Ensure tests still pass (run them if needed)
3. Don't expand scope beyond the identified issue

### Watch for Brittle Tests

When refactoring implementation, watch for **Peeping Tom** tests that:

- Test private methods or internal state directly
- Assert on implementation details rather than behavior
- Break on any refactoring even when behavior is preserved

If tests fail after a pure refactoring (no behavior change), consider whether the tests are testing implementation rather than behavior.

### Skipping Issues

Valid skip justifications:

- "Out of scope - exists in unchanged code"
- "Performance optimization unnecessary - called N times per request"
- "Tracked for future work - see issue #X"
- "Intentional design decision - [reason]"
- "Would require significant refactoring - defer to dedicated PR"

Invalid skip justifications:

- "Too hard to fix"
- "It works fine"
- "No time"

## Phase 3: Cross-Cutting Check

After addressing individual issues:

1. **Consistency check** - Look for inconsistent patterns, naming conventions, or structure across the codebase

Additional cross-cutting checks:

- Did fixes introduce new inconsistencies?
- Are skip justifications consistent with each other?
- Any patterns in what was skipped that suggest a bigger issue?

## Phase 4: Summary

```
## Polish Summary

### Fixed
- [list of fixes applied]

### Skipped (with justification)
- [issue]: [justification]

### Tests
- [ ] All tests passing
- [ ] No new warnings introduced

### Remaining Work
- [any follow-up items identified]
```

---

**User arguments:**

Polish: $ARGUMENTS

**End of user arguments**

## Testing Requirements

| Change | Required |
|--------|----------|
| Content (fragment/source) | Snapshot update |
| Feature flag | Conditional test (enabled + disabled), FLAG_OPTIONS, CLI mock |
| CLI option | `cli.test.ts` mock |
| Generation logic | Unit test |

Existing tests cover: fragment references, $ARGUMENTS, no nested fragments. Snapshots cover content. TypeScript covers structure. Don't duplicate.
