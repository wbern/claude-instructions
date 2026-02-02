---
description: Review and address issues in existing code - fix problems or justify skipping
argument-hint: [branch, PR#, file, or area to polish]
_hint: Fix or skip issues
_category: Workflow
_order: 36
_requested-tools:
  - Bash(git diff:*)
  - Bash(git status:*)
  - Bash(git log:*)
  - Bash(git rev-parse:*)
  - Bash(git merge-base:*)
  - Bash(git branch:*)
---

<!-- docs INCLUDE path='src/fragments/universal-guidelines.md' -->
<!-- /docs -->

<!-- docs INCLUDE path='src/fragments/beads-awareness.md' featureFlag='beads' -->
<!-- /docs -->

<!-- docs INCLUDE path='src/fragments/no-plan-files.md' featureFlag='no-plan-files' -->
<!-- /docs -->

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

<!-- docs INCLUDE path='src/fragments/github-pr-fetch-gh-mcp.md' featureFlag='gh-mcp' -->
<!-- /docs -->
<!-- docs INCLUDE path='src/fragments/github-pr-fetch-gh-cli.md' featureFlag='gh-cli' -->
<!-- /docs -->
<!-- docs INCLUDE path='src/fragments/github-pr-fetch.md' unlessFlags='gh-cli,gh-mcp' -->
<!-- /docs -->

**For local branches:**

1. Get current branch: `git rev-parse --abbrev-ref HEAD`
2. Detect divergence point (same logic as `/code-review`)
3. Collect changed files from diff and uncommitted changes

## Phase 1: Identify Issues

Categorize files based on these patterns:

<!-- docs INCLUDE path='src/fragments/file-categories.md' -->
<!-- /docs -->

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

<!-- docs INCLUDE path='src/fragments/peeping-tom-warning.md' -->
<!-- /docs -->

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

<!-- docs INCLUDE path='src/fragments/consistency-check.md' -->
<!-- /docs -->

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
