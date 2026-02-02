---
description: Create a new slash command for this repository
argument-hint: <command-name> <command-info>
_hint: Create command
_category: Utilities
_order: 99
---

<!-- docs INCLUDE path='src/fragments/universal-guidelines.md' -->
<!-- /docs -->

<!-- docs INCLUDE path='src/fragments/beads-awareness.md' featureFlag='beads' -->
<!-- /docs -->

<!-- docs INCLUDE path='src/fragments/no-plan-files.md' featureFlag='no-plan-files' -->
<!-- /docs -->

Create a new custom command in `src/sources/` following the patterns below. Assess the structure carefully using the below info but also researching the repo.

**User arguments:**

Contribute-a-command: $ARGUMENTS

**End of user arguments**

## File Structure

Create `src/sources/<command-name>.md` with:
1. Frontmatter (required fields below)
2. INCLUDE directives for shared content
  - We always include the  `docs INCLUDE path='src/fragments/universal-guidelines.md'` fragment
3. Command-specific content
4. Exactly ONE `[DOLLAR]ARGUMENTS` placeholder

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
**User arguments:**

[CommandName]: [DOLLAR]ARGUMENTS

**End of user arguments**

[PHASE] PHASE! Apply the below to the user input above.

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

[Description]

**User arguments:**

[CommandName]: [DOLLAR]ARGUMENTS

**End of user arguments**

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

**User arguments:**

[CommandName]: [DOLLAR]ARGUMENTS

**End of user arguments**

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
| `github-issue-fetch.md` | Issue fetching (MCP-first with CLI fallback, default) |
| `github-issue-fetch-gh-mcp.md` | Issue fetching (MCP only, featureFlag='gh-mcp') |
| `github-issue-fetch-gh-cli.md` | Issue fetching (CLI only, featureFlag='gh-cli') |
| `github-pr-fetch.md` | PR fetching (MCP-first with CLI fallback, default) |
| `github-pr-fetch-gh-mcp.md` | PR fetching (MCP only, featureFlag='gh-mcp') |
| `github-pr-fetch-gh-cli.md` | PR fetching (CLI only, featureFlag='gh-cli') |
| `git-host-detection.md` | Multi-host detection (MCP+CLI, default) |
| `git-host-detection-gh-mcp.md` | Multi-host detection (MCP only, featureFlag='gh-mcp') |
| `git-host-detection-gh-cli.md` | Multi-host detection (CLI only, featureFlag='gh-cli') |
| `test-quality-criteria.md` | Code review |

## Rules

1. `[DOLLAR]` - exactly once per source, never in fragments
2. Fragments must not include other fragments
3. Remove space after `<` in real INCLUDE directives (shown escaped above)
4. Underscore-prefixed metadata stripped from output
