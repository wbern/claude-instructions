### Watch for Brittle Tests

When refactoring implementation, watch for **Peeping Tom** tests that:

- Test private methods or internal state directly
- Assert on implementation details rather than behavior
- Break on any refactoring even when behavior is preserved

If tests fail after a pure refactoring (no behavior change), consider whether the tests are testing implementation rather than behavior.
