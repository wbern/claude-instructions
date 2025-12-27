---
description: Reduce code complexity while keeping tests green
argument-hint: [file, function, or area to simplify]
_hint: Reduce complexity
_category: Test-Driven Development
_order: 16
---

<!-- docs INCLUDE path='src/fragments/universal-guidelines.md' -->
<!-- /docs -->

<!-- docs INCLUDE path='src/fragments/beads-awareness.md' featureFlag='beads' -->
<!-- /docs -->

# Simplify: $ARGUMENTS

<!-- docs INCLUDE path='src/fragments/fallback-arguments.md' -->
<!-- /docs -->

Reduce complexity while keeping tests green.

## Core Principles

**YAGNI** - Don't build until actually needed. Delete "just in case" code.

**KISS** - Simplest solution that works. Clever is the enemy of clear.

**Rule of Three** - Don't abstract until 3rd occurrence. "Prefer duplication over wrong abstraction" (Sandi Metz).

## When NOT to Simplify

- Essential domain complexity (regulations, business rules)
- Performance-critical optimized code
- Concurrency/thread-safety requirements
- Security-sensitive explicit checks

## Prerequisites

Tests must be green. If failing, use `/green` first.

<!-- docs INCLUDE path='src/fragments/complexity-signals.md' -->
<!-- /docs -->

## Techniques

| Pattern | Before | After |
|---------|--------|-------|
| Guard clause | Nested `if/else` | Early `return` |
| Named condition | Complex boolean | `const isValid = ...` |
| Extract constant | `if (x > 3)` | `if (x > MAX_RETRIES)` |
| Flatten callback | `.then().then()` | `async/await` |

**Also apply:** Consolidate duplicates, inline unnecessary abstractions, delete dead code.

## Validate

1. Tests still green
2. Code reads more clearly
3. No behavioral changes

**Simplify** removes complexity locally. **Refactor** improves architecture broadly. Use `/refactor` if changes require structural reorganization.

<!-- docs INCLUDE path='src/fragments/peeping-tom-warning.md' -->
<!-- /docs -->
