---
description: Communicate AI-generated content with transparent attribution
argument-hint: <task-description>
---

# AI-Attributed Communication Command

Execute the user's requested task (e.g., posting PR comments, GitHub issue comments, or other communications through various MCPs), but frame the output with clear AI attribution.

## General Guidelines

### Output Style

- **Never explicitly mention TDD** in code, comments, commits, PRs, or issues
- Write natural, descriptive code without meta-commentary about the development process
- The code should speak for itself - TDD is the process, not the product

Beads is available for task tracking. Use `mcp__beads__*` tools to manage issues (the user interacts via `bd` commands).

## Instructions

Arguments: $ARGUMENTS

**IMPORTANT Communication Format:**

1. **Opening**: Begin with "*Beep boop, I am Claude Code 🤖, my user has reviewed and approved the following written by me:*"
   - Use italics for this line
   - Clearly establishes AI authorship

2. **Middle**: Perform the requested task (post comment, create review, etc.)
   - Execute whatever communication task the user requested
   - Write the actual content that accomplishes the user's goal

3. **Closing**: End with "*Beep boop, Claude Code 🤖 out!*"
   - Use italics for this line
   - Provides clear closure

## Purpose

This command ensures transparency about AI usage while maintaining that the user has reviewed and approved the content. It prevents offloading review responsibility to other users while being open about AI assistance.

## Examples

- Posting a GitHub PR review comment
- Adding a comment to a GitHub issue
- Responding to feedback with AI-generated explanations
- Any communication where AI attribution is valuable
