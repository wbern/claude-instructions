---
description: Ship code directly to main - for small, obvious changes that don't need review
argument-hint: [optional-commit-message]
---

# Ship - Direct Merge to Main

## General Guidelines

### Output Style

- **Never explicitly mention TDD** in code, comments, commits, PRs, or issues
- Write natural, descriptive code without meta-commentary about the development process
- The code should speak for itself - TDD is the process, not the product

**Ship/Show/Ask Pattern - SHIP**

Ship is for small, obvious changes that don't need code review. Examples:

- Typo fixes
- Formatting changes
- Documentation updates
- Obvious bug fixes
- Dependency updates with passing tests

## Prerequisites

Before shipping directly to main:

1. All tests must pass
2. Linter must pass
3. Changes must be small and low-risk
4. CI must be green (if configured)

## Workflow

Current branch status:
!`git status`

Recent commits:
!`git log --oneline -5`

Arguments: $ARGUMENTS

**Process:**

1. **Verify Change Size**: Check git diff to ensure changes are small and focused
   !`git diff --stat main`

2. **Run Tests**: Ensure all tests pass
   !`npm test` or !`yarn test` or appropriate test command for the project

3. **Run Linter**: Ensure code quality checks pass
   !`npm run lint` or !`yarn lint` or appropriate lint command (if available)

4. **Safety Check**: Confirm with user that this is truly a ship-worthy change:
   - Is this a small, obvious change?
   - Do all tests pass?
   - Is CI green?

   If ANY of these are "no", suggest using `/show` or `/ask` instead.

5. **Merge to Main**: If all checks pass and user confirms:

   ```bash
   git checkout main
   git pull origin main
   git merge --ff-only [feature-branch] || git merge [feature-branch]
   git push origin main
   ```

6. **Cleanup**: Delete the feature branch

   ```bash
   git branch -d [feature-branch]
   git push origin --delete [feature-branch]
   ```

7. **Notify**: Show summary of what was shipped

## Safety Rails

If tests fail, linter fails, or changes are large/complex, STOP and suggest:

- Use `/show` for changes that should be seen but don't need approval
- Use `/ask` (traditional PR) for complex changes needing discussion
