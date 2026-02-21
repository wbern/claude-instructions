# Contributing

Thanks for your interest in contributing!

## Ways to Contribute

### Report Issues or Suggest Ideas
The easiest way to contribute is to [open a GitHub issue](https://github.com/wbern/claude-instructions/issues). Bug reports, feature requests, and command ideas are all welcome.

### Submit Code Changes
To contribute code:
1. **Fork the repository** on GitHub
2. Clone your fork locally
3. Create a branch for your changes
4. Follow the development workflow below
5. Open a pull request from your fork

---

## How It Works

This repository uses a **custom transform system** for markdown transclusion to eliminate duplication and maintain consistency across commands.

## Development Workflow

### 1. Install dependencies

```bash
pnpm install
```

### 2. Edit fragments or sources

- **Edit shared content** in `src/fragments/`
- **Edit command-specific content** in `src/sources/`
- **Use INCLUDE syntax** `<!-- docs INCLUDE path='src/fragments/fragment-name.md' --><!-- /docs -->` to reference fragments

### 3. Build

```bash
pnpm build
```

This generates:
- `.claude/commands/` - Local commands for development
- Updates README.md with command list

### 4. Test locally

- Restart Claude Code to load updated commands
- Test commands work correctly: `/red`, `/green`, etc.
- Verify fragment inclusion is correct
- Check README.md has correct command list

### 5. Run tests

```bash
pnpm test
```

Ensures:
- All snapshot tests pass
- Unit tests pass for generator functions

### 6. Commit changes

**Commit source files and build artifacts:**
```bash
git add src/ scripts/ .claude/commands/ package.json README.md
git commit -m "feat: update TDD fundamentals fragment"
```

**Important workflow notes:**
- **Build artifacts** (`.claude/commands/`) contain fully expanded content and ARE committed for easy distribution
- After editing sources/fragments, always run `pnpm build` before committing to regenerate artifacts
- Source files should remain clean - the build process expands fragments into artifacts only

## Creating New Commands

**Quick way**: Use the `/contribute-a-command` slash command:
```
/contribute-a-command my-command "Description of what it does"
```

This command guides you through creating a properly structured command with the right fragments and frontmatter.

**Manual steps** (if you prefer):

1. Create source file in `src/sources/new-command.md`
2. Add YAML frontmatter with required fields:
   ```yaml
   ---
   description: Brief description for /help
   argument-hint: [optional-arg] or <required-arg>
   _hint: Short 2-3 word hint
   _category: Test-Driven Development | Planning | Workflow | Utilities
   _order: 1-99
   ---
   ```
3. Use INCLUDE syntax for shared content:
   ```markdown
   <!-- docs INCLUDE path='src/fragments/universal-guidelines.md' -->
   <!-- /docs -->
   ```
4. Run `pnpm build` to generate commands
5. Test in Claude Code with `/new-command`
6. Run `pnpm test` (update snapshots with `-u` if changes are expected)
7. Commit changes (both sources and artifacts are tracked)

## INCLUDE Transclusion Syntax

The transform system uses HTML comment syntax for transclusion:

```markdown
<!-- docs INCLUDE path='src/fragments/fragment-name.md' -->
<!-- /docs -->
```

The content between the comment tags will be replaced with the referenced file during build.

**Benefits:**
- Works with relative paths from project root
- Supports feature flags via `featureFlag` attribute
- Supports fallback content via `elsePath` attribute
- Comment blocks are automatically removed in final output

## Feature Flags

Use the `featureFlag` attribute for conditional content:

```markdown
<!-- docs INCLUDE path='src/fragments/beads-integration.md' featureFlag='beads' -->
<!-- /docs -->
```

This content will only be included when building with the specified flag enabled.

Flags are defined in `scripts/cli-generator.ts` (`FLAG_OPTIONS`). Examples: `beads`, `no-plan-files`.

## Fragment System Benefits

- **Single source of truth** for TDD fundamentals and shared instructions
- **Faster updates** - edit once in fragments/, rebuild all affected commands
- **Guaranteed consistency** - fragments ensure identical content across commands
- **Auto-generated README** - command list generated from source descriptions
- **Dynamic generation** - CLI generates commands on-the-fly with optional feature flags
- **Snapshot testing** - catch unintended changes in generated output

## Available Build Commands

- `pnpm build` - Build README.md and copy commands to `.claude/commands/`
- `pnpm test` - Run all tests including snapshot tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm generate` - Run interactive command generator

## Interactive Command Generator

Run the interactive installer:

```bash
pnpm generate
```

Prompts for feature flags, scope, and other options.
