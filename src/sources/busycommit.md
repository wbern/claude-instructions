---
description: Create multiple atomic git commits, one logical change at a time
argument-hint: [optional-commit-description]
_hint: Atomic commits
_category: Workflow
_order: 2
---

<!-- docs INCLUDE path='src/fragments/universal-guidelines.md' -->
<!-- /docs -->

<!-- docs INCLUDE path='src/fragments/beads-awareness.md' featureFlag='beads' -->
<!-- /docs -->

Create multiple atomic git commits, committing the smallest possible logical unit at a time

Include any of the following info if specified: $ARGUMENTS

<!-- docs INCLUDE path='src/fragments/commit-process.md' -->
<!-- /docs -->

## Atomic Commit Approach

Each commit should represent ONE logical change. Do NOT bundle multiple unrelated changes into one commit.

- Identify the smallest atomic units of change
- For EACH atomic unit: stage only those files/hunks, commit, verify
- Use `git add -p` to stage partial file changes when a file contains multiple logical changes
- Repeat until all changes are committed
- It is OK to create multiple commits without stopping - keep going until `git status` shows clean

## Multi-Commit Example

If a single file contains multiple unrelated changes, use `git add -p` to stage hunks interactively:

```bash
# Stage only the validation-related hunks from the file
git add -p src/user-service.ts
# Select 'y' for validation hunks, 'n' for others
git commit -m "feat(#123): add email format validation"

# Stage the error handling hunks
git add -p src/user-service.ts
git commit -m "fix(#124): handle null user gracefully"

# Stage remaining changes
git add src/user-service.ts
git commit -m "refactor: extract user lookup to helper"
```
