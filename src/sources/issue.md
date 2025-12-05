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

Process:

1. Get Issue Number

- Either from branch name use that issue number
  - Patterns: issue-123, 123-feature, feature/123, fix/123
- Or from this bullet point with custom info: $ARGUMENTS
- If not found: ask user

2. Fetch Issue

<!-- docs INCLUDE path='src/fragments/github-issue-fetch.md' -->
<!-- /docs -->

3. Analyze and Plan

Summarize the issue and requirements, then:

<!-- docs INCLUDE path='src/fragments/discovery-phase.md' -->
<!-- /docs -->

<!-- docs INCLUDE path='src/fragments/beads-integration.md' featureFlag='beads' -->
<!-- /docs -->

<!-- docs INCLUDE path='src/fragments/tdd-fundamentals.md' -->
<!-- /docs -->
