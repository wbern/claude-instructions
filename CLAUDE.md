# Claude Instructions Repository

> **Note:** This file contains instructions for managing THIS repository.
> Users installing the commands should NOT copy this file - it's for maintainers only.

**GitHub URL:** `https://github.com/wbern/claude-instructions` (NOT KenDev-AB)

This repository contains a fragment-based system for generating Claude Code slash commands with TDD focus.

## Architecture

### Fragment System
- **Sources** (`src/sources/*.md`): Command templates with INCLUDE directives only
- **Fragments** (`src/fragments/*.md`): Reusable content blocks
- **Local commands** (`.claude/commands/`): Generated commands for local development
- **Dynamic generation**: CLI generates commands on-the-fly with optional feature flags (e.g., `beads`)

### Key Principles
1. **Single source of truth**: Content lives in fragments, not sources
2. **Clean sources**: Source files contain only INCLUDE directives, never expanded content
3. **Track artifacts**: Both sources and built commands are committed for easy distribution
4. **Feature flags**: Use `featureFlag='beads'` for conditional content

### Contributor Commands
Source files prefixed with underscore (`_*.md`) are "contributor commands":
- **Excluded** from npm package distribution (consumers never see them)
- **Included** in this repo's `.claude/commands/` for maintainers
- Underscore prefix is stripped from output filename (`_foo.md` → `foo.md`)
- Not listed in README command list
- Use `--include-contrib-commands` internal flag to include them

## Development Workflow

### Package Manager
- Use `pnpm` for all package operations

### Common Commands
```bash
pnpm build          # Build README.md and local commands
pnpm test           # Run tests
pnpm vitest run -u  # Update snapshots
```

### Git Hooks (Husky)
Pre-commit hook automatically:
1. Builds (includes markdownlint --fix)
2. Runs tests
3. Stages generated files (README.md, .claude/commands/)

This ensures artifacts are always in sync with sources.

### Build Process
1. markdown-magic expands INCLUDE directives from fragments
2. Comment blocks are removed from output
3. markdownlint --fix corrects formatting (list numbering, spacing)
4. README.md automatically updated
5. .claude/commands/ generated with beads flag enabled

### Making Changes

**Editing Content:**
- Edit fragments in `src/fragments/` (not sources)
- Sources should only contain INCLUDE directives
- Run `pnpm build` to propagate changes
- Update snapshots if tests fail

**Adding Commands:**
1. Create source file in `src/sources/`
2. Use INCLUDE directives for reusable content
3. Build and test
4. Commit both source and generated artifacts

**Fragment Syntax:**
```markdown
<!-- docs INCLUDE path='src/fragments/filename.md' -->
<!-- /docs -->
```

With feature flag:
```markdown
<!-- docs INCLUDE path='src/fragments/filename.md' featureFlag='beads' -->
<!-- /docs -->
```

## Content Guidelines

### TDD Focus
- All commands emphasize Test-Driven Development
- Red-Green-Refactor cycle is central
- Core violations clearly documented
- Incremental development approach

### Security & Safety
- **Never** use wildcard patterns like `Bash(git:*)` or `allowed-tools: *`
- Use specific command patterns: `Bash(git status:*)`, `Bash(npm list:*)`
- Intrusive tools (Write, Edit) only when explicitly needed
- No AI credits in commit messages

### Examples & Documentation
- Use generic examples, avoid team-specific references
- Low issue numbers (#123, not #14533)
- Common terminology over domain jargon
- Standard repository structure (app/, packages/*, not apps/cloud-console)

## Testing

Tests verify:
- Snapshot consistency between builds
- File count matching with and without feature flags
- Beads content only when beads flag enabled
- README generation correctness

After content changes, snapshots typically need updating:
```bash
pnpm test           # See what changed
pnpm vitest run -u  # Accept changes
```

## Repository Standards

### Commit Messages
Follow Conventional Commits format:
- `feat(#123): add new command`
- `fix(#123): correct example`
- `docs(#123): update documentation`
- Never include AI credits or co-author tags

### File Organization
```
src/
  sources/       # Command templates (INCLUDE directives only)
  fragments/     # Reusable content blocks
.claude/
  commands/      # Generated commands for local development
scripts/         # Build and test scripts
```

## Common Tasks

### Remove Expanded Content from Sources
If sources accidentally contain expanded content:
```javascript
// Use Edit tool with regex to remove content between INCLUDE tags
// Keep only: <!-- docs INCLUDE ... --> and <!-- /docs -->
```

### Add Conventional Commits Reference
Content lives in `src/fragments/commit-process.md`

### Update TDD Fundamentals
Content lives in `src/fragments/tdd-fundamentals.md`

### Check MCP Integration
MCP validation step fragment: `src/fragments/mcp-validation-step.md`
- We always try to avoid adding fallback logic and values unless the technical design explicitly needs it

<claude-commands-template>
## Testing Requirements

| Change | Required |
|--------|----------|
| Content (fragment/source) | Snapshot update |
| Feature flag | Conditional test (enabled + disabled), FLAG_OPTIONS, CLI mock |
| CLI option | `cli.test.ts` mock |
| Generation logic | Unit test |

Existing tests cover: fragment references, $ARGUMENTS, no nested fragments. Snapshots cover content. TypeScript covers structure. Don't duplicate.
</claude-commands-template>