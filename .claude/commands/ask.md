---
description: Request team review and approval - for complex changes needing discussion
argument-hint: [optional-pr-title-and-description]
---

# Ask - Request Review and Approval

## General Guidelines

### Output Style

- **Never explicitly mention TDD** in code, comments, commits, PRs, or issues
- Write natural, descriptive code without meta-commentary about the development process
- The code should speak for itself - TDD is the process, not the product

Beads is available for task tracking. Use `mcp__beads__*` tools to manage issues (the user interacts via `bd` commands).

**Ship/Show/Ask Pattern - ASK**

Ask is for complex changes that need team discussion and approval. Examples:

- Breaking API changes
- New architecture decisions
- Significant feature additions
- Performance trade-offs
- Security-sensitive changes

## When to Ask

Use **Ask** when:

- Changes affect multiple systems
- Breaking changes are needed
- You need input on approach
- Security implications exist
- Performance trade-offs need discussion
- Uncertain about the best solution

## Workflow

Current branch status:
!`git status`

Recent commits:
!`git log --oneline -5`

Arguments: $ARGUMENTS

**This is the traditional Pull Request workflow**, but with explicit intent that review and approval are required.

**Process:**

1. **Ensure Branch is Ready**:
   !`git status`
   - Commit all changes
   - Push to remote: `git push origin [branch-name]`

2. **Create Ask PR**: Create a PR that clearly needs review

   Title: conventional commits format, prefixed with `[ASK]`

   Description template:

   ```markdown
   ## 🤔 Ask - Review and Approval Needed

   **This is an ASK PR**: These changes need team review and discussion.

   <!--
     References: [link to relevant issues]
   -->

   ### What changed

   [Detailed description of changes]

   ### Why

   [Rationale and context]

   ### Questions for reviewers

   - [ ] Question 1
   - [ ] Question 2

   ### Concerns

   - Potential concern 1
   - Potential concern 2

   ### Test Plan

   - [ ] Unit tests
   - [ ] Integration tests
   - [ ] Manual testing steps

   ### Alternatives considered

   - Alternative 1: [why not chosen]
   - Alternative 2: [why not chosen]
   ```

3. **Request Reviewers**: Assign specific reviewers who should weigh in

4. **Add Labels**:
   - "needs-review"
   - "breaking-change" (if applicable)
   - "security" (if applicable)

5. **Link Issues**: Reference related issues in the description

6. **Monitor Discussion**: Be responsive to reviewer feedback and questions

## Use GitHub MCP Tools

1. Check current branch and ensure it's pushed
2. Create a well-formatted pull request with [ASK] prefix
3. Set reviewers
4. Add appropriate labels
5. Link related issues from commit messages

## Decision Guide

Use **Ask** when:

- ✅ Change is complex or risky
- ✅ Breaking changes involved
- ✅ Need team input on approach
- ✅ Multiple solutions possible
- ✅ Security implications

Use **/show** instead if: confident in approach, just want visibility

Use **/ship** instead if: change is tiny, obvious, and safe

### Beads Integration

Use Beads MCP to:

- Track work with `bd ready` to find next task
- Create issues with `bd create "description"`
- Track dependencies with `bd dep add`

See <https://github.com/steveyegge/beads> for more information.
