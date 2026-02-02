<detect_provider>
  <check_remote_url>git remote get-url origin</check_remote_url>
  <identify_host>
    - github.com → GitHub (use mcp__github__* tools)
    - gitlab.com → GitLab (use mcp__gitlab__* tools)
    - bitbucket.org → Bitbucket (ask user for tool)
    - Other → Ask user
  </identify_host>
</detect_provider>
<check_available_tools>
  <list_mcp_servers>Check which git-hosting MCP servers are available (github, gitlab, etc.)</list_mcp_servers>
  <if_not_available>Show error: "Required MCP server not configured"</if_not_available>
</check_available_tools>
<select_tool>
  <store_as>$GIT_HOST_TOOL = MCP server for detected host</store_as>
</select_tool>
