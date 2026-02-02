---
description: Analyze GitHub issue and create TDD implementation plan
argument-hint: [optional-issue-number]
_hint: Analyze issue
_category: Planning
_order: 1
---

Analyze GitHub issue and create TDD implementation plan.

<!-- docs INCLUDE path='src/fragments/universal-guidelines.md' -->
<!-- /docs -->

<!-- docs INCLUDE path='src/fragments/beads-awareness.md' featureFlag='beads' -->
<!-- /docs -->

<!-- docs INCLUDE path='src/fragments/no-plan-files.md' featureFlag='no-plan-files' -->
<!-- /docs -->

Process:

1. Get Issue Number

**User arguments:**

Issue: $ARGUMENTS

**End of user arguments**

- Check if argument is an issue number
- Otherwise try branch name patterns: issue-123, 123-feature, feature/123, fix/123
- If not found: ask user

2. Fetch Issue

<!-- docs INCLUDE path='src/fragments/github-issue-fetch-gh-mcp.md' featureFlag='gh-mcp' -->
<!-- /docs -->
<!-- docs INCLUDE path='src/fragments/github-issue-fetch-gh-cli.md' featureFlag='gh-cli' -->
<!-- /docs -->
<!-- docs INCLUDE path='src/fragments/github-issue-fetch.md' unlessFlags='gh-cli,gh-mcp' -->
<!-- /docs -->

3. Analyze and Plan

Summarize the issue and requirements, then:

<!-- docs INCLUDE path='src/fragments/discovery-phase.md' -->
<!-- /docs -->

<!-- docs INCLUDE path='src/fragments/beads-integration.md' featureFlag='beads' -->
<!-- /docs -->

<!-- docs INCLUDE path='src/fragments/tdd-fundamentals.md' -->
<!-- /docs -->
