---
description: Create a new slash command for this repository
argument-hint: <command-name> <command-info>
---

## General Guidelines

### Output Style

- **Never explicitly mention TDD** in code, comments, commits, PRs, or issues
- Write natural, descriptive code without meta-commentary about the development process
- The code should speak for itself - TDD is the process, not the product

Beads is available for task tracking. Use `mcp__beads__*` tools to manage issues (the user interacts via `bd` commands).

## Plan File Restriction

**NEVER create, read, or update plan.md files.** Claude Code's internal planning files are disabled for this project. Use other methods to track implementation progress (e.g., comments, todo lists, or external tools).

Create a new custom command in `src/sources/` following the patterns below. Assess the structure carefully using the below info but also researching the repo.

Command to create: $ARGUMENTS

## File Structure

Create `src/sources/<command-name>.md` with:

1. Frontmatter (required fields below)
2. INCLUDE directives for shared content

- We always include the  `docs INCLUDE path='src/fragments/universal-guidelines.md'` fragment

1. Command-specific content
2. Exactly ONE `[DOLLAR]ARGUMENTS` placeholder

After creating, run `pnpm build` and `pnpm vitest run -u` to update snapshots.

## Frontmatter Template

```yaml
---
description: Brief description for /help
argument-hint: [optional-arg] or <required-arg> or (no arguments - interactive)
_hint: Short 2-3 word hint
_category: Test-Driven Development | Planning | Workflow | Ship / Show / Ask | Utilities | [Something else]
_order: 1-99
---
```

Optional: `_requested-tools` (array), `_selectedByDefault: false`

## Category Patterns

### Test-Driven Development (spike, red, green, refactor, cycle)

```markdown
[PHASE] PHASE! Apply the below to the info given by user input here:

[DOLLAR]ARGUMENTS

< !-- docs INCLUDE path='src/fragments/universal-guidelines.md' -->
< !-- /docs -->

< !-- docs INCLUDE path='src/fragments/beads-awareness.md' featureFlag='beads' -->
< !-- /docs -->

< !-- docs INCLUDE path='src/fragments/fallback-arguments-beads.md' featureFlag='beads' elsePath='src/fragments/fallback-arguments.md' -->
< !-- /docs -->

< !-- docs INCLUDE path='src/fragments/tdd-fundamentals.md' -->
< !-- /docs -->
```

Add for refactor: `peeping-tom-warning.md`, `consistency-check.md`
Add for red: `aaa-pattern.md`

### Planning (issue, plan)

```markdown
# [Title]

< !-- docs INCLUDE path='src/fragments/universal-guidelines.md' -->
< !-- /docs -->

< !-- docs INCLUDE path='src/fragments/beads-awareness.md' featureFlag='beads' -->
< !-- /docs -->

[Description and [DOLLAR] embedded in flow]

< !-- docs INCLUDE path='src/fragments/discovery-phase.md' -->
< !-- /docs -->

< !-- docs INCLUDE path='src/fragments/beads-integration.md' featureFlag='beads' -->
< !-- /docs -->
```

### Workflow (commit, pr, gap, code-review)

```markdown
< !-- docs INCLUDE path='src/fragments/universal-guidelines.md' -->
< !-- /docs -->

< !-- docs INCLUDE path='src/fragments/beads-awareness.md' featureFlag='beads' -->
< !-- /docs -->

[Workflow description]

[DOLLAR]

[Process steps]
```

commit: add `commit-process.md`, `no-plan-files.md` (with flag)
pr/gap: add `beads-integration.md` at end
code-review: add `_requested-tools` for git commands

### Ship / Show / Ask (ship, show, ask)

Use `_selectedByDefault: false`. Include prerequisites, safety checks, and reference other S/S/A commands.

### Utilities (add-command, kata, tdd-review)

Flexible structure. Interactive commands use `(no arguments - interactive)` hint.

## Available Fragments

| Fragment | Use For |
|----------|---------|
| `universal-guidelines.md` | Always first |
| `beads-awareness.md` | Always second (featureFlag='beads') |
| `tdd-fundamentals.md` | TDD commands |
| `fallback-arguments-beads.md` | TDD fallback (featureFlag='beads', elsePath to fallback-arguments.md) |
| `aaa-pattern.md` | Red phase |
| `peeping-tom-warning.md` | Refactor phase |
| `consistency-check.md` | Refactor, gap |
| `discovery-phase.md` | Planning |
| `beads-integration.md` | PR, planning (featureFlag='beads') |
| `commit-process.md` | Commit |
| `no-plan-files.md` | Commit (featureFlag='no-plan-files') |
| `github-issue-fetch.md` | Issue fetching |
| `test-quality-criteria.md` | Code review |

## Rules

1. `[DOLLAR]` - exactly once per source, never in fragments
2. Fragments must not include other fragments
3. Remove space after `<` in real INCLUDE directives (shown escaped above)
4. Underscore-prefixed metadata stripped from output

## Testing Requirements

| Change | Required |
|--------|----------|
| Content (fragment/source) | Snapshot update |
| Feature flag | Conditional test (enabled + disabled), FLAG_OPTIONS, CLI mock |
| CLI option | `cli.test.ts` mock |
| Generation logic | Unit test |

Existing tests cover: fragment references, $ARGUMENTS, no nested fragments. Snapshots cover content. TypeScript covers structure. Don't duplicate.
