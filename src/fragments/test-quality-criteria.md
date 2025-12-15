#### FIRST Principles

| Principle | What to Check |
|-----------|---------------|
| **Fast** | Tests complete quickly, no I/O, no network calls, no sleep()/setTimeout delays |
| **Independent** | No shared mutable state, no execution order dependencies between tests |
| **Repeatable** | No Date.now(), no Math.random() without seeding, no external service dependencies |
| **Self-validating** | Meaningful assertions that verify behavior, no manual verification needed |

#### TDD Anti-patterns

| Anti-pattern | Detection Signals |
|--------------|-------------------|
| **The Liar** | `expect(true).toBe(true)`, empty test bodies, tests with no assertions |
| **Excessive Setup** | >20 lines of arrange code, >5 mocks, deep nested object construction |
| **The One** | >5 assertions testing unrelated behaviors in a single test |
| **The Peeping Tom** | Testing private methods, asserting on internal state, tests that break on any refactor |
| **The Slow Poke** | Real database/network calls, file I/O, hard-coded timeouts |

#### Test Structure (AAA Pattern)

- **Arrange**: Clear setup with minimal fixtures
- **Act**: Single action being tested
- **Assert**: Specific, behavior-focused assertions
