---
description: Create implementation plan from feature/requirement with PRD-style discovery and TDD acceptance criteria
argument-hint: <feature/requirement description or GitHub issue URL/number>
_hint: Plan feature
_category: Planning
_order: 2
---

# Plan: PRD-Informed Task Planning for TDD

Create structured implementation plan that bridges product thinking (PRD) with test-driven development.

<!-- docs INCLUDE path='src/fragments/universal-guidelines.md' -->
<!-- /docs -->

<!-- docs INCLUDE path='src/fragments/beads-awareness.md' featureFlag='beads' -->
<!-- /docs -->

## Input

$ARGUMENTS

(If no input provided, check conversation context<!-- docs INCLUDE path='src/fragments/plan-beads-context-hint.md' featureFlag='beads' -->
<!-- /docs -->)

## Input Processing

The input can be one of:
1. **GitHub Issue URL** (e.g., `https://github.com/owner/repo/issues/123`)
2. **GitHub Issue Number** (e.g., `#123` or `123`)
3. **Feature Description** (e.g., "Add user authentication")
4. **Empty** - use conversation context

### GitHub Issue Integration

If input looks like a GitHub issue:

**Step 1: Extract Issue Number**
- From URL: extract owner/repo/number
- From number: try to infer repo from git remote
- From branch name: check patterns like `issue-123`, `123-feature`, `feature/123`

**Step 2: Fetch Issue**
Try GitHub MCP first:
- If available: use `mcp__github__issue_read` to fetch issue details
- If not available: show message and try `gh issue view <number>`

```
GitHub MCP not configured!
See: https://github.com/modelcontextprotocol/servers/tree/main/src/github
Trying GitHub CLI fallback...
```

**Step 3: Use Issue as Discovery Input**
- Title → Feature name
- Description → Problem statement and context
- Labels → Type/priority hints
- Comments → Additional requirements and discussion
- Linked issues → Dependencies

Extract from GitHub issue:
- Problem statement and context
- Acceptance criteria (if present)
- Technical notes (if present)
- Related issues/dependencies

## Process

<!-- docs INCLUDE path='src/fragments/discovery-phase.md' -->
<!-- /docs -->

<!-- docs INCLUDE path='src/fragments/plan-beads-details.md' featureFlag='beads' -->
<!-- /docs -->

## Key Principles

**From PRD World:**
- Start with user problems, not solutions
- Define success criteria upfront
- Understand constraints and scope

**From TDD World:**
- Make acceptance criteria test-ready
- Break work into small, testable pieces
- Each task should map to test(s)

<!-- docs INCLUDE path='src/fragments/beads-integration.md' featureFlag='beads' -->
<!-- /docs -->

## Integration with Other Commands

- **Before /plan**: Use `/spike` if you need technical exploration first
- **After /plan**: Use `/red` to start TDD on first task
<!-- docs INCLUDE path='src/fragments/plan-beads-integration.md' featureFlag='beads' -->
<!-- /docs -->
