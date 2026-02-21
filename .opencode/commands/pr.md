---
description: Creates a pull request using GitHub MCP
argument-hint: [optional-pr-title-and-description]
---

# Create Pull Request

## General Guidelines

### Output Style

- **Never explicitly mention TDD** in code, comments, commits, PRs, or issues
- Write natural, descriptive code without meta-commentary about the development process
- The code should speak for itself - TDD is the process, not the product

Beads is available for task tracking. Use `mcp__beads__*` tools to manage issues (the user interacts via `bd` commands).

## Plan File Restriction

**NEVER create, read, or update plan.md files.** Claude Code's internal planning files are disabled for this project. Use other methods to track implementation progress (e.g., comments, todo lists, or external tools).

Create a pull request for the current branch using GitHub MCP tools.

## Workflow

Current branch status:
!`git status`

Recent commits:
!`git log --oneline -5`

**User arguments:**

PR: $ARGUMENTS

**End of user arguments**

**Process:**

1. **Ensure Branch is Ready**:
   !`git status`
   - Commit all changes
   - Push to remote: `git push origin [branch-name]`

2. **Create PR**: Create a well-formatted pull request

   Title: conventional commits format, like `feat(#123): add user authentication`

   Description template:

   ```markdown
   <!--
     Are there any relevant issues / PRs / mailing lists discussions?
     Please reference them here.
   -->

   ## References

   - [links to github issues referenced in commit messages]

   ## Summary

   [Brief description of changes]

   ## Test Plan

   - [ ] Tests pass
   - [ ] Manual testing completed
   ```

3. **Set Base Branch**: Default to main unless specified otherwise

4. **Link Issues**: Reference related issues found in commit messages

## Use GitHub MCP Tools

1. Check current branch and ensure it's pushed
2. Create a well-formatted pull request with proper title and description
3. Set the base branch (default: main)
4. Include relevant issue references if found in commit messages

### Beads Integration

Use Beads MCP to:

- Track work with `bd ready` to find next task
- Create issues with `bd create "description"`
- Track dependencies with `bd dep add`

See <https://github.com/steveyegge/beads> for more information.

## Testing Requirements

| Change | Required |
|--------|----------|
| Content (fragment/source) | Snapshot update |
| Feature flag | Conditional test (enabled + disabled), FLAG_OPTIONS, CLI mock |
| CLI option | `cli.test.ts` mock |
| Generation logic | Unit test |

Existing tests cover: fragment references, $ARGUMENTS, no nested fragments. Snapshots cover content. TypeScript covers structure. Don't duplicate.
