---
allowed-tools: Bash(pnpm test:*), Bash(pnpm lint:*)
description: Create a git commit following project standards
argument-hint: [optional-commit-description]
---

Create a git commit following project standards

Include any of the following info if specified: $ARGUMENTS

## General Guidelines

### Output Style
- **Never explicitly mention TDD** in code, comments, commits, PRs, or issues
- Write natural, descriptive code without meta-commentary about the development process
- The code should speak for itself - TDD is the process, not the product

## Commit Message Rules

Follows [Conventional Commits](https://www.conventionalcommits.org/) standard.

1. **Format**: `type(#issue): description`
   - Use `#123` for local repo issues
   - Use `owner/repo#123` for cross-repo issues
   - Common types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

2. **AI Credits**: **NEVER include AI credits in commit messages**
   - No "Generated with Claude Code"
   - No "Co-Authored-By: Claude" or "Co-Authored-By: Happy"
   - Focus on the actual changes made, not conversation history

3. **Content**: Write clear, concise commit messages describing what changed and why

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
