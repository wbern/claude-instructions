---
description: Research a problem in parallel via web docs, web search, codebase exploration, and deep ultrathink
argument-hint: <research topic or question>
_hint: Deep research
_category: Utilities
_order: 20
---

<!-- docs INCLUDE path='src/fragments/universal-guidelines.md' -->
<!-- /docs -->

<!-- docs INCLUDE path='src/fragments/beads-awareness.md' featureFlag='beads' -->
<!-- /docs -->

# Research: $ARGUMENTS

Research the following problem or question thoroughly, like a senior developer would.

## Step 1: Launch Parallel Research Agents

Use the Task tool to spawn these subagents **in parallel** (all in a single message):

1. **Web Documentation Agent** (subagent_type: general-purpose)
   - Search official documentation for the topic
   - Find best practices and recommended patterns
   - Locate relevant GitHub issues or discussions

2. **Web Search Agent** (subagent_type: general-purpose)
   - Perform broad web searches for solutions and discussions
   - Find Stack Overflow answers, blog posts, and tutorials
   - Note common pitfalls and gotchas

3. **Codebase Explorer Agent** (subagent_type: Explore)
   - Search the codebase for related patterns
   - Find existing solutions to similar problems
   - Identify relevant files, functions, or components

## Step 2: Library Documentation (Optional)

If the research involves specific frameworks or libraries:
- Use Context7 MCP tools (mcp__context7__resolve-library-id, then get-library-docs)
- Get up-to-date API references and code examples
- If Context7 is unavailable, note this in findings so user knows library docs were harder to obtain

## Step 3: Deep Analysis

With all gathered context, perform extended reasoning (ultrathink) to:
- Analyze the problem from first principles
- Consider edge cases and trade-offs
- Synthesize insights across all sources
- Identify conflicts between sources

## Step 4: Present Findings

Present a structured summary to the user:

### Problem Statement
Describe the problem and why it matters.

### Key Findings
Summarize the most relevant solutions and approaches.

### Codebase Patterns
Document how the current codebase handles similar cases.

### Recommended Approach
Provide your recommendation based on all research.

### Conflicts
Highlight where sources disagree and provide assessment of which is more reliable.

### Sources
List all source links with brief descriptions. This section is required.

## Research Guidelines

- Prioritize official documentation over blog posts
- Prefer solutions that match existing codebase patterns
- Note major.minor versions for libraries/frameworks (patch versions only if critical)
- Flag conflicting information across sources
- Write concise, actionable content
- Use active voice throughout
