---
description: Show code to team with auto-merge - for changes that should be visible but don't need approval
argument-hint: [optional-pr-title-and-description]
_hint: Auto-merge PR
_category: Ship / Show / Ask
_order: 2
_selectedByDefault: false
---

# Show - Visible Merge with Optional Feedback

<!-- docs INCLUDE path='src/fragments/universal-guidelines.md' -->
<!-- /docs -->

<!-- docs INCLUDE path='src/fragments/beads-awareness.md' featureFlag='beads' -->
<!-- /docs -->

**Ship/Show/Ask Pattern - SHOW**

Show is for changes that teammates should see, but don't require approval. Examples:

- Refactoring with test coverage
- New features with comprehensive tests
- Performance improvements
- Non-breaking API changes

## Prerequisites

Before using show:

1. All tests must pass
2. Changes should have good test coverage
3. Changes should be non-breaking or backward compatible
4. CI must be green

## Workflow

Current branch status:
!`git status`

Recent commits:
!`git log --oneline -5`

Arguments: $ARGUMENTS

**Process:**

1. **Verify Quality**: Check that changes meet show criteria
   - Run tests: !`npm test` or !`yarn test` or appropriate test command
   - Check coverage is maintained or improved
   - Verify no breaking changes

2. **Create Show PR**: Create a PR that will auto-merge after a short window
   - Title: conventional commits format, prefixed with `[SHOW]`
   - Description: Clear explanation of what changed and why
   - Add label: "show" or "auto-merge"
   - Set auto-merge if GitHub setting allows

3. **Configure Auto-Merge**:
   - If GitHub Actions is configured, set to auto-merge after CI passes
   - If not, provide instructions to merge after 1-2 hours of visibility
   - Add notice that feedback is welcome but not required

4. **PR Description Template**:

   ```markdown
   ## 🚀 Show - Auto-merging after CI

   **This is a SHOW PR**: Changes are ready to merge but shared for visibility.
   Feedback welcome but not required. Will auto-merge when CI passes.

   <!--
     References: [link to relevant issues]
   -->

   ### What changed

   [Brief description]

   ### Why

   [Rationale for change]

   ### Test coverage

   - [ ] All tests pass
   - [ ] Coverage maintained/improved
   - [ ] No breaking changes
   ```

5. **Monitoring**: Check PR status and auto-merge when ready

## Decision Guide

Use **Show** when:

- ✅ Tests are comprehensive
- ✅ Changes are non-breaking
- ✅ You're confident in the approach
- ✅ Team should be aware of the change

Use **/ship** instead if: change is tiny and obvious (typo, formatting)

Use **/ask** instead if: change needs discussion, breaks APIs, or you're uncertain

<!-- docs INCLUDE path='src/fragments/beads-integration.md' featureFlag='beads' -->
<!-- /docs -->
