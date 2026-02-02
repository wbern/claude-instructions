**For GitHub PRs:**

1. Try GitHub MCP first: `mcp__github__pull_request_read` with `method: "get_diff"`
2. Fall back to `gh` CLI: `gh pr diff <number>`
3. If neither works, report error and stop
