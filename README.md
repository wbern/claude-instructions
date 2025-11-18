# Claude Instructions

TDD workflow commands for Claude Code CLI.

## Which Variant Should I Use?

### Without Beads (Recommended for Beginners)

**Start here if you're:**
- New to TDD or this workflow
- Working individually or on small projects
- Want to focus on learning TDD fundamentals first
- Prefer minimal dependencies

The without-beads variant provides the complete TDD workflow (red-green-refactor cycle) without additional issue tracking. It's simpler to get started and easier to understand.

### With Beads (For Teams & Advanced Users)

**Choose this if you:**
- Are comfortable with TDD workflows
- Need issue tracking and workflow management
- Work in a team environment
- Want integrated project planning with `/plan`

The with-beads variant adds [Beads MCP](https://github.com/steveyegge/beads) integration for issue tracking, dependency management, and workflow coordination.

**Upgrading:** You can always start with without-beads and upgrade later by reinstalling the with-beads variant.

## Installation

### Without Beads Integration (Recommended for Beginners)

Standalone TDD workflow commands without dependencies.

**User-level (global - available in all projects):**
```bash
# Clone the repository
git clone https://github.com/KenDev-AB/claude-instructions.git /tmp/claude-instructions

# Copy commands to your user directory
cp /tmp/claude-instructions/downloads/without-beads/*.md ~/.claude/commands/

# Clean up
rm -rf /tmp/claude-instructions
```

**Project-level (current repository only):**
```bash
# Clone the repository
git clone https://github.com/KenDev-AB/claude-instructions.git /tmp/claude-instructions

# Create commands directory and copy files
mkdir -p .claude/commands
cp /tmp/claude-instructions/downloads/without-beads/*.md .claude/commands/

# Clean up
rm -rf /tmp/claude-instructions
```

### With Beads Integration

Includes [Beads MCP](https://github.com/steveyegge/beads) integration for issue tracking and workflow management.

**User-level (global - available in all projects):**
```bash
# Clone the repository
git clone https://github.com/KenDev-AB/claude-instructions.git /tmp/claude-instructions

# Copy commands to your user directory
cp /tmp/claude-instructions/downloads/with-beads/*.md ~/.claude/commands/

# Clean up
rm -rf /tmp/claude-instructions
```

**Project-level (current repository only):**
```bash
# Clone the repository
git clone https://github.com/KenDev-AB/claude-instructions.git /tmp/claude-instructions

# Create commands directory and copy files
mkdir -p .claude/commands
cp /tmp/claude-instructions/downloads/with-beads/*.md .claude/commands/

# Clean up
rm -rf /tmp/claude-instructions
```

**Requirements:**
- Install [Beads MCP](https://github.com/steveyegge/beads) for full functionality
- Configure Beads in your project with `bd init`

**Note:** User-level installation makes commands available globally in all your projects. Project-level installation only makes them available in the current repository.

After installation, restart Claude Code if it's currently running.

## Available Commands

<!-- docs COMMANDS_LIST -->
### TDD Workflow

- `/cycle` - Execute complete TDD cycle - Red, Green, and Refactor phases in sequence
- `/green` - Execute TDD Green Phase - write minimal implementation to pass the failing test
- `/issue` - Analyze GitHub issue and create TDD implementation plan
- `/red` - Execute TDD Red Phase - write ONE failing test
- `/refactor` - Execute TDD Refactor Phase - improve code structure while keeping tests green
- `/spike` - Execute TDD Spike Phase - exploratory coding to understand problem space before TDD

### Workflow

- `/commit` - Create a git commit following project standards

### Worktree Management

- `/worktree-add` - Add a new git worktree from branch name or GitHub issue URL, copy settings, install deps, and open in current IDE
- `/worktree-cleanup` - Clean up merged worktrees by verifying PR/issue status, consolidating settings, and removing stale worktrees

### Utilities

- `/add-command` - Guide for creating new slash commands
- `/ask` - Request team review and approval - for complex changes needing discussion (OK fine, traditional PRs still have their place - Cursor)
- `/plan` - Create implementation plan from feature/requirement with PRD-style discovery and TDD acceptance criteria
- `/ship` - Ship code directly to main - for small, obvious changes that don't need review (Cursor's modern alternative to PRs)
- `/show` - Show code to team with auto-merge - for changes that should be visible but don't need approval (Cursor's modern workflow)
- `/tdd` - Remind agent about TDD approach and continue conversation
<!-- /docs -->

## Getting Started

### Quick Start: Your First TDD Cycle

Here's a simple example to get you started with the TDD workflow:

**1. Write a failing test (`/red`)**
```
You: /red add a function that validates email addresses

Claude: I'll write a failing test for email validation.
[Creates test file with a test that checks email validation]
[Runs test - shows it failing because function doesn't exist yet]
```

**2. Make it pass (`/green`)**
```
You: /green

Claude: I'll implement the minimal code to pass the test.
[Creates the email validation function with basic implementation]
[Runs test - shows it passing]
```

**3. Refactor for quality (`/refactor`)**
```
You: /refactor extract regex pattern to a constant

Claude: I'll refactor while keeping tests green.
[Extracts magic values, improves code structure]
[Runs tests - confirms they still pass]
```

### Complete Workflow Example

**Starting from a GitHub issue:**
```
/issue 123
```
Claude analyzes the GitHub issue and creates a TDD implementation plan showing what tests to write.

**Running a full TDD cycle:**
```
/cycle implement user authentication with password hashing
```
Claude executes the complete red-green-refactor cycle: writes a failing test, implements it, then refactors.

**Individual phases for more control:**
```
/red test that users can't login with wrong password
/green
/refactor move password verification to separate function
```

**Committing and creating PRs:**
```
/commit
```
Claude reviews changes, drafts a commit message following project standards, and creates the commit.

```
/pr
```
Claude analyzes commits, creates a PR with summary and test plan.

### What to Expect

- **`/red`** - Claude writes ONE failing test based on your description
- **`/green`** - Claude writes minimal implementation to pass the current failing test
- **`/refactor`** - Claude improves code structure without changing behavior
- **`/cycle`** - Claude runs all three phases in sequence for a complete feature

The commands enforce TDD discipline: you can't refactor with failing tests, can't write multiple tests at once, and implementation must match test requirements.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development workflow, build system, and fragment management.

## Credits

TDD workflow instructions adapted from [TDD Guard](https://github.com/nizos/tdd-guard) by Nizar.
