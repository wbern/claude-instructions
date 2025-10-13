# Claude Instructions

Custom slash commands and settings for Claude Code CLI.

## Installation

```bash
git clone https://github.com/wbern/claude-instructions.git /tmp/claude-instructions && cp -r /tmp/claude-instructions/.claude/* ~/.claude/ && rm -rf /tmp/claude-instructions
```

## Available Commands

### TDD Workflow

- `/red` - Write failing tests
- `/green` - Make failing tests pass
- `/refactor` - Refactor code while keeping tests green

### Misc

- `/commit` - Commit changes following best practices
- `/cycle` - Run a TDD cycle (red-green-refactor)
- `/issue` - Create or work on GitHub issues
- `/spike` - Exploratory coding without tests

## Usage

After installation, use any command in Claude Code:

```bash
claude /red "implement user authentication"
```
