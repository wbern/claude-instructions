---
description: Run autonomously until stopped or stuck
argument-hint: [optional: initial task or focus area]
---

## General Guidelines

### Output Style

- **Never explicitly mention TDD** in code, comments, commits, PRs, or issues
- Write natural, descriptive code without meta-commentary about the development process
- The code should speak for itself - TDD is the process, not the product

Beads is available for task tracking. Use `mcp__beads__*` tools to manage issues (the user interacts via `bd` commands).

**User arguments:**

Forever: $ARGUMENTS

**End of user arguments**

Run autonomously, finding and completing work until interrupted or truly stuck.

## Operating Loop

Execute this cycle continuously:

### 1. Find Work

Check in order until something is found:

1. **Arguments above** - If provided, start there
2. **Conversation context** - Any unfinished discussion
3. **Gaps** - Incomplete implementations or missing tests
4. **Git status** - Uncommitted changes to address
5. **Think** - If nothing else, consider: What would improve this codebase?

### 2. Execute Work

- Make atomic, committable progress
- Leave clear trail via commits

### 3. Continue or Pivot

After completing a unit of work:

- If more related work exists - continue
- If blocked - note blocker, find different work
- If genuinely nothing to do - report status and wait

**Do not stop unless:**

- User interrupts (Escape)
- Genuinely no work can be identified
- A decision requires human judgment (ambiguous requirements, architectural choices)

## Anti-Stuck Tactics

When progress stalls:

| Situation | Action |
|-----------|--------|
| Test failures | Make the failing tests pass |
| Unclear requirements | Make reasonable assumption, document it, proceed |
| Build errors | Fix incrementally, commit fixes |
| Context confusion | Re-read recent commits and task tracker to reorient |
| Repeated failures | Try different approach, or move to different task |

## Work Discovery Heuristics

When thinking about what to do:

- Tests that could be added (coverage gaps)
- Code that could be simplified
- Documentation that's missing or stale
- TODOs or FIXMEs in code
- Dependencies that could be updated
- Performance improvements
- Refactoring opportunities

## Session Continuity

Every few completed tasks:

- Update task tracker with progress notes
- Commit work in progress
- Brief self-summary of what's been done

This ensures work survives context limits.

## Communication Style

- Work silently - don't narrate every step
- Report meaningful completions (commits, closed issues)
- Surface decisions that need human input
- Keep responses concise to preserve context

## Testing Requirements

| Change | Required |
|--------|----------|
| Content (fragment/source) | Snapshot update |
| Feature flag | Conditional test (enabled + disabled), FLAG_OPTIONS, CLI mock |
| CLI option | `cli.test.ts` mock |
| Generation logic | Unit test |

Existing tests cover: fragment references, $ARGUMENTS, no nested fragments. Snapshots cover content. TypeScript covers structure. Don't duplicate.
