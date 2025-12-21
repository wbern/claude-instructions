---
description: Summarize conversation progress and next steps
argument-hint: [optional additional info]
---

## General Guidelines

### Output Style

- **Never explicitly mention TDD** in code, comments, commits, PRs, or issues
- Write natural, descriptive code without meta-commentary about the development process
- The code should speak for itself - TDD is the process, not the product

Beads is available for task tracking. Use `mcp__beads__*` tools to manage issues (the user interacts via `bd` commands).

## Plan File Restriction

**NEVER create, read, or update plan.md files.** Claude Code's internal planning files are disabled for this project. Use other methods to track implementation progress (e.g., comments, todo lists, or external tools).

Create a concise summary of the current conversation suitable for transferring context to a new conversation.

Additional info: $ARGUMENTS

## Summary Structure

Provide a summary with these sections:

### What We Did

- Key accomplishments and changes made
- Important decisions or discoveries
- Files created, modified, or analyzed

### What We're Doing Next

- Immediate next steps
- Pending tasks or work in progress
- Goals or objectives to continue

### Blockers & User Input Needed

- Any issues requiring user intervention
- Decisions that need to be made
- Missing information or clarifications needed

## Output Format

Keep the summary concise and actionable - suitable for pasting into a new conversation to quickly restore context without needing the full conversation history.

## Beads Integration

If Beads MCP is available, check for task tracking status and ask if the user wants to:

1. Review current task status
2. Update task states based on conversation progress
3. Include Beads context in the summary

Use AskUserQuestion to confirm Beads integration preferences.

## Testing Requirements

| Change | Required |
|--------|----------|
| Content (fragment/source) | Snapshot update |
| Feature flag | Conditional test (enabled + disabled), FLAG_OPTIONS, CLI mock |
| CLI option | `cli.test.ts` mock |
| Generation logic | Unit test |

Existing tests cover: fragment references, $ARGUMENTS, no nested fragments. Snapshots cover content. TypeScript covers structure. Don't duplicate.
