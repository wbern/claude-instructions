---
description: Guide for creating new slash commands
argument-hint: <command-name> <description>
_hint: Create command
_category: Utilities
_order: 3
---

<!-- docs INCLUDE path='src/fragments/universal-guidelines.md' -->
<!-- /docs -->

<!-- docs INCLUDE path='src/fragments/beads-awareness.md' featureFlag='beads' -->
<!-- /docs -->

# Slash Command Creator Guide

## How This Command Works
The `/add-command` command shows this guide for creating new slash commands. It includes:
- Command structure and syntax
- Common patterns and examples
- Security restrictions and limitations
- Frontmatter options

**Note for AI**: When creating commands, you CAN use bash tools like `Bash(mkdir:*)`, `Bash(ls:*)`, `Bash(git status:*)` in the `allowed-tools` frontmatter of NEW commands - but ONLY for operations within the current project directory. This command itself doesn't need bash tools since it's just documentation.

## Command Locations
- **Personal**: `~/.claude/commands/` (available across all projects)
- **Project**: `.claude/commands/` (shared with team, shows "(project)")

## Basic Structure

```markdown
---
allowed-tools: Read, Glob, Grep, Bash(git status:*), Task
description: Brief description of what this command does
argument-hint: [required-arg] [optional-arg]
---

# Command Title

Your command instructions here.

Arguments: $ARGUMENTS

File reference: @path/to/file.js

Bash command output: (exclamation)git status(backticks)
```

## ⚠️ Security Restrictions

**Bash Commands (exclamation prefix)**: Limited to current working directory only.
- ✅ Works: `! + backtick + git status + backtick` (in project dir)
- ❌ Blocked: `! + backtick + ls /outside/project + backtick` (outside project)  
- ❌ Blocked: `! + backtick + pwd + backtick` (if referencing dirs outside project)

**File References (`@` prefix)**: No directory restrictions.
- ✅ Works: `@/path/to/system/file.md`
- ✅ Works: `@../other-project/file.js`

## Common Patterns

### Simple Command
```bash
echo "Review this code for bugs and suggest fixes" > ~/.claude/commands/review.md
```

### Command with Arguments
<!-- docs INCLUDE path='src/fragments/fullwidth-dollar-note.md' -->
<!-- /docs -->
```markdown
Fix issue ＄ARGUMENTS following our coding standards
```

### Command with File References
```markdown
Compare @src/old.js with @src/new.js and explain differences
```

### Command with Bash Output (Project Directory Only)
```markdown
---
allowed-tools: Bash(git status:*), Bash(git branch:*), Bash(git log:*)
---
Current status: (!)git status(`)
Current branch: (!)git branch --show-current(`)
Recent commits: (!)git log --oneline -5(`)

Create commit for these changes.
```

**Note**: Only works with commands in the current project directory.

### Namespaced Command
<!-- docs INCLUDE path='src/fragments/fullwidth-dollar-note.md' -->
<!-- /docs -->
```bash
mkdir -p ~/.claude/commands/ai
echo "Ask GPT-5 about: ＄ARGUMENTS" > ~/.claude/commands/ai/gpt5.md
# Creates: /ai:gpt5
```

## Frontmatter Options
- `allowed-tools`: Tools this command can use
  - **Important**: Intrusive tools like `Write`, `Edit`, `NotebookEdit` should NEVER be allowed in commands unless the user explicitly requests them. These tools modify files and should only be used when the command's purpose is to make changes.
  - ✅ Safe for most commands: `Read`, `Glob`, `Grep`, `Bash(git status:*)`, `Task`, `AskUserQuestion`
- `description`: Brief description (shows in /help)
- `argument-hint`: Help text for arguments
- `model`: Specific model to use

## Best Practices

### Safe Commands (No Security Issues)
```markdown
# System prompt editor (file reference only)  
(@)path/to/system/prompt.md

Edit your system prompt above.
```

### Project-Specific Commands (Bash OK)
```markdown
---
allowed-tools: Bash(git status:*), Bash(npm list:*)
---
Current git status: (!)git status(`)
Package info: (!)npm list --depth=0(`)

Review project state and suggest next steps.
```

### Cross-Directory File Access (Use @ not !)
```markdown
# Compare config files
Compare (@)path/to/system.md with (@)project/config.md

Show differences and suggest improvements.
```

## Usage
After creating: `/<command-name> [arguments]`

Example: `/review` or `/ai:gpt5 "explain this code"`
