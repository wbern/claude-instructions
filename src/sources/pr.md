---
allowed-tools: mcp__github__*, Bash(git:*)
description: Creates a pull request using GitHub MCP
argument-hint: [optional-pr-title-and-description]
---

# Create Pull Request

<!-- docs INCLUDE path='src/fragments/universal-guidelines.md' -->
<!-- /docs -->

Current branch status:
!`git status`

Recent commits:
!`git log --oneline -5`

Create a pull request for the current branch. Use @CLAUDE.md for general guidelines on project.

Arguments: $ARGUMENTS

If nothing else specified:
PR Title: conventional commits format, like `feat(owner/repo#123): add user authentication to API endpoints` or `feat(#123)` for local repo issues
Description: Very simple description of the changes, prefixed with that the content is AI generated and approved by the PR author. Description should lead with the following

```
<!--
  Are there any relevant issues / PRs / mailing lists discussions?
  Please reference them here.
-->
References
[links to github issues that were referenced in the scope of the commit messages]
-
```


Use the GitHub MCP tools to:
1. Check current branch and ensure it's pushed
2. Create a well-formatted pull request with proper title and description
3. Set the base branch (default: main)
4. Include relevant issue references if found in commit messages

<!-- docs INCLUDE path='src/fragments/beads-integration.md' featureFlag='beads' -->
<!-- /docs -->