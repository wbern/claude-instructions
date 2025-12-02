---
allowed-tools: Bash(pnpm test:*), Bash(pnpm lint:*)
description: Create a git commit following project standards
argument-hint: [optional-commit-description]
---

Create a git commit following project standards

Include any of the following info if specified: $ARGUMENTS




## Process

1. Run `git status` and `git diff` to review changes
2. Run `git log --oneline -5` to see recent commit style
3. Stage relevant files with `git add`
4. Create commit with descriptive message
5. Verify with `git status`

## Example

```bash
git add <files>
git commit -m "feat(#123): add validation to user input form"
```
