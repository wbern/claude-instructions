---
description: Analyze conversation context for unaddressed items and gaps
---

Analyze the current conversation context and identify things that have not yet been addressed. Look for:

1. **Incomplete implementations** - Code that was started but not finished
2. **Unused variables/results** - Values that were captured but never used
3. **Missing tests** - Functionality without test coverage
      4. **User requests** - Things the user asked for that weren't fully completed
5. **TODO comments** - Any TODOs mentioned in conversation
6. **Error handling gaps** - Missing error cases or edge cases
7. **Documentation gaps** - Undocumented APIs or features

Present findings as a prioritized list with:

- What the gap is
- Why it matters
- Suggested next action

If there are no gaps, confirm that everything discussed has been addressed.

Additional info:
$ARGUMENTS
