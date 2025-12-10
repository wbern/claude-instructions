---
description: Code review using dynamic category detection and domain-specific analysis
argument-hint: (optional) [branch, PR#, or PR URL] - defaults to current branch
  - Bash(git diff:*)
  - Bash(git status:*)
  - Bash(git log:*)
  - Bash(git rev-parse:*)
  - Bash(git merge-base:*)
  - Bash(git branch:*)
---

## General Guidelines

### Output Style

- **Never explicitly mention TDD** in code, comments, commits, PRs, or issues
- Write natural, descriptive code without meta-commentary about the development process
- The code should speak for itself - TDD is the process, not the product

Beads is available for task tracking. Use `mcp__beads__*` tools to manage issues (the user interacts via `bd` commands).

# Code Review

Perform a code review using dynamic category detection.

## Phase 0: Setup & Categorization

### Determine What to Review

Parse the argument to determine the review target:

| Input | Action |
|-------|--------|
| No argument | Detect divergence point, confirm scope with user |
| Branch name | Use specified branch as base |
| PR number (e.g., `123`) | Fetch PR diff from GitHub |
| PR URL (e.g., `https://github.com/owner/repo/pull/123`) | Extract PR number and fetch diff |

**For GitHub PRs:**

1. Try GitHub MCP first: `mcp__github__pull_request_read` with `method: "get_diff"`
2. Fall back to `gh` CLI: `gh pr diff <number>`
3. If neither works, report error and stop

**For local branches (no argument or branch name provided):**

1. **Get current branch**: `git rev-parse --abbrev-ref HEAD`

2. **Check for uncommitted changes**: `git status --porcelain`
   - If output is non-empty, note that uncommitted changes exist

3. **Detect divergence point** (skip if branch name was provided as argument):
   - Get all local branches except current: `git branch --format='%(refname:short)'`
   - For each branch, find merge-base: `git merge-base HEAD <branch>`
   - Count commits from merge-base to HEAD: `git rev-list --count <merge-base>..HEAD`
   - The branch with the **fewest commits back** (closest merge-base) is the likely parent
   - If no other branches exist, fall back to `main`, `master`, or `develop` if they exist as remote tracking branches

4. **Confirm scope with user** using `AskUserQuestion`:

   **Question 1 - "Review scope"** (header: "Base branch"):
   - Option A: `From <detected-branch>` — "Review N commits since diverging from <branch>"
   - Option B: `Different branch` — "Specify another branch to compare against"
   - Option C: `Uncommitted only` — "Review only staged/unstaged changes, skip committed work"

   **Question 2 - "Include uncommitted?"** (header: "Uncommitted", only ask if uncommitted changes exist AND user didn't pick option C):
   - Option A: `Yes` — "Include N staged/unstaged files in review"
   - Option B: `No` — "Review only committed changes"

5. **Collect changed files** based on user selection:
   - From branch: `git diff --name-only <base>...HEAD`
   - Uncommitted unstaged: `git diff --name-only`
   - Uncommitted staged: `git diff --name-only --cached`
   - Combine and deduplicate the file list

6. **If no changes**: Report "Nothing to review" and stop

### Categorize Files

Check for CLAUDE.md - if it exists, note any project-specific review patterns.

Categorize each changed file into ONE primary category based on these patterns:

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

Output the categorization:

```
## Categorization

Base branch: <branch>
Total files changed: <n>

| Category | Files |
|----------|-------|
| <category> | <count> |
...
```

## Phase 1: Branch Brief

From the diff and recent commit messages (`git log <base>...HEAD --oneline`), infer:

- **Goal**: What this branch accomplishes (1-3 sentences)
- **Constraints**: Any implied requirements (security, performance, backwards compatibility)
- **Success checklist**: What must work after this change, what must not break

```
## Branch Brief

**Goal**: ...
**Constraints**: ...
**Checklist**:
- [ ] ...
```

## Phase 2: Category Reviews

For each detected category with changes, run a targeted review. Skip categories with no changes.

### Frontend/UI Review Criteria

- Accessibility: ARIA attributes, keyboard navigation, screen reader support
- Component patterns: Composition, prop drilling, context usage
- State management: Unnecessary re-renders, stale closures
- Performance: memo/useMemo/useCallback usage, lazy loading, bundle impact

### Frontend/Styling Review Criteria

- Responsive design: Breakpoints, mobile-first
- Design system: Token usage, consistent spacing/colors
- CSS specificity: Overly specific selectors, !important usage
- Theme support: Dark mode, CSS variables

### Backend/API Review Criteria

- Input validation: Sanitization, type checking, bounds
- Security: Authentication checks, authorization, injection risks
- Error handling: Proper status codes, meaningful messages, logging
- Performance: N+1 queries, missing indexes, pagination

### Backend/Data Review Criteria

- Migration safety: Reversibility, data preservation
- Data integrity: Constraints, foreign keys, nullability
- Index usage: Queries have appropriate indexes
- Backwards compatibility: Existing data still works

### Tooling/Config Review Criteria

- Breaking changes: Does this affect developer workflow?
- Dependency compatibility: Version conflicts, peer deps
- Build performance: Added build time, bundle size

### CI/CD Review Criteria

- Secrets exposure: Credentials in logs, env vars
- Pipeline efficiency: Caching, parallelization
- Failure handling: Notifications, rollback strategy

### Tests Review Criteria

- Coverage: Edge cases, error paths, boundaries
- Assertion quality: Specific assertions, not just "no error"
- Flaky patterns: Timing dependencies, order dependencies, shared state

### Docs Review Criteria

- Technical accuracy: Code examples work, APIs documented correctly
- Completeness: All new features documented
- Clarity: Easy to follow, good examples

**Output format per category:**

```
## <Category> Review (<n> files)

### file:line - [blocker|risky|nit] Title
Description of the issue and why it matters.
Suggested fix or question to investigate.

...
```

## Phase 3: Cross-Cutting Analysis

After reviewing all categories, check for cross-cutting issues:

- API changed but tests didn't update?
- New feature but no documentation?
- Migration added but no rollback tested?
- Config changed but README not updated?
- Security-sensitive code without corresponding test?

```
## Cross-Cutting Issues

- [ ] <issue description>
...
```

## Phase 4: Summary

### PR Description (draft)

Provide a ready-to-paste PR description:

```
## What changed
- <by category, 1-2 bullets each>

## Why
- <motivation>

## Testing
- <how to verify>

## Notes
- <migration steps, breaking changes, etc.>
```

### Review Checklist

```
## Before Merge

### Blockers (must fix)
- [ ] ...

### Risky (highlight to reviewers)
- [ ] ...

### Follow-ups (can defer)
- [ ] ...
```

---

Review target (branch name, PR number, or PR URL - leave empty for current branch): $ARGUMENTS
