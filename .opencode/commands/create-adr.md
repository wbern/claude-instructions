---
description: Create a new Architecture Decision Record (ADR)
argument-hint: <title or topic of the architectural decision>
---

# Create ADR: Architecture Decision Record Creator

Create a new ADR to document an architectural decision. ADRs capture the "why" behind technical choices, helping future developers understand constraints and tradeoffs.

> ADRs were introduced by Michael Nygard in 2011. The core structure (Context, Decision, Consequences) remains the standard.

## General Guidelines

### Output Style

- **Never explicitly mention TDD** in code, comments, commits, PRs, or issues
- Write natural, descriptive code without meta-commentary about the development process
- The code should speak for itself - TDD is the process, not the product

Beads is available for task tracking. Use `mcp__beads__*` tools to manage issues (the user interacts via `bd` commands).

## Plan File Restriction

**NEVER create, read, or update plan.md files.** Claude Code's internal planning files are disabled for this project. Use other methods to track implementation progress (e.g., comments, todo lists, or external tools).

**User arguments:**

Create-adr: $ARGUMENTS

**End of user arguments**

(If no input provided, ask user for the architectural decision topic)

## Process

### Step 1: Detect Existing ADR Setup

Check for existing ADR directory and structure:

```bash
# Check common ADR directories (in order of preference)
for dir in doc/adr docs/adr decisions doc/architecture/decisions; do
  if [ -d "$dir" ]; then
    echo "Found: $dir"
    ls "$dir"/*.md 2>/dev/null
    break
  fi
done
```

**If ADRs exist:** Read the first few ADRs (especially 0001 if present) to understand:

- The template/structure this project uses
- Any project-specific sections or frontmatter
- Naming conventions and style

Adapt the new ADR to match the existing pattern.

**If no ADR directory exists:** Run the initialization flow (Step 1b).

### Step 1b: Initialize ADR Practice (First-Time Setup)

When no existing ADRs are found, help the user set up their ADR practice.

Ask the user (use AskUserQuestion):

**Directory location:**

- doc/adr (Recommended - conventional location)
- docs/adr
- decisions
- doc/architecture/decisions

**Template style:**

- Minimal (Nygard's original: Context, Decision, Consequences)
- Standard (Minimal + Status, Date, References)
- With scope (Standard + applies_to patterns, code examples)

**Create a foundational ADR-0001?**

- Yes - document "We will use ADRs to record architectural decisions"
- No - proceed directly to creating the requested ADR

If creating ADR-0001, generate it with:

- Context: Why the team needs to document decisions
- Decision: Adopt ADRs following [chosen template style]
- Consequences: Better knowledge transfer, slight overhead per decision

### Step 2: Determine ADR Number

Calculate next number from existing ADRs:

1. Extract highest existing number
2. Increment by 1
3. Format as 4-digit zero-padded (e.g., `0001`, `0012`)

### Step 3: Discovery Questions

Gather context through conversation (use AskUserQuestion for structured choices):

**Context & Problem**

- What forces are at play? (technological, social, project constraints)
- What problem, pattern, or situation prompted this decision?
- What triggered the need to decide now? (bug, confusion, inconsistency, new requirement)
- Are there related PRs, issues, or prior discussions to reference?

**The Decision**

- What are we deciding to do (or not do)?
- What alternatives were considered?
- Why was this approach chosen over alternatives?

**Consequences**

- What becomes easier or more consistent with this decision?
- What becomes harder, more constrained, or riskier?
- What tradeoffs are we explicitly accepting?

**Scope**

- Which parts of the codebase does this apply to?
- Are there exceptions or areas where this doesn't apply?

### Step 4: Generate ADR File

Create `{adr_directory}/NNNN-title-slug.md`:

- Convert title to kebab-case slug (lowercase, hyphens, no special chars)
- Use today's date for the `date` field
- Default status to `accepted` (most ADRs are written after the decision is made)

**ADR Template:**

```markdown
---
status: accepted
date: YYYY-MM-DD
applies_to:
  - "**/*.ts"
  - "**/*.tsx"
---

# N. Title

## Context

[Forces at play - technological, social, project constraints.
What problem prompted this? Value-neutral description of the situation.]

## Decision

We will [decision statement in active voice].

[If the decision involves code patterns, include concrete examples:]

**Forbidden pattern:**
\`\`\`typescript
// ❌ BAD - [explanation]
[example of what NOT to do]
\`\`\`

**Required pattern:**
\`\`\`typescript
// ✅ GOOD - [explanation]
[example of what TO do]
\`\`\`

## Consequences

**Positive:**
- [What becomes easier]
- [What becomes more consistent]

**Negative:**
- [What becomes harder]
- [What constraints we accept]

**Neutral:**
- [Other impacts worth noting]

## References

- [Related PRs, issues, or documentation]
```

### Step 5: Refine applies_to Scope

Help user define which files this decision applies to using glob patterns:

- All TypeScript files: **/*.ts
- All React component files: **/*.tsx
- Only files in components directory: src/components/**
- Exclude test files (prefix with !): !**/*.test.ts
- Exclude type definition files: !**/*.d.ts
- Specific package only: packages/api/**

If the decision applies broadly, use **/* (all files).

**Note**: `applies_to` is recommended for the "With scope" template. Linters and AI assistants use these patterns to determine which files to check against this ADR.

### Step 6: Confirm and Write

Show the complete ADR content and ask user to confirm before writing.

After creation, suggest:

- Review the ADR for completeness
- Commit with `/commit`

## Tips for Good ADRs

1. **Focus on the "why"** - The decision itself may be obvious; the reasoning often isn't
2. **Keep it concise** - 1-2 pages maximum; should be readable in 5 minutes
3. **Use active voice** - "We will use X" not "X will be used"
4. **Include concrete examples** - Code examples make abstract decisions tangible
5. **Document tradeoffs honestly** - Every decision has costs; be explicit about them
6. **Link to context** - Reference PRs, issues, or discussions where the decision was made
7. **Be specific about scope** - Use `applies_to` patterns to clarify affected code

## Status Values

| Status | When to Use |
|--------|-------------|
| `proposed` | Under discussion, not yet agreed |
| `accepted` | Agreed upon and should be followed |
| `deprecated` | No longer relevant (context changed) |
| `superseded` | Replaced by another ADR (link to it) |

To supersede an existing ADR:

1. Create new ADR with the updated decision
2. Update old ADR's status to `superseded by ADR-NNNN`

## Integration with Other Commands

- After creating: Commit with `/commit`
- If decision needs discussion: Create issue with `/create-issues`

## Testing Requirements

| Change | Required |
|--------|----------|
| Content (fragment/source) | Snapshot update |
| Feature flag | Conditional test (enabled + disabled), FLAG_OPTIONS, CLI mock |
| CLI option | `cli.test.ts` mock |
| Generation logic | Unit test |

Existing tests cover: fragment references, $ARGUMENTS, no nested fragments. Snapshots cover content. TypeScript covers structure. Don't duplicate.
