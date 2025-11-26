# Contributing

This repository uses **markdown-magic** for markdown transclusion to eliminate duplication and maintain consistency across commands.

## Development Workflow

### 1. Install dependencies

```bash
pnpm install
```

### 2. Edit fragments or sources

- **Edit shared content** in `src/fragments/`
- **Edit command-specific content** in `src/sources/`
- **Use markdown-magic syntax** `<!-- docs INCLUDE path='../fragments/fragment-name.md' -->` to reference fragments

### 3. Build for development

```bash
pnpm build:dev
```

This will:
- Process all source files with markdown-magic
- Generate commands in `.claude/commands/*.md` with Beads integration
- Remove markdown-magic comment blocks

**For production builds (both variants):**
```bash
pnpm build
```

This generates:
- `downloads/with-beads/` - Commands with Beads MCP integration
- `downloads/without-beads/` - Standalone TDD workflow
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
- All snapshot tests pass for downloads
- Unit tests pass for generator functions

### 6. Commit changes

**Commit source files and build artifacts:**
```bash
git add src/ scripts/ downloads/ .claude/commands/ package.json README.md
git commit -m "feat: update TDD fundamentals fragment"
```

**Important workflow notes:**
- **Build artifacts** (`downloads/`, `.claude/commands/`) contain fully expanded content and ARE committed for easy distribution
- After editing sources/fragments, always run `pnpm build` before committing to regenerate artifacts
- Source files should remain clean - the build process expands fragments into artifacts only

## Creating New Commands

1. Create source file in `src/sources/new-command.md`
2. Add YAML frontmatter with `description` field:
   ```yaml
   ---
   description: Execute TDD Red Phase - write ONE failing test
   ---
   ```
3. Use markdown-magic syntax for shared content:
   ```markdown
   <!-- docs INCLUDE path='src/fragments/fragment-name.md' -->
   <!-- /docs -->
   ```
4. Run `pnpm build:dev` to test locally
5. Test in Claude Code with `/new-command`
6. Run `pnpm build` to generate production variants
7. Run `pnpm test` to ensure snapshot tests pass
8. Commit changes (both sources and artifacts are tracked)

## Markdown-Magic Transclusion Syntax

Markdown-magic uses HTML comment syntax for transclusion:

```markdown
<!-- docs INCLUDE path='src/fragments/fragment-name.md' -->
<!-- /docs -->
```

The content between the comment tags will be replaced with the referenced file during build.

**Benefits:**
- Works with relative paths
- Supports feature flags via `featureFlag` attribute
- Comment blocks are automatically removed in final output
- No custom build code needed

## Feature Flags

Use the `featureFlag` attribute for conditional content:

```markdown
<!-- docs INCLUDE path='src/fragments/beads-integration.md' featureFlag='beads' -->
<!-- /docs -->
```

This content will only be included when building with Beads integration enabled.

**Available flags:**
- `beads` - Beads MCP integration (used in with-beads variant)

## Fragment System Benefits

- **Single source of truth** for TDD fundamentals and shared instructions
- **Faster updates** - edit once in fragments/, rebuild all affected commands
- **Guaranteed consistency** - fragments ensure identical content across commands
- **Auto-generated README** - command list generated from source descriptions
- **Multiple build variants** - with-beads and without-beads from single source
- **Snapshot testing** - catch unintended changes in generated output

## Available Build Commands

- `pnpm build:dev` - Build with-beads variant to `.claude/commands/` for local testing and consumption
- `pnpm build` - Build both variants to `downloads/` for distribution
- `pnpm clean:dev` - Clean `.claude/commands/`
- `pnpm clean` - Clean `downloads/`
- `pnpm test` - Run all tests including snapshot tests
- `pnpm test:watch` - Run tests in watch mode

## Interactive Command Generator

Run the interactive installer:

```bash
pnpm generate
```

Prompts for variant selection and installation directory.
