---
description: Execute TDD Spike Phase - exploratory coding to understand problem space before TDD
argument-hint: <exploration description>
---

SPIKE PHASE! Apply the below to the info given by user input here:

$ARGUMENTS

## General Guidelines

### Output Style

- **Never explicitly mention TDD** in code, comments, commits, PRs, or issues
- Write natural, descriptive code without meta-commentary about the development process
- The code should speak for itself - TDD is the process, not the product

(If there was no info above, fallback to the context of the conversation)

## TDD Fundamentals

### The TDD Cycle

The foundation of TDD is the Red-Green-Refactor cycle:

1. **Red Phase**: Write ONE failing test that describes desired behavior

   - The test must fail for the RIGHT reason (not syntax/import errors)
   - Only one test at a time - this is critical for TDD discipline
     - Exception: For browser-level tests or expensive setup (e.g., Storybook `*.stories.tsx`), group multiple assertions within a single test block to avoid redundant setup - but only when adding assertions to an existing interaction flow. If new user interactions are required, still create a new test. Split files by category if they exceed ~1000 lines.
   - **Adding a single test to a test file is ALWAYS allowed** - no prior test output needed
   - Starting TDD for a new feature is always valid, even if test output shows unrelated work
   - For DOM-based tests, use `data-testid` attributes to select elements rather than CSS classes, tag names, or text content
   - Avoid hard-coded timeouts both in form of sleep() or timeout: 5000 etc; use proper async patterns (`waitFor`, `findBy*`, event-based sync) instead and rely on global test configs for timeout settings

2. **Green Phase**: Write MINIMAL code to make the test pass

   - Implement only what's needed for the current failing test
   - No anticipatory coding or extra features
   - Address the specific failure message

3. **Refactor Phase**: Improve code structure while keeping tests green
   - Only allowed when relevant tests are passing
   - Requires proof that tests have been run and are green
   - Applies to BOTH implementation and test code
   - No refactoring with failing tests - fix them first

### Core Violations

1. **Multiple Test Addition**

   - Adding more than one new test at once
   - Exception: Initial test file setup or extracting shared test utilities

2. **Over-Implementation**

   - Code that exceeds what's needed to pass the current failing test
   - Adding untested features, methods, or error handling
   - Implementing multiple methods when test only requires one

3. **Premature Implementation**
   - Adding implementation before a test exists and fails properly
   - Adding implementation without running the test first
   - Refactoring when tests haven't been run or are failing

### Critical Principle: Incremental Development

Each step in TDD should address ONE specific issue:

- Test fails "not defined" → Create empty stub/class only
- Test fails "not a function" → Add method stub only
- Test fails with assertion → Implement minimal logic only

### Optional Pre-Phase: Spike Phase

In rare cases where the problem space, interface, or expected behavior is unclear, a **Spike Phase** may be used **before the Red Phase**.
This phase is **not part of the regular TDD workflow** and must only be applied under exceptional circumstances.

- The goal of a Spike is **exploration and learning**, not implementation.
- The code written during a Spike is **disposable** and **must not** be merged or reused directly.
- Once sufficient understanding is achieved, all spike code is discarded, and normal TDD resumes starting from the **Red Phase**.
- A Spike is justified only when it is impossible to define a meaningful failing test due to technical uncertainty or unknown system behavior.

### General Information

- Sometimes the test output shows as no tests have been run when a new test is failing due to a missing import or constructor. In such cases, allow the agent to create simple stubs. Ask them if they forgot to create a stub if they are stuck.
- It is never allowed to introduce new logic without evidence of relevant failing tests. However, stubs and simple implementation to make imports and test infrastructure work is fine.
- In the refactor phase, it is perfectly fine to refactor both test and implementation code. That said, completely new functionality is not allowed. Types, clean up, abstractions, and helpers are allowed as long as they do not introduce new behavior.
- Adding types, interfaces, or a constant in order to replace magic values is perfectly fine during refactoring.
- Provide the agent with helpful directions so that they do not get stuck when blocking them.
